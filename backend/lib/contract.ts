import { ethers } from 'ethers'

// ============================================================================
// LifeContract ABI
// ============================================================================

export const LIFE_CONTRACT_ABI = [
  // Owner heartbeat
  'function ping() external',
  // Heir management
  'function addHeir(address heir, uint256 allocationBps) external',
  'function registerHeir(address heir, uint256 nullifierHash) external',
  // Estate execution
  'function executeEstate() external',
  // View functions
  'function owner() view returns (address)',
  'function lastPing() view returns (uint256)',
  'function threshold() view returns (uint256)',
  'function executed() view returns (bool)',
  'function isHeir(address) view returns (bool)',
  'function getHeirsCount() view returns (uint256)',
  'function getDaysElapsed() view returns (uint256)',
  'function getThresholdDays() view returns (uint256)',
  'function isInactive() view returns (bool)',
  'function getHeir(uint256 index) view returns (address wallet, uint256 allocationBps, uint256 nullifierHash, bool isVerified)',
  'function getStatus() view returns (uint256 lastPing, uint256 threshold, uint256 daysElapsed, uint256 thresholdDays, bool inactive)',
  // Events
  'event HeartbeatReceived(uint256 indexed timestamp, address indexed caller)',
  'event EstateExecuted(uint256 indexed timestamp, uint256 totalValue, uint256 heirCount)',
  'event HeirAdded(address indexed heir, uint256 allocationBps)',
  'event HeirRegistered(address indexed heir, uint256 nullifierHash)',
] as const

// ============================================================================
// Helpers
// ============================================================================

export const getProvider = (): ethers.JsonRpcProvider => {
  const url = process.env.NEXT_PUBLIC_RPC_URL
  if (!url) throw new Error('NEXT_PUBLIC_RPC_URL not set')
  return new ethers.JsonRpcProvider(url)
}

export const getLifeContract = (signerOrProvider?: ethers.Signer | ethers.Provider) => {
  const address = process.env.LIFE_CONTRACT_ADDRESS
  if (!address) throw new Error('LIFE_CONTRACT_ADDRESS not set')
  const provider = signerOrProvider ?? getProvider()
  return new ethers.Contract(address, LIFE_CONTRACT_ABI, provider)
}

export const getSigner = (): ethers.Wallet => {
  const pk = process.env.PRIVATE_KEY
  if (!pk) throw new Error('PRIVATE_KEY not set')
  return new ethers.Wallet(pk, getProvider())
}

// ============================================================================
// Status helpers
// ============================================================================

export type EstateStatus = 'ACTIVE' | 'WARNING' | 'CRITICAL'

export const computeStatus = (daysElapsed: number, thresholdDays: number): EstateStatus => {
  if (daysElapsed >= thresholdDays)          return 'CRITICAL'
  if (daysElapsed >= thresholdDays * 0.9)    return 'WARNING'
  return 'ACTIVE'
}
