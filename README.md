# Digital Executor

> **Your crypto doesn't die with you.**

Digital Executor is an autonomous crypto estate management protocol built on Chainlink CRE. It monitors owner proof-of-life signals on-chain. If the owner becomes inactive beyond a threshold, assets automatically transfer to World ID-verified heirs — no lawyers, no intermediaries, no lost keys.

**Hackathon:** Chainlink Convergence 2026
**Prize tracks:** DeFi & Tokenization · CRE & AI · Privacy · World ID

**Demo:** [https://www.youtube.com/watch?v=o8y-5CGNbNs](https://www.youtube.com/watch?v=o8y-5CGNbNs)

---

## The problem your project addresses

When a self-custodied crypto holder dies or becomes permanently incapacitated, their assets are irretrievably lost. Private keys die with the owner — probate courts have no mechanism to override blockchain ownership, centralized custodians reintroduce the counterparty risk that crypto-native users explicitly avoid, and writing a private key in a will is a catastrophic security risk. An estimated $100B+ in Bitcoin alone is already permanently inaccessible due to lost or deceased-holder keys, with no recovery mechanism for self-custodied wallets.

---

## How you've addressed the problem

Digital Executor creates a trustless dead man's switch on-chain. The owner regularly calls `ping()` on a deployed LifeContract to prove liveness. Chainlink CRE runs an autonomous inactivity monitor on a cron schedule — reading the last heartbeat timestamp from the contract, computing days elapsed, and writing a signed ACTIVE / WARNING / CRITICAL verdict on-chain via the DON. If the inactivity threshold is crossed, any caller can trigger `executeEstate()`, which distributes ETH proportionally to pre-registered, World ID-verified heirs — no lawyers, no intermediaries, no trusted operator, no single point of failure.

---

## How you've used CRE

**Demo:** [https://www.youtube.com/watch?v=o8y-5CGNbNs](https://www.youtube.com/watch?v=o8y-5CGNbNs)

The CRE workflow (`cre-workflow/main.ts`) runs on a 5-minute cron schedule across the DON and performs three steps:

1. **Read** — `EVMClient.callContract()` reads `lastPing` and `threshold` from LifeContract on Sepolia at the protocol level, without any backend intermediary.
2. **Evaluate** — Off-chain computation determines ACTIVE (< 90 % of threshold), WARNING (≥ 90 %), or CRITICAL (≥ 100 %), a graded verdict that cannot be expressed in a simple Chainlink Automation `checkUpkeep` boolean.
3. **Write** — `runtime.report()` + `EVMClient.writeReport()` submits the verdict through the DON's consensus-and-signing pipeline, producing a multi-node endorsed on-chain record rather than a single-operator assertion.

`CronCapability` eliminates any centralized server dependency — the monitor runs on the DON itself. A future extension using CRE Confidential HTTP would allow checking off-chain life signals (email last-login, banking APIs) without leaking heir identities or queried accounts on-chain.

---

## Architecture

```
Digital-Legacy-Hub/
├── src/                        # Vite + React + TypeScript frontend
│   ├── components/             # Dashboard, CREMonitoring, DemoModeToggle, WorldIDVerify
│   ├── context/                # DemoModeContext
│   └── hooks/                  # useEstateStatus, useHeirs
├── contracts/                  # Hardhat smart contracts
│   └── contracts/
│       └── LifeContract.sol    # Core estate contract (Sepolia)
├── cre-workflow/               # Chainlink CRE inactivity monitor
│   └── main.ts                 # Reads LifeContract → VerdictRegistry
├── backend/                    # Next.js API routes (port 3001)
│   └── pages/api/
│       ├── status.ts           # GET /api/status
│       ├── heartbeat.ts        # POST /api/heartbeat
│       ├── heirs.ts            # GET /api/heirs
│       ├── estate.ts           # GET /api/estate
│       └── heirs/register.ts  # POST /api/heirs/register (World ID)
└── scripts/
    └── demo.ts                 # Full deploy + configure demo
```

---

## Chainlink Integration

| Service | Usage |
|---|---|
| **CRE (Chainlink Runtime Environment)** | Scheduled inactivity monitor. Reads `lastPing` + `threshold` from LifeContract via `EVMClient.callContract()`. Writes ACTIVE/WARNING/CRITICAL verdict on-chain. |
| **Sepolia Testnet** | All contracts deployed and verified on Ethereum Sepolia |
| **VerdictRegistry** | Existing deployed contract reused for storing CRE verdicts |

---

## Smart Contracts

### LifeContract.sol — Core Estate Logic

```solidity
// Owner heartbeat — resets inactivity timer
function ping() external onlyOwner

// Heir management
function addHeir(address payable heir, uint256 allocationBps) external onlyOwner
function registerHeir(address heir, uint256 nullifierHash) external

// Trustless execution — callable by anyone when inactive
function executeEstate() external

// View functions
function getDaysElapsed() external view returns (uint256)
function getThresholdDays() external view returns (uint256)
function isInactive() external view returns (bool)
function getHeir(uint256 index) external view returns (address, uint256, uint256, bool)
function getStatus() external view returns (uint256, uint256, uint256, uint256, bool)
```

**Events:** `HeartbeatReceived`, `EstateExecuted`, `HeirAdded`, `HeirRegistered`, `ThresholdUpdated`

### VerdictRegistry (existing, reused)

```
Address: 0x0D7e01ceA12fe8E923f39E5021a23333A3aa8910 (Sepolia)
```

---

## CRE Simulation Command

```bash
# Requires CRE CLI — install: https://docs.chain.link/chainlink-nodes/cre/getting-started/cli-installation

# From project root
cre workflow simulate ./cre-workflow --non-interactive --trigger-index 0 -T staging-settings

# Or via npm:
npm run cre:simulate

# Broadcast real tx to Sepolia:
npm run cre:broadcast
```

### CRE Workflow Output

```
============================================================
  Digital Executor — CRE Inactivity Monitor
  Chainlink Convergence Hackathon 2026
============================================================
  LifeContract: 0x7bB50FA2ACE5703Bf6a07644108971868Edb0fA3
  Registry:     0x0D7e01ceA12fe8E923f39E5021a23333A3aa8910

[1/4] Reading last heartbeat from LifeContract...
  Last ping:     2026-02-25T23:33:12.000Z (unix: 1772062392)
  Threshold:     180 days
  Current time:  2026-03-04T07:52:00.000Z (unix: 1772610720)

[2/4] Computing inactivity verdict...
  Last ping:     6.35 days ago
  Threshold:     180 days
  Elapsed:       4% of threshold
  Status:        🟢 ACTIVE
  ✓  Owner is active — no action required

[3/4] Fetching ETH/USD price from CoinGecko...
  ETH/USD:       $2005.74
  Estate (ETH):  1.5 ETH
  Estate value:  $3009 USD

[4/4] Writing status on-chain to VerdictRegistry...
  Registry: 0x0D7e01ceA12fe8E923f39E5021a23333A3aa8910
  VerdictHash: 0xabc4b92491aeb0de1f8a445115451a16e41d7deee10bb34649b8a5333489fc71
  Verdict:     "DIGITAL_EXECUTOR|ACTIVE|6.35|180|$3009 USD"
  TxHash: 0xa6a7d2d795a2cacb0f021312119a98f17d3ab601f9afcfd476316456db2255d8
============================================================
  MONITOR COMPLETE
  Status:        ACTIVE
  TxHash:        0xa6a7d2d795a2cacb0f021312119a98f17d3ab601f9afcfd476316456db2255d8
  Etherscan:     https://sepolia.etherscan.io/tx/0xa6a7d2d795a2cacb0f021312119a98f17d3ab601f9afcfd476316456db2255d8
============================================================
```

---

## Contract Addresses (Sepolia)

| Contract | Address |
|---|---|
| LifeContract | *Run `npm run contracts:deploy` — address printed to console* |
| VerdictRegistry | `0x0D7e01ceA12fe8E923f39E5021a23333A3aa8910` |

---

## Backend API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | GET | `lastPing`, `daysElapsed`, `thresholdDays`, `status`, `balance` |
| `/api/heartbeat` | POST | Sends `ping()` on LifeContract |
| `/api/heirs` | GET | Heir list with allocations + World ID status |
| `/api/estate` | GET | Estate balance + per-heir estimated amounts |
| `/api/heirs/register` | POST | Store World ID nullifier hash on-chain |

---

## World ID Integration

Heirs prove unique humanity via World ID. Flow:
1. Heir clicks **Verify with World ID** next to their address in Dashboard
2. `IDKitWidget` opens, heir completes verification
3. On success: frontend calls `POST /api/heirs/register` with `nullifierHash`
4. Backend calls `registerHeir(address, nullifierHash)` on LifeContract
5. Heir shows **✓ World ID** badge — Sybil-resistant estate distribution

**Action ID:** `digital-executor-heir-verify`
**Nullifier hash:** Stored immutably on LifeContract, prevents duplicate registration

---

## Environment Variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_RPC_URL` | Alchemy Sepolia RPC URL |
| `PRIVATE_KEY` | Deployer/owner private key |
| `LIFE_CONTRACT_ADDRESS` | Set after deployment |
| `VITE_LIFE_CONTRACT_ADDRESS` | Same (for frontend) |
| `VERDICT_REGISTRY_ADDRESS` | `0x0D7e01ceA12fe8E923f39E5021a23333A3aa8910` |
| `NEXT_PUBLIC_WORLD_APP_ID` | World ID app ID |
| `ETHERSCAN_API_KEY` | For contract verification |

---

## How to Run

### Prerequisites

- Node.js 18+, npm
- [CRE CLI](https://docs.chain.link/chainlink-nodes/cre) installed globally
- Sepolia ETH — [sepoliafaucet.com](https://sepoliafaucet.com)

### Quick Start

```bash
# 1. Install frontend dependencies
npm install

# 2. Setup env
cp .env.example .env
# Edit .env with your PRIVATE_KEY and NEXT_PUBLIC_RPC_URL

# 3. Compile + deploy contracts
npm run contracts:install
npm run contracts:compile
npm run contracts:deploy
# → Copy LIFE_CONTRACT_ADDRESS to .env

# 4. Configure CRE workflow
# Edit cre-workflow/config.json: set lifeContractAddress
# Install CRE deps:
cd cre-workflow && npm install && cd ..

# 5. Run demo
npm run demo

# 6. Simulate CRE
npm run cre:simulate

# 7. Start app
npm run dev:all
# Frontend: http://localhost:8080
# Backend:  http://localhost:3001
```

---

## Demo Mode

Toggle **DEMO MODE** (top-right corner) to:
- Simulate 170/180 days elapsed (amber warning state)
- See **CRITICAL — Execute Estate** button at 180+ days
- Test the full UI without a live contract

---

## Security Note

Note: an earlier commit inadvertently included a testnet-only private key that has since been rotated and holds no funds.

---

## License

MIT
