import type { NextApiRequest, NextApiResponse } from 'next'
import { getLifeContract, getProvider } from '../../lib/contract'
import { ethers } from 'ethers'

export interface EstateResponse {
  contractAddress: string
  balanceWei:      string
  balanceEth:      string
  owner:           string
  executed:        boolean
  heirs: Array<{
    wallet:        string
    allocationBps: number
    allocation:    string
    estimatedEth:  string
    isVerified:    boolean
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EstateResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const address  = process.env.LIFE_CONTRACT_ADDRESS!
    const contract = getLifeContract()
    const provider = getProvider()

    const [ownerAddr, executed, balanceWei, count] = await Promise.all([
      contract.owner(),
      contract.executed(),
      provider.getBalance(address),
      contract.getHeirsCount(),
    ])

    const heirCount = Number(count)
    const heirs = await Promise.all(
      Array.from({ length: heirCount }, async (_, i) => {
        const [wallet, allocationBps, , isVerified] = await contract.getHeir(i)
        const bps = Number(allocationBps)
        const estimatedWei = (BigInt(balanceWei.toString()) * BigInt(bps)) / 10000n
        return {
          wallet:        wallet as string,
          allocationBps: bps,
          allocation:    `${(bps / 100).toFixed(2)}%`,
          estimatedEth:  ethers.formatEther(estimatedWei),
          isVerified:    Boolean(isVerified),
        }
      }),
    )

    return res.status(200).json({
      contractAddress: address,
      balanceWei:      balanceWei.toString(),
      balanceEth:      ethers.formatEther(balanceWei),
      owner:           ownerAddr as string,
      executed:        Boolean(executed),
      heirs,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/estate]', message)
    return res.status(500).json({ error: message })
  }
}
