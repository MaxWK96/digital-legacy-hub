/**
 * Digital Executor — Demo Script
 *
 * 1. Deploys a fresh LifeContract with 3-day threshold
 * 2. Adds a demo heir
 * 3. Reads initial state
 * 4. Shows full status in terminal
 * 5. Instructions for running CRE simulation
 *
 * Run: npm run demo
 * Requires: PRIVATE_KEY and NEXT_PUBLIC_RPC_URL in .env
 */

import { ethers } from 'ethers'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env') })

// ============================================================================
// LifeContract ABI (minimal, for demo)
// ============================================================================
const LIFE_CONTRACT_ABI = [
  'constructor(uint256 thresholdDays)',
  'function ping() external',
  'function addHeir(address heir, uint256 allocationBps) external',
  'function owner() view returns (address)',
  'function lastPing() view returns (uint256)',
  'function threshold() view returns (uint256)',
  'function getDaysElapsed() view returns (uint256)',
  'function getThresholdDays() view returns (uint256)',
  'function getHeirsCount() view returns (uint256)',
  'function getHeir(uint256 index) view returns (address, uint256, uint256, bool)',
  'function isInactive() view returns (bool)',
  'event HeirAdded(address indexed heir, uint256 allocationBps)',
  'event HeartbeatReceived(uint256 indexed timestamp, address indexed caller)',
]

// Bytecode — generate this by running: cd contracts && npm run compile
// For demo purposes, we check if there's a compiled artifact first
async function getContractBytecode(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const artifact = require('../contracts/artifacts/contracts/LifeContract.sol/LifeContract.json') as {
      bytecode: string
    }
    return artifact.bytecode
  } catch {
    console.error('\n❌  Contracts not compiled. Run: npm run contracts:compile')
    console.error('    Then re-run: npm run demo\n')
    process.exit(1)
  }
}

const sep = (char = '=', len = 60) => char.repeat(len)

async function main() {
  console.log(sep())
  console.log('  Digital Executor — Demo')
  console.log('  Chainlink Convergence Hackathon 2026')
  console.log(sep())
  console.log()

  // ---- Validate env ----
  const pk  = process.env.PRIVATE_KEY
  const rpc = process.env.NEXT_PUBLIC_RPC_URL

  if (!pk)  { console.error('❌  PRIVATE_KEY not set in .env'); process.exit(1) }
  if (!rpc) { console.error('❌  NEXT_PUBLIC_RPC_URL not set in .env'); process.exit(1) }

  // ---- Provider + Signer ----
  const provider = new ethers.JsonRpcProvider(rpc)
  const signer   = new ethers.Wallet(pk, provider)

  const network = await provider.getNetwork()
  const balance = await provider.getBalance(signer.address)

  console.log(`  Network:  ${network.name} (chainId ${network.chainId})`)
  console.log(`  Deployer: ${signer.address}`)
  console.log(`  Balance:  ${ethers.formatEther(balance)} ETH`)
  console.log()

  if (balance < ethers.parseEther('0.01')) {
    console.warn('  ⚠  Low balance — deployment may fail. Get Sepolia ETH from https://sepoliafaucet.com')
  }

  // ---- Step 1: Deploy LifeContract ----
  console.log('[1/4] Deploying LifeContract (3-day threshold)...')

  const bytecode = await getContractBytecode()
  const factory  = new ethers.ContractFactory(LIFE_CONTRACT_ABI, bytecode, signer)

  const THRESHOLD_DAYS = 3
  const life = await factory.deploy(THRESHOLD_DAYS)
  await life.waitForDeployment()

  const contractAddress = await life.getAddress()
  console.log(`  ✓ LifeContract deployed: ${contractAddress}`)
  console.log(`    Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`)
  console.log()

  // ---- Step 2: Add demo heir ----
  console.log('[2/4] Adding demo heir (50% allocation)...')

  // Use a deterministic demo heir address (derived from signer)
  const demoHeirPk   = ethers.Wallet.createRandom().privateKey
  const demoHeirAddr = new ethers.Wallet(demoHeirPk).address

  const tx = await (life as ethers.Contract).addHeir(demoHeirAddr, 5000)
  await tx.wait()

  console.log(`  ✓ Heir added: ${demoHeirAddr}`)
  console.log(`    Allocation: 50%`)
  console.log()

  // ---- Step 3: Read state ----
  console.log('[3/4] Reading contract state...')

  const contract      = new ethers.Contract(contractAddress, LIFE_CONTRACT_ABI, provider)
  const lastPingTs    = Number(await contract.lastPing())
  const thresholdSecs = Number(await contract.threshold())
  const daysElapsed   = Number(await contract.getDaysElapsed())
  const thresholdDays = Number(await contract.getThresholdDays())
  const heirCount     = Number(await contract.getHeirsCount())
  const inactive      = Boolean(await contract.isInactive())

  const lastPingDate = new Date(lastPingTs * 1000).toISOString()

  console.log(`  Last ping:    ${lastPingDate}`)
  console.log(`  Days elapsed: ${daysElapsed} / ${thresholdDays}`)
  console.log(`  Threshold:    ${thresholdSecs}s (${thresholdDays} days)`)
  console.log(`  Heir count:   ${heirCount}`)
  console.log(`  Inactive:     ${inactive ? '⚠ YES' : '✓ NO'}`)
  console.log()

  // ---- Step 4: Summary ----
  console.log('[4/4] Demo complete!')
  console.log()
  console.log(sep())
  console.log('  SUMMARY')
  console.log(sep())
  console.log(`  LifeContract:    ${contractAddress}`)
  console.log(`  Demo Heir:       ${demoHeirAddr}`)
  console.log(`  Threshold:       ${thresholdDays} days`)
  console.log(`  Status:          ${inactive ? 'INACTIVE' : 'ACTIVE'}`)
  console.log()
  console.log('  NEXT STEPS:')
  console.log()
  console.log('  1. Update .env:')
  console.log(`     LIFE_CONTRACT_ADDRESS=${contractAddress}`)
  console.log()
  console.log('  2. Update cre-workflow/config.json:')
  console.log(`     "lifeContractAddress": "${contractAddress}"`)
  console.log()
  console.log('  3. Run CRE simulation:')
  console.log('     npm run cre:simulate')
  console.log()
  console.log('  4. Start the app:')
  console.log('     npm run dev:all')
  console.log()
  console.log(sep())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
