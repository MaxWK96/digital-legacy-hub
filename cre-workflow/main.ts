/**
 * Digital Executor — CRE Inactivity Monitor + World ID Verifier
 * Chainlink Convergence Hackathon 2026
 *
 * Trigger 0 — Inactivity Monitor (cron):
 *   1. Read lastPing + threshold from LifeContract via EVMClient.callContract()
 *   2. Get current block timestamp via EVMClient.headerByNumber()
 *   3. Evaluate: ACTIVE / WARNING / CRITICAL
 *   4. Fetch ETH/USD price via HTTPClient (CoinGecko)
 *   5. Write verdict to VerdictRegistry
 *
 * Trigger 1 — World ID Verifier (HTTP):
 *   1. Receive proof payload via Chainlink DON gateway
 *   2. Call Worldcoin verification API via HTTPClient (multi-node consensus)
 *   3. On success: write WORLDID_VERIFIED verdict to VerdictRegistry
 *
 * Simulate trigger 0: cre workflow simulate ./cre-workflow --non-interactive --trigger-index 0 -T staging-settings
 * Simulate trigger 1: cre workflow simulate ./cre-workflow --non-interactive --trigger-index 1 -T staging-settings
 */

import {
  bytesToHex,
  consensusMedianAggregation,
  type CronPayload,
  handler,
  CronCapability,
  EVMClient,
  encodeCallMsg,
  getNetwork,
  hexToBase64,
  HTTPCapability,
  HTTPClient,
  type HTTPPayload,
  type HTTPSendRequester,
  json,
  LATEST_BLOCK_NUMBER,
  ok,
  Runner,
  type Runtime,
  TxStatus,
} from '@chainlink/cre-sdk'
import {
  type Address,
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  encodePacked,
} from 'viem'
import { z } from 'zod'

// ============================================================================
// ABIs
// ============================================================================

const LifeContractABI = [
  {
    name: 'lastPing',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'threshold',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

const VerdictRegistryABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'verdictHash', type: 'bytes32' },
      { internalType: 'string',  name: 'verdict',     type: 'string'  },
    ],
    name: 'storeVerdict',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// ============================================================================
// Config Schema
// ============================================================================

const configSchema = z.object({
  schedule:            z.string(),
  lifeContractAddress: z.string(),
  registryAddress:     z.string(),
  estateEthAmount:     z.string().default('0'),
  // World ID verifier settings
  worldAppId:          z.string().default('app_staging_test'),
  worldActionId:       z.string().default('digital-executor-heir-verify'),
  // Ethereum public key authorised to call the DON gateway (set at deployment)
  worldPublicKey:      z.string().default(''),
  evms: z.array(
    z.object({
      chainSelectorName: z.string(),
      gasLimit:          z.string(),
    }),
  ),
})

type Config = z.infer<typeof configSchema>

// ============================================================================
// Types
// ============================================================================

type InactivityStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL'

interface ContractReads {
  lastPing:  number   // unix timestamp
  threshold: number   // seconds
}

interface InactivityResult {
  lastPing:      number
  threshold:     number
  daysElapsed:   number
  thresholdDays: number
  status:        InactivityStatus
  warningPct:    number           // % of threshold elapsed
}

// Proof payload sent by the backend through the DON gateway
interface ProofInput {
  heirAddress:        string
  nullifierHash:      string
  proof:              string
  merkle_root:        string
  verification_level: string
}

// ============================================================================
// Step 1a: Read lastPing from LifeContract
// ============================================================================

const readLastPing = (
  runtime:  Runtime<Config>,
  evmClient: InstanceType<typeof EVMClient>,
): number => {
  const callData = encodeFunctionData({
    abi:          LifeContractABI,
    functionName: 'lastPing',
  })

  const reply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: '0x0000000000000000000000000000000000000000' as Address,
        to:   runtime.config.lifeContractAddress as Address,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  // viem returns the value directly (not as tuple) for single-output functions
  const value = decodeFunctionResult({
    abi:          LifeContractABI,
    functionName: 'lastPing',
    data:         bytesToHex(reply.data),
  }) as bigint

  return Number(value)
}

// ============================================================================
// Step 1b: Read threshold from LifeContract
// ============================================================================

const readThreshold = (
  runtime:   Runtime<Config>,
  evmClient: InstanceType<typeof EVMClient>,
): number => {
  const callData = encodeFunctionData({
    abi:          LifeContractABI,
    functionName: 'threshold',
  })

  const reply = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: '0x0000000000000000000000000000000000000000' as Address,
        to:   runtime.config.lifeContractAddress as Address,
        data: callData,
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  // viem returns the value directly (not as tuple) for single-output functions
  const value = decodeFunctionResult({
    abi:          LifeContractABI,
    functionName: 'threshold',
    data:         bytesToHex(reply.data),
  }) as bigint

  return Number(value)
}

// ============================================================================
// Step 2: Get current block timestamp
// ============================================================================

const readBlockTimestamp = (
  runtime:   Runtime<Config>,
  evmClient: InstanceType<typeof EVMClient>,
): number => {
  const reply = evmClient
    .headerByNumber(runtime, {
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()

  return Number(reply.header?.timestamp ?? BigInt(Math.floor(Date.now() / 1000)))
}

// ============================================================================
// Step 2: Fetch ETH/USD price from CoinGecko
// ============================================================================

const fetchEthPriceUsd = (sendRequester: HTTPSendRequester): number => {
  const response = sendRequester
    .sendRequest({
      url:    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      method: 'GET',
    })
    .result()

  if (!ok(response)) {
    throw new Error(`CoinGecko price fetch failed: status ${response.statusCode}`)
  }

  const data = json(response) as { ethereum: { usd: number } }
  return data.ethereum.usd
}

// ============================================================================
// Step 3: Evaluate inactivity
// ============================================================================

const evaluateInactivity = (
  lastPing:       number,
  threshold:      number,
  nowTimestamp:   number,
): InactivityResult => {
  const elapsed      = nowTimestamp - lastPing
  const daysElapsed  = elapsed / 86400
  const thresholdDays = threshold / 86400
  const warningPct   = Math.min(100, Math.round((elapsed / threshold) * 100))

  let status: InactivityStatus
  if (elapsed >= threshold) {
    status = 'CRITICAL'
  } else if (elapsed >= threshold * 0.9) {
    status = 'WARNING'
  } else {
    status = 'ACTIVE'
  }

  return { lastPing, threshold, daysElapsed, thresholdDays, status, warningPct }
}

// ============================================================================
// Step 4: Write verdict to VerdictRegistry
// ============================================================================

const writeVerdictOnChain = (
  runtime:        Runtime<Config>,
  result:         InactivityResult,
  estateUsdValue: number,
): string => {
  const evmConfig = runtime.config.evms[0]

  const network = getNetwork({
    chainFamily:       'evm',
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet:         true,
  })

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)
  }

  const evmClient = new EVMClient(network.chainSelector.selector)

  // Verdict string format: "DIGITAL_EXECUTOR|STATUS|daysElapsed|thresholdDays|$USD"
  const verdictStr = `DIGITAL_EXECUTOR|${result.status}|${result.daysElapsed.toFixed(2)}|${result.thresholdDays}|$${estateUsdValue} USD`

  // Hash: keccak256(abi.encodePacked(lifeContract, status, timestamp))
  const timestamp = Math.floor(Date.now() / 1000)
  const verdictHash = keccak256(
    encodePacked(
      ['address', 'string', 'uint256', 'uint256'],
      [
        runtime.config.lifeContractAddress as Address,
        result.status,
        BigInt(Math.round(result.daysElapsed)),
        BigInt(timestamp),
      ],
    ),
  )

  runtime.log(`  VerdictHash: ${verdictHash}`)
  runtime.log(`  Verdict:     "${verdictStr}"`)

  const callData = encodeFunctionData({
    abi:          VerdictRegistryABI,
    functionName: 'storeVerdict',
    args:         [verdictHash, verdictStr],
  })

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(callData),
      encoderName:    'evm',
      signingAlgo:    'ecdsa',
      hashingAlgo:    'keccak256',
    })
    .result()

  const resp = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.registryAddress as Address,
      report:   reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    })
    .result()

  if (resp.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`On-chain write failed: ${resp.errorMessage ?? resp.txStatus}`)
  }

  const txHash = bytesToHex(resp.txHash ?? new Uint8Array(32))
  runtime.log(`  TxHash: ${txHash}`)
  return txHash
}

// ============================================================================
// Main pipeline
// ============================================================================

const runInactivityMonitor = (runtime: Runtime<Config>): string => {
  runtime.log('='.repeat(60))
  runtime.log('  Digital Executor — CRE Inactivity Monitor')
  runtime.log('  Chainlink Convergence Hackathon 2026')
  runtime.log('='.repeat(60))
  runtime.log(`  LifeContract: ${runtime.config.lifeContractAddress}`)
  runtime.log(`  Registry:     ${runtime.config.registryAddress}`)
  runtime.log('')

  // Get network + EVM client
  const evmConfig = runtime.config.evms[0]
  const network   = getNetwork({
    chainFamily:       'evm',
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet:         true,
  })

  if (!network) throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)
  const evmClient = new EVMClient(network.chainSelector.selector)

  // ---- Step 1: Read contract state ----
  runtime.log('[1/4] Reading last heartbeat from LifeContract...')

  const lastPing   = readLastPing(runtime, evmClient)
  const threshold  = readThreshold(runtime, evmClient)

  const lastPingDate = new Date(lastPing * 1000).toISOString()
  runtime.log(`  Last ping:     ${lastPingDate} (unix: ${lastPing})`)
  runtime.log(`  Threshold:     ${Math.round(threshold / 86400)} days`)

  // ---- Get current block timestamp ----
  const nowTimestamp = readBlockTimestamp(runtime, evmClient)
  const nowDate      = new Date(nowTimestamp * 1000).toISOString()
  runtime.log(`  Current time:  ${nowDate} (unix: ${nowTimestamp})`)

  // ---- Step 2: Evaluate ----
  runtime.log('')
  runtime.log('[2/4] Computing inactivity verdict...')

  const result = evaluateInactivity(lastPing, threshold, nowTimestamp)

  const daysStr     = result.daysElapsed.toFixed(2)
  const threshStr   = result.thresholdDays.toFixed(0)
  const statusEmoji = result.status === 'ACTIVE' ? '🟢' : result.status === 'WARNING' ? '🟡' : '🔴'

  runtime.log(`  Last ping:     ${daysStr} days ago`)
  runtime.log(`  Threshold:     ${threshStr} days`)
  runtime.log(`  Elapsed:       ${result.warningPct}% of threshold`)
  runtime.log(`  Status:        ${statusEmoji} ${result.status}`)

  if (result.status === 'CRITICAL') {
    runtime.log('  ⚠️  ESTATE EXECUTION ELIGIBLE — owner inactive beyond threshold')
  } else if (result.status === 'WARNING') {
    runtime.log('  ⚠️  WARNING — approaching inactivity threshold')
  } else {
    runtime.log('  ✓  Owner is active — no action required')
  }

  // ---- Step 3: Fetch ETH/USD price from CoinGecko ----
  runtime.log('')
  runtime.log('[3/4] Fetching ETH/USD price from CoinGecko...')

  const httpClient  = new HTTPClient()
  const ethPriceUsd = httpClient
    .sendRequest(runtime, fetchEthPriceUsd, consensusMedianAggregation<number>())()
    .result()

  const estateEth = parseFloat(runtime.config.estateEthAmount)
  const estateUsd = Math.round(estateEth * ethPriceUsd)

  runtime.log(`  ETH/USD:       $${ethPriceUsd.toFixed(2)}`)
  runtime.log(`  Estate (ETH):  ${estateEth} ETH`)
  runtime.log(`  Estate value:  $${estateUsd} USD`)

  // ---- Step 4: Write on-chain ----
  runtime.log('')
  runtime.log('[4/4] Writing status on-chain to VerdictRegistry...')
  runtime.log(`  Registry: ${runtime.config.registryAddress}`)

  const txHash = writeVerdictOnChain(runtime, result, estateUsd)

  // ---- Summary ----
  runtime.log('')
  runtime.log('='.repeat(60))
  runtime.log('  MONITOR COMPLETE')
  runtime.log(`  LifeContract:  ${runtime.config.lifeContractAddress}`)
  runtime.log(`  Last Ping:     ${daysStr} days ago`)
  runtime.log(`  Threshold:     ${threshStr} days`)
  runtime.log(`  Status:        ${result.status}`)
  runtime.log(`  TxHash:        ${txHash}`)
  runtime.log(`  Etherscan:     https://sepolia.etherscan.io/tx/${txHash}`)
  runtime.log('='.repeat(60))

  return `${result.status}|${daysStr}|${txHash}|$${estateUsd} USD`
}

// ============================================================================
// Trigger 0: Inactivity Monitor handler
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  if (!payload.scheduledExecutionTime) {
    throw new Error('Scheduled execution time is required')
  }
  runtime.log(`Cron triggered at: ${new Date().toISOString()}`)
  return runInactivityMonitor(runtime)
}

// ============================================================================
// Trigger 1: World ID Verifier — HTTP trigger
// ============================================================================

/**
 * Call the Worldcoin cloud verification API for one proof.
 * Runs on every DON node; results are aggregated via median (0=fail, 1=pass).
 * A score of 1 means all nodes agreed the proof is valid.
 */
/**
 * Encode an ASCII string to base64 using only CRE SDK utilities.
 * `btoa` is not available in the Javy WASM runtime, so we go through
 * the ascii-char-code → hex → base64 path instead.
 */
const asciiToBase64 = (str: string): string => {
  const hex = Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
  return hexToBase64(hex)
}

const callWorldcoinVerify = (
  req:      HTTPSendRequester,
  appId:    string,
  actionId: string,
  proof:    ProofInput,
): number => {
  const bodyStr = JSON.stringify({
    nullifier_hash:     proof.nullifierHash,
    merkle_root:        proof.merkle_root,
    proof:              proof.proof,
    verification_level: proof.verification_level,
    action:             actionId,
    signal:             proof.heirAddress,
  })

  const res = req.sendRequest({
    url:     `https://developer.worldcoin.org/api/v1/verify/${appId}`,
    method:  'POST',
    // protobuf bytes fields are base64-encoded in JSON; asciiToBase64 handles
    // the encoding without relying on btoa (not available in Javy WASM runtime)
    body:    asciiToBase64(bodyStr),
    headers: { 'Content-Type': 'application/json' },
  }).result()

  if (!ok(res)) {
    // Log rejection detail if available, then return 0 (failed)
    try {
      const detail = (json(res) as { detail?: string }).detail ?? res.statusCode.toString()
      throw new Error(`Worldcoin rejected proof: ${detail}`)
    } catch {
      return 0
    }
  }
  return 1
}

/**
 * Write a WORLDID_VERIFIED verdict to VerdictRegistry so the backend
 * can detect it and complete the registerHeir() call with the owner key.
 */
const writeWorldIdVerdict = (
  runtime:      Runtime<Config>,
  heirAddress:  string,
  nullifierHash: string,
): string => {
  const evmConfig = runtime.config.evms[0]

  const network = getNetwork({
    chainFamily:       'evm',
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet:         true,
  })
  if (!network) throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)

  const evmClient = new EVMClient(network.chainSelector.selector)

  const verdictStr  = `WORLDID_VERIFIED|${heirAddress}|${nullifierHash}`
  const verdictHash = keccak256(
    encodePacked(
      ['string', 'address', 'string'],
      ['WORLDID', heirAddress as Address, nullifierHash],
    ),
  )

  runtime.log(`  VerdictHash: ${verdictHash}`)
  runtime.log(`  Verdict:     "${verdictStr}"`)

  const callData = encodeFunctionData({
    abi:          VerdictRegistryABI,
    functionName: 'storeVerdict',
    args:         [verdictHash, verdictStr],
  })

  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(callData),
      encoderName:    'evm',
      signingAlgo:    'ecdsa',
      hashingAlgo:    'keccak256',
    })
    .result()

  const resp = evmClient
    .writeReport(runtime, {
      receiver: runtime.config.registryAddress as Address,
      report:   reportResponse,
      gasConfig: { gasLimit: evmConfig.gasLimit },
    })
    .result()

  if (resp.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`VerdictRegistry write failed: ${resp.errorMessage ?? resp.txStatus}`)
  }

  return bytesToHex(resp.txHash ?? new Uint8Array(32))
}

/**
 * Main World ID verification pipeline — runs when the DON gateway receives
 * a signed proof submission from the backend.
 */
const runWorldIdVerification = (runtime: Runtime<Config>, proof: ProofInput): string => {
  const { worldAppId, worldActionId } = runtime.config
  const httpClient = new HTTPClient()

  runtime.log('='.repeat(60))
  runtime.log('  Digital Executor — World ID Verifier (CRE)')
  runtime.log('  Chainlink Convergence Hackathon 2026')
  runtime.log('='.repeat(60))
  runtime.log(`  Heir:   ${proof.heirAddress}`)
  runtime.log(`  App:    ${worldAppId}`)
  runtime.log(`  Action: ${worldActionId}`)
  runtime.log('')

  // ---- Step 1: Verify proof through DON (multi-node consensus) ----
  runtime.log('[1/2] Verifying World ID proof via Worldcoin API (DON consensus)...')

  // Each DON node independently calls the Worldcoin API.
  // consensusMedianAggregation ensures the result is accepted only when
  // a majority of nodes return 1 (verified). A single rogue node cannot
  // flip the outcome.
  const verificationScore = httpClient
    .sendRequest(
      runtime,
      (req: HTTPSendRequester): number => callWorldcoinVerify(req, worldAppId, worldActionId, proof),
      consensusMedianAggregation<number>(),
    )()
    .result()

  if (verificationScore < 1) {
    runtime.log('  ✗ Proof REJECTED by Worldcoin API')
    runtime.log('='.repeat(60))
    return `REJECTED|${proof.heirAddress}`
  }

  runtime.log('  ✓ Proof VERIFIED — writing on-chain attestation...')

  // ---- Step 2: Write WORLDID_VERIFIED verdict to VerdictRegistry ----
  runtime.log('')
  runtime.log('[2/2] Writing World ID verification verdict to VerdictRegistry...')
  runtime.log(`  Registry: ${runtime.config.registryAddress}`)

  const txHash = writeWorldIdVerdict(runtime, proof.heirAddress, proof.nullifierHash)

  runtime.log('')
  runtime.log('='.repeat(60))
  runtime.log('  WORLD ID VERIFICATION COMPLETE')
  runtime.log(`  Heir:    ${proof.heirAddress}`)
  runtime.log(`  TxHash:  ${txHash}`)
  runtime.log(`  Etherscan: https://sepolia.etherscan.io/tx/${txHash}`)
  runtime.log('='.repeat(60))

  return `VERIFIED|${proof.heirAddress}|${txHash}`
}

/**
 * HTTP trigger handler — fired by the Chainlink DON gateway when the backend
 * POSTs a signed proof payload. The payload.input bytes contain JSON-encoded
 * ProofInput sent by the backend.
 */
const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  runtime.log(`World ID HTTP trigger fired at: ${new Date().toISOString()}`)

  // Decode the raw bytes from the gateway request body
  const inputStr = new TextDecoder().decode(payload.input)
  let proof: ProofInput
  try {
    proof = JSON.parse(inputStr) as ProofInput
  } catch {
    throw new Error(`Invalid proof payload — expected JSON, got: ${inputStr.slice(0, 80)}`)
  }

  if (!proof.heirAddress || !proof.nullifierHash || !proof.proof || !proof.merkle_root || !proof.verification_level) {
    throw new Error('Proof payload missing required fields: heirAddress, nullifierHash, proof, merkle_root, verification_level')
  }

  return runWorldIdVerification(runtime, proof)
}

// ============================================================================
// Workflow Init — registers both triggers
// ============================================================================

const initWorkflow = (config: Config) => {
  const inactivityCron = new CronCapability()
  const worldIdHttp    = new HTTPCapability()

  return [
    // trigger-index 0: inactivity monitor (cron)
    handler(
      inactivityCron.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
    // trigger-index 1: World ID verifier (HTTP — DON gateway)
    handler(
      worldIdHttp.trigger({
        // authorizedKeys restricts which signer can call this trigger.
        // Set worldPublicKey in config.json at deployment time to the
        // backend owner's Ethereum public key. Empty = no restriction
        // (acceptable for local simulation; lock down before mainnet).
        authorizedKeys: config.worldPublicKey
          ? [{ type: 'KEY_TYPE_ECDSA_EVM' as const, publicKey: config.worldPublicKey }]
          : [],
      }),
      onHttpTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
