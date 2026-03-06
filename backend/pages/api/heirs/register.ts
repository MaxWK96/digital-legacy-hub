import type { NextApiRequest, NextApiResponse } from 'next'
import { getLifeContract, getSigner } from '../../../lib/contract'
import { ethers } from 'ethers'

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID ?? 'app_staging_test'
const ACTION_ID    = 'digital-executor-heir-verify'

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
    return res.status(400).json({ error: 'heirAddress, nullifierHash, proof, merkle_root, and verification_level are required' })
  }

  if (!ethers.isAddress(heirAddress)) {
    return res.status(400).json({ error: 'Invalid heirAddress' })
  }

  // Verify the World ID ZK proof with Worldcoin's API before touching the contract
  const verifyRes = await fetch(
    `https://developer.worldcoin.org/api/v1/verify/${WORLD_APP_ID}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        nullifier_hash:     nullifierHash,
        merkle_root:        merkle_root,
        proof:              proof,
        verification_level: verification_level,
        action:             ACTION_ID,
        signal:             heirAddress,
      }),
    },
  )

  if (!verifyRes.ok) {
    const body = await verifyRes.json().catch(() => ({})) as { detail?: string }
    console.error('[/api/heirs/register] World ID verification failed:', body)
    return res.status(400).json({ error: `World ID verification failed: ${body.detail ?? verifyRes.statusText}` })
  }

  try {
    const signer   = getSigner()
    const contract = getLifeContract(signer)

    // Check address is an heir
    const isHeir: boolean = await contract.isHeir(heirAddress)
    if (!isHeir) {
      return res.status(400).json({ error: `${heirAddress} is not a registered heir` })
    }

    // Register with nullifier hash
    const tx      = await contract.registerHeir(heirAddress, BigInt(nullifierHash))
    const receipt = await tx.wait()
    const txHash  = receipt?.hash ?? tx.hash

    console.log(`[/api/heirs/register] Heir ${heirAddress} verified. TxHash: ${txHash}`)

    return res.status(200).json({ success: true, txHash })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/heirs/register]', message)
    return res.status(500).json({ error: message })
  }
}
