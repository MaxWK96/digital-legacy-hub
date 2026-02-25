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

// Demo state: simulated 170/180 days elapsed — red warning
const DEMO_STATUS: StatusData = {
  lastPing:        Math.floor(Date.now() / 1000) - 170 * 86400,
  threshold:       180 * 86400,
  daysElapsed:     170,
  thresholdDays:   180,
  status:          'WARNING',
  warningPct:      94,
  executed:        false,
  balance:         '3.2000',
  contractAddress: '0xDEMO000000000000000000000000000000000000',
  timestamp:       Math.floor(Date.now() / 1000),
}

export const useEstateStatus = () => {
  const { demoMode } = useDemoMode()

  return useQuery<StatusData>({
    queryKey: ['estate-status', demoMode],
    queryFn: async () => {
      if (demoMode) return DEMO_STATUS

      const res = await fetch('/api/status')
      if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`)
      return res.json() as Promise<StatusData>
    },
    refetchInterval: 30_000,  // poll every 30s
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
        // Simulate a delay in demo mode
        await new Promise((r) => setTimeout(r, 1500))
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
      // Refresh status after heartbeat
      void queryClient.invalidateQueries({ queryKey: ['estate-status'] })
    },
  })
}
