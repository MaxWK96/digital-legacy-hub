#!/usr/bin/env node
/**
 * CRE CLI wrapper — tries `cre` on PATH first (portable, for judges),
 * falls back to CRE_BIN env var if set (for local dev without PATH config).
 *
 * Usage: node scripts/cre-run.js <cre args...>
 * Local:  CRE_BIN="C:\path\to\cre.exe" npm run cre:simulate
 * Judges: npm run cre:simulate   (requires `cre` on PATH)
 */
const { spawnSync } = require('child_process')

const args = process.argv.slice(2)

// Try CRE_BIN env var first, then fall back to `cre` on PATH
const bin = process.env.CRE_BIN || 'cre'

const result = spawnSync(bin, args, { stdio: 'inherit', shell: false })

if (result.error) {
  // CRE_BIN / PATH lookup failed — print a helpful message
  console.error(
    `\nERROR: could not find CRE CLI ("${bin}").\n` +
    `Install it from https://github.com/smartcontractkit/cre-cli/releases\n` +
    `and make sure it is on your PATH, or set the CRE_BIN env var.\n`,
  )
  process.exit(1)
}

process.exit(result.status ?? 0)
