/**
 * Digital Executor — CRE Inactivity Monitor
 * Chainlink Convergence Hackathon 2026
 *
 * Pipeline:
 * 1. Read lastPing + threshold from LifeContract via CRE EVMClient.callContract()
 * 2. Get current block timestamp via EVMClient.headerByNumber()
 * 3. Calculate days since last heartbeat
 * 4. Evaluate: ACTIVE / WARNING (>90% threshold) / CRITICAL (past threshold)
 * 5. Write status verdict to VerdictRegistry on Sepolia
 *
 * Simulate:
 *   cre workflow simulate ./cre-workflow --non-interactive --trigger-index 0 -T staging-settings
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
  HTTPClient,
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
// Trigger Handler
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
  if (!payload.scheduledExecutionTime) {
    throw new Error('Scheduled execution time is required')
  }
  runtime.log(`Cron triggered at: ${new Date().toISOString()}`)
  return runInactivityMonitor(runtime)
}

// ============================================================================
// Workflow Init
// ============================================================================

const initWorkflow = (config: Config) => {
  const cronTrigger = new CronCapability()

  return [
    handler(
      cronTrigger.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
