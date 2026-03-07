#!/usr/bin/env node
/**
 * Simulates the CRE World ID verifier (trigger-index 1) with a sample
 * proof payload. The proof is fake so Worldcoin will reject it — that
 * demonstrates the full pipeline (HTTP trigger fires, Worldcoin is called,
 * rejection is handled gracefully).
 *
 * To test with a real proof, replace the sampleProof fields with values
 * from an actual IDKit widget response.
 *
 * Usage: npm run cre:worldid-simulate
 */
const { spawnSync } = require('child_process')

const sampleProof = {
  heirAddress:        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  nullifierHash:      '12345678901234567890',
  proof:              '0xproof_placeholder',
  merkle_root:        '0xroot_placeholder',
  verification_level: 'device',
}

// The CRE CLI injects --http-payload directly into payload.input as UTF-8 bytes.
// We pass the raw JSON string — onHttpTrigger decodes it with TextDecoder.
const payloadJson = JSON.stringify(sampleProof)

const bin  = process.env.CRE_BIN || 'cre'
const args = [
  'workflow', 'simulate', './cre-workflow',
  '--non-interactive',
  '--trigger-index', '1',
  '-T', 'staging-settings',
  '--http-payload', payloadJson,
]

console.log('[cre-worldid-simulate] Sample proof:', payloadJson)
console.log('[cre-worldid-simulate] Running CRE World ID trigger simulation...\n')

const result = spawnSync(bin, args, { stdio: 'inherit', shell: false })

if (result.error) {
  console.error(
    `\nERROR: could not find CRE CLI ("${bin}").\n` +
    `Install from https://github.com/smartcontractkit/cre-cli/releases\n`,
  )
  process.exit(1)
}

process.exit(result.status ?? 0)
