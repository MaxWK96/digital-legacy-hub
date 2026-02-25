import type { NextApiRequest, NextApiResponse } from 'next'
import { getProvider, getLifeContract, computeStatus, type EstateStatus } from '../../lib/contract'
import { ethers } from 'ethers'

export interface StatusResponse {
  lastPing:      number
  threshold:     number
  daysElapsed:   number
  thresholdDays: number
  status:        EstateStatus
  warningPct:    number
  executed:      boolean
  balance:       string   // ETH as string (e.g. "1.5")
  contractAddress: string
  timestamp:     number   // current unix time
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const contract = getLifeContract()
    const provider = getProvider()
    const address  = process.env.LIFE_CONTRACT_ADDRESS!

    const [
      lastPingBn,
      thresholdBn,
      daysElapsedBn,
      thresholdDaysBn,
      inactive,
      executed,
      balanceWei,
    ] = await Promise.all([
      contract.lastPing(),
      contract.threshold(),
      contract.getDaysElapsed(),
      contract.getThresholdDays(),
      contract.isInactive(),
      contract.executed(),
      provider.getBalance(address),
    ])

    const lastPing      = Number(lastPingBn)
    const threshold     = Number(thresholdBn)
    const daysElapsed   = Number(daysElapsedBn)
    const thresholdDays = Number(thresholdDaysBn)
    const status        = computeStatus(daysElapsed, thresholdDays)
    const warningPct    = Math.min(100, Math.round((daysElapsed / thresholdDays) * 100))
    const balance       = ethers.formatEther(balanceWei)

    return res.status(200).json({
      lastPing,
      threshold,
      daysElapsed,
      thresholdDays,
      status,
      warningPct,
      executed: Boolean(executed),
      balance,
      contractAddress: address,
      timestamp:       Math.floor(Date.now() / 1000),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/status]', message)
    return res.status(500).json({ error: message })
  }
}
