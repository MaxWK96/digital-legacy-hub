import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDemoMode } from '@/context/DemoModeContext'

export type EstateStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL'

export interface StatusData {
  lastPing:        number
  threshold:       number
  daysElapsed:     number
  thresholdDays:   number
  status:          EstateStatus
  warningPct:      number
  executed:        boolean
  balance:         string
  contractAddress: string
  timestamp:       number
}

// Mutable demo last-ping — updated when heartbeat is sent in demo mode
let _demoLastPing = Math.floor(Date.now() / 1000) - 3 * 86400

export const resetDemoLastPing = () => {
  _demoLastPing = Math.floor(Date.now() / 1000)
}

const getDemoStatus = (): StatusData => {
  const now         = Math.floor(Date.now() / 1000)
  const secs        = now - _demoLastPing
  const daysElapsed = Math.floor(secs / 86400)
  const warningPct  = Math.min(100, Math.round((daysElapsed / 180) * 100))
  const status: EstateStatus =
    daysElapsed >= 180 ? 'CRITICAL' :
    daysElapsed >= 162 ? 'WARNING'  :
    'ACTIVE'

  return {
    lastPing:        _demoLastPing,
    threshold:       180 * 86400,
    daysElapsed,
    thresholdDays:   180,
    status,
    warningPct,
    executed:        false,
    balance:         '3.2000',
    contractAddress: '0x7bB50FA2ACE5703Bf6a07644108971868Edb0fA3',
    timestamp:       now,
  }
}

export const useEstateStatus = () => {
  const { demoMode } = useDemoMode()

  return useQuery<StatusData>({
    queryKey: ['estate-status', demoMode],
    queryFn: async () => {
      if (demoMode) return getDemoStatus()

      const res = await fetch('/api/status')
      if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`)
      return res.json() as Promise<StatusData>
    },
    refetchInterval: 30_000,
    staleTime:       20_000,
    retry: 2,
  })
}

export const useSendHeartbeat = () => {
  const queryClient = useQueryClient()
  const { demoMode } = useDemoMode()

  return useMutation({
    mutationFn: async () => {
      if (demoMode) {
        resetDemoLastPing()
        await new Promise((r) => setTimeout(r, 800))
        return { success: true, txHash: '0xDEMO_TX_HASH', message: 'Demo heartbeat recorded.' }
      }

      const res = await fetch('/api/heartbeat', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error((err as { error: string }).error ?? 'Heartbeat failed')
      }
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['estate-status'] })
    },
  })
}
