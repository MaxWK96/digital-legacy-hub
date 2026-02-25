import type { NextApiRequest, NextApiResponse } from 'next'
import { getLifeContract, getSigner } from '../../../lib/contract'
import { ethers } from 'ethers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; txHash: string } | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' })
  }

  const { heirAddress, nullifierHash } = req.body as {
    heirAddress:  string
    nullifierHash: string
  }

  if (!heirAddress || !nullifierHash) {
    return res.status(400).json({ error: 'heirAddress and nullifierHash are required' })
  }

  if (!ethers.isAddress(heirAddress)) {
    return res.status(400).json({ error: 'Invalid heirAddress' })
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
