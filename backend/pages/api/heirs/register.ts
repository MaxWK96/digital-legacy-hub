/**
 * POST /api/heirs/register
 *
 * World ID proof verification is routed THROUGH the Chainlink CRE workflow
 * (trigger-index 1 in cre-workflow/main.ts). This backend acts as a gateway
 * bridge and completion handler:
 *
 *   1. Validate proof fields
 *   2. Sign the payload with the owner Ethereum key
 *   3. Forward to the Chainlink DON gateway (CRE_GATEWAY_URL)
 *      — the CRE workflow calls Worldcoin API via HTTPClient with DON consensus
 *      — on success, CRE writes WORLDID_VERIFIED|heir|nullifier to VerdictRegistry
 *   4. Poll VerdictRegistry for the verdict (up to POLL_TIMEOUT_MS)
 *   5. When found, call registerHeir() on LifeContract with owner key
 *
 * Local simulation (no live DON gateway):
 *   Run `npm run cre:worldid-simulate` with a JSON proof payload to exercise
 *   trigger-index 1 directly via the CRE CLI.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { ethers }                               from 'ethers'
import { getLifeContract, getProvider, getSigner } from '../../../lib/contract'

const ACTION_ID       = 'digital-executor-heir-verify'
const POLL_TIMEOUT_MS = 60_000   // wait up to 60 s for CRE to write the verdict
const POLL_INTERVAL   = 3_000    // check VerdictRegistry every 3 s

// Minimal ABI — only the function CRE writes to
const VERDICT_REGISTRY_ABI = [
  'event VerdictStored(bytes32 indexed verdictHash, string verdict)',
  'function getVerdict(bytes32 verdictHash) view returns (string)',
]

// --------------------------------------------------------------------------
// Helper: sign the proof payload so the DON gateway can verify the caller
// --------------------------------------------------------------------------
async function signProofPayload(
  wallet:  ethers.Wallet,
  payload: object,
): Promise<string> {
  // EIP-191 personal sign over the JSON-encoded payload
  return wallet.signMessage(JSON.stringify(payload))
}

// --------------------------------------------------------------------------
// Helper: poll VerdictRegistry for a WORLDID_VERIFIED verdict for this heir
// --------------------------------------------------------------------------
async function waitForVerdictRegistry(
  heirAddress:  string,
  nullifierHash: string,
  timeoutMs:    number,
): Promise<boolean> {
  const registryAddress = process.env.VERDICT_REGISTRY_ADDRESS
  if (!registryAddress) return false

  const provider  = getProvider()
  const registry  = new ethers.Contract(registryAddress, VERDICT_REGISTRY_ABI, provider)
  const expected  = `WORLDID_VERIFIED|${heirAddress}|${nullifierHash}`
  const deadline  = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    // Query logs for VerdictStored events in the last ~100 blocks
    const filter = registry.filters['VerdictStored']()
    const logs   = await registry.queryFilter(filter, -100).catch(() => [])

    for (const log of logs) {
      if ('args' in log) {
        const verdict = (log.args as unknown as { verdict: string }).verdict
        if (verdict === expected) return true
      }
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }

  return false
}

// --------------------------------------------------------------------------
// Route handler
// --------------------------------------------------------------------------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; txHash: string } | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' })
  }

  const { heirAddress, nullifierHash, proof, merkle_root, verification_level } = req.body as {
    heirAddress:        string
    nullifierHash:      string
    proof:              string
    merkle_root:        string
    verification_level: string
  }

  if (!heirAddress || !nullifierHash || !proof || !merkle_root || !verification_level) {
    return res.status(400).json({
      error: 'heirAddress, nullifierHash, proof, merkle_root, and verification_level are required',
    })
  }

  if (!ethers.isAddress(heirAddress)) {
    return res.status(400).json({ error: 'Invalid heirAddress' })
  }

  // ---------- Step 1: check heir is registered before doing anything ----------
  try {
    const contract = getLifeContract(getProvider())
    const isHeir: boolean = await contract.isHeir(heirAddress)
    if (!isHeir) {
      return res.status(400).json({ error: `${heirAddress} is not a registered heir` })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Contract read failed'
    return res.status(500).json({ error: message })
  }

  // ---------- Step 2: sign and forward to CRE DON gateway --------------------
  const gatewayUrl = process.env.CRE_GATEWAY_URL

  if (!gatewayUrl) {
    // No live DON gateway configured. In development, run:
    //   npm run cre:worldid-simulate
    // to exercise the CRE World ID trigger manually via the CLI.
    return res.status(503).json({
      error:
        'CRE_GATEWAY_URL is not configured. Deploy the workflow to the Chainlink DON and set ' +
        'CRE_GATEWAY_URL in .env to enable on-chain World ID verification through CRE. ' +
        'For local testing run: npm run cre:worldid-simulate',
    })
  }

  const proofPayload = { heirAddress, nullifierHash, proof, merkle_root, verification_level, action: ACTION_ID }

  try {
    const signer    = getSigner()
    const signature = await signProofPayload(signer, proofPayload)

    // Forward to Chainlink DON gateway — CRE HTTP trigger (trigger-index 1) fires,
    // calls Worldcoin API via HTTPClient with multi-node consensus, then writes
    // WORLDID_VERIFIED|heir|nullifier to VerdictRegistry.
    const gatewayRes = await fetch(gatewayUrl, {
      method:  'POST',
      headers: {
        'Content-Type':        'application/json',
        'X-Chainlink-Sig':     signature,   // EIP-191 signature for gateway auth
      },
      body: JSON.stringify(proofPayload),
    })

    if (!gatewayRes.ok) {
      const body = await gatewayRes.json().catch(() => ({})) as { message?: string }
      console.error('[/api/heirs/register] CRE gateway rejected request:', body)
      return res.status(400).json({
        error: `CRE gateway rejected: ${body.message ?? gatewayRes.statusText}`,
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/heirs/register] Gateway call failed:', message)
    return res.status(502).json({ error: `Failed to reach CRE gateway: ${message}` })
  }

  // ---------- Step 3: wait for CRE to write verdict to VerdictRegistry -------
  console.log(`[/api/heirs/register] Waiting for CRE verdict for ${heirAddress}...`)
  const verified = await waitForVerdictRegistry(heirAddress, nullifierHash, POLL_TIMEOUT_MS)

  if (!verified) {
    return res.status(504).json({
      error: 'Timed out waiting for CRE World ID verdict. The DON may still be processing — retry in 60 s.',
    })
  }

  // ---------- Step 4: CRE confirmed — call registerHeir() with owner key -----
  // Owner is an authorised caller in LifeContract.registerHeir() — no contract
  // changes required. The World ID ZK proof was verified by the DON (multi-node
  // consensus), so this call is backed by on-chain attestation.
  try {
    const signer   = getSigner()
    const contract = getLifeContract(signer)

    const tx      = await contract.registerHeir(heirAddress, BigInt(nullifierHash))
    const receipt = await tx.wait()
    const txHash  = receipt?.hash ?? tx.hash

    console.log(`[/api/heirs/register] Heir ${heirAddress} registered via CRE. TxHash: ${txHash}`)
    return res.status(200).json({ success: true, txHash })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/heirs/register] registerHeir failed:', message)
    return res.status(500).json({ error: message })
  }
}
