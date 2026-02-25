import type { NextApiRequest, NextApiResponse } from 'next'
import { getLifeContract } from '../../lib/contract'

export interface Heir {
  index:         number
  wallet:        string
  allocationBps: number
  allocation:    string   // e.g. "50.00%"
  nullifierHash: string
  isVerified:    boolean
}

export interface HeirsResponse {
  heirs:        Heir[]
  totalHirs:    number
  totalAllocBps: number
  totalAlloc:   string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HeirsResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const contract = getLifeContract()
    const count    = Number(await contract.getHeirsCount())

    const heirs: Heir[] = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const [wallet, allocationBps, nullifierHash, isVerified] = await contract.getHeir(i)
        const bps = Number(allocationBps)
        return {
          index:         i,
          wallet:        wallet as string,
          allocationBps: bps,
          allocation:    `${(bps / 100).toFixed(2)}%`,
          nullifierHash: (nullifierHash as bigint).toString(),
          isVerified:    Boolean(isVerified),
        }
      }),
    )

    const totalAllocBps = heirs.reduce((sum, h) => sum + h.allocationBps, 0)

    return res.status(200).json({
      heirs,
      totalHirs:     heirs.length,
      totalAllocBps,
      totalAlloc:    `${(totalAllocBps / 100).toFixed(2)}%`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/heirs]', message)
    return res.status(500).json({ error: message })
  }
}
