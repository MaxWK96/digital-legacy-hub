import { useQuery } from '@tanstack/react-query'
import { useDemoMode } from '@/context/DemoModeContext'

export interface Heir {
  index:         number
  wallet:        string
  allocationBps: number
  allocation:    string
  nullifierHash: string
  isVerified:    boolean
}

export interface HeirsData {
  heirs:         Heir[]
  totalHirs:     number
  totalAllocBps: number
  totalAlloc:    string
}

const DEMO_HEIRS: HeirsData = {
  heirs: [
    { index: 0, wallet: '0xAlice...', allocationBps: 5000, allocation: '50.00%', nullifierHash: '12345', isVerified: true },
    { index: 1, wallet: '0xBob....',  allocationBps: 3000, allocation: '30.00%', nullifierHash: '67890', isVerified: true },
    { index: 2, wallet: '0xCarol...', allocationBps: 2000, allocation: '20.00%', nullifierHash: '0',     isVerified: false },
  ],
  totalHirs:     3,
  totalAllocBps: 10000,
  totalAlloc:    '100.00%',
}

export const useHeirs = () => {
  const { demoMode } = useDemoMode()

  return useQuery<HeirsData>({
    queryKey: ['heirs', demoMode],
    queryFn: async () => {
      if (demoMode) return DEMO_HEIRS
      const res = await fetch('/api/heirs')
      if (!res.ok) throw new Error(`Heirs fetch failed: ${res.status}`)
      return res.json() as Promise<HeirsData>
    },
    staleTime: 60_000,
    retry: 2,
  })
}
