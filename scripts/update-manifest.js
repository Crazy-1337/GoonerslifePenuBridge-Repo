#!/usr/bin/env node
/**
 * scripts/update-manifest.js
 *
 * Local helper — manually stamp a new version and/or timestamp into
 * pluginmaster.json before pushing the gh-pages branch.
 *
 * USAGE:
 *   node scripts/update-manifest.js [version]
 *
 * EXAMPLES:
 *   node scripts/update-manifest.js            # refresh LastUpdated timestamp only
 *   node scripts/update-manifest.js 1.2.0.0    # update version + timestamp
 *   node scripts/update-manifest.js v1.2.0     # leading "v" is stripped automatically
 *
 * REQUIREMENTS:
 *   Node.js 18+ — no third-party dependencies (pure stdlib).
 *
 * NOTE:
 *   pluginmaster.json must be strictly valid JSON (no // comments).
 *   This script reads and writes it as plain JSON with no stripping step.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────────────────────

// Resolved relative to the repo root (one level above /scripts/)
const MANIFEST_PATH = path.resolve(__dirname, '..', 'pluginmaster.json');

// ── Parse CLI arguments ───────────────────────────────────────────────────────

const [,, rawVersionArg] = process.argv;

// ── Load manifest ─────────────────────────────────────────────────────────────

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`[error] File not found: ${MANIFEST_PATH}`);
  process.exit(1);
}

let manifest;
try {
  // pluginmaster.json is kept as strict JSON — parse directly, no comment stripping
  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (err) {
  console.error('[error] pluginmaster.json is not valid JSON:', err.message);
  process.exit(1);
}

if (!Array.isArray(manifest) || manifest.length === 0) {
  console.error('[error] pluginmaster.json must be a non-empty JSON array.');
  process.exit(1);
}

// ── Compute new field values ──────────────────────────────────────────────────

const entry = manifest[0];

// --- Version ---
// Normalise to four-part "Major.Minor.Patch.Build" to match AssemblyVersion.
let newVersion = entry.AssemblyVersion ?? '1.0.0.0';

if (rawVersionArg) {
  const v     = rawVersionArg.replace(/^v/i, '');   // strip leading "v"
  const parts = v.split('.');
  while (parts.length < 4) parts.push('0');          // pad to four parts
  newVersion  = parts.slice(0, 4).join('.');
}

// --- Timestamp ---
const newEpoch = Math.floor(Date.now() / 1000);     // Unix seconds (UTC)

// ── Apply updates ─────────────────────────────────────────────────────────────

const prevVersion = entry.AssemblyVersion;
const prevEpoch   = entry.LastUpdated;

entry.AssemblyVersion = newVersion;
entry.LastUpdated     = newEpoch;

// ── Validate the modified object before writing ───────────────────────────────

try {
  JSON.parse(JSON.stringify(manifest));              // round-trip check
} catch (err) {
  console.error('[error] Modified manifest failed round-trip validation:', err.message);
  process.exit(1);
}

// ── Write back ────────────────────────────────────────────────────────────────

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────

console.log('pluginmaster.json updated successfully.\n');
console.log(`  AssemblyVersion : ${prevVersion}  →  ${newVersion}`);
console.log(`  LastUpdated     : ${prevEpoch}  →  ${newEpoch}`);
console.log(`                    (${new Date(newEpoch * 1000).toUTCString()})\n`);
console.log('Next steps:');
console.log('  git add pluginmaster.json');
console.log(`  git commit -m "release: v${newVersion}"`);
console.log('  git push origin gh-pages');
