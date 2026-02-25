import type { NextApiRequest, NextApiResponse } from 'next'
import { getLifeContract, getSigner } from '../../lib/contract'

export interface HeartbeatResponse {
  success:   boolean
  txHash:    string
  timestamp: number
  message:   string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HeartbeatResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' })
  }

  try {
    const signer   = getSigner()
    const contract = getLifeContract(signer)

    // Check owner matches signer
    const owner: string = await contract.owner()
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      return res.status(403).json({
        error: `Signer (${signer.address}) is not the contract owner (${owner})`,
      })
    }

    // Check not already executed
    const executed: boolean = await contract.executed()
    if (executed) {
      return res.status(400).json({ error: 'Estate has already been executed' })
    }

    // Send heartbeat transaction
    const tx   = await contract.ping()
    const receipt = await tx.wait()

    const txHash    = receipt?.hash ?? tx.hash
    const timestamp = Math.floor(Date.now() / 1000)

    console.log(`[/api/heartbeat] Heartbeat sent. TxHash: ${txHash}`)

    return res.status(200).json({
      success:   true,
      txHash,
      timestamp,
      message:   'Heartbeat recorded on-chain. Inactivity timer reset.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/heartbeat]', message)
    return res.status(500).json({ error: message })
  }
}
