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
    {
      index:         0,
      wallet:        '0x742d35Cc6634C0532925a3b844C2eA1c3aE3a1c',
      allocationBps: 10000,
      allocation:    '100.00%',
      nullifierHash: '1193877402951378172618326654972897498203',
      isVerified:    true,
    },
  ],
  totalHirs:     1,
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
