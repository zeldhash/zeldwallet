#!/usr/bin/env node

/**
 * ZeldWallet Setup Script
 *
 * Copies the WASM files and worker.js from zeldhash-miner to the user's public/ folder.
 * Run this after installing zeldwallet:
 *
 *   npx zeldwallet-setup
 *
 * Or add to your package.json scripts:
 *
 *   "postinstall": "zeldwallet-setup"
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Find the zeldhash-miner package directory
 */
function findZeldhashMiner() {
  // Try to resolve from the current working directory (user's project)
  const paths = [
    // From user's project node_modules
    join(process.cwd(), 'node_modules', 'zeldhash-miner'),
    // Hoisted in monorepo or workspace
    join(process.cwd(), '..', 'node_modules', 'zeldhash-miner'),
    // Nested in zeldwallet (pnpm, yarn PnP)
    join(process.cwd(), 'node_modules', 'zeldwallet', 'node_modules', 'zeldhash-miner'),
  ];

  for (const p of paths) {
    if (existsSync(join(p, 'package.json'))) {
      return p;
    }
  }

  // Fallback: use require.resolve to find the package
  try {
    const minerPkg = require.resolve('zeldhash-miner/package.json', {
      paths: [process.cwd()],
    });
    return dirname(minerPkg);
  } catch {
    // Try from this script's location (zeldwallet's node_modules)
    try {
      const minerPkg = require.resolve('zeldhash-miner/package.json');
      return dirname(minerPkg);
    } catch {
      return null;
    }
  }
}

function main() {
  const minerPath = findZeldhashMiner();

  if (!minerPath) {
    console.error('❌ Could not find zeldhash-miner package.');
    console.error('   Make sure zeldwallet is installed: npm install zeldwallet');
    process.exit(1);
  }

  const wasmSrc = join(minerPath, 'wasm');
  const workerSrc = join(minerPath, 'dist', 'worker.js');
  const nonceSrc = join(minerPath, 'dist', 'nonce.js');
  const publicDir = join(process.cwd(), 'public');
  const wasmDest = join(publicDir, 'wasm');

  // Check source files exist
  if (!existsSync(wasmSrc)) {
    console.error(`❌ WASM source not found: ${wasmSrc}`);
    process.exit(1);
  }

  if (!existsSync(workerSrc)) {
    console.error(`❌ Worker source not found: ${workerSrc}`);
    process.exit(1);
  }

  if (!existsSync(nonceSrc)) {
    console.error(`❌ Nonce module source not found: ${nonceSrc}`);
    process.exit(1);
  }

  // Create directories
  mkdirSync(wasmDest, { recursive: true });

  // Copy WASM files
  const wasmFiles = readdirSync(wasmSrc);
  let copiedCount = 0;

  for (const file of wasmFiles) {
    const src = join(wasmSrc, file);
    const dest = join(wasmDest, file);
    copyFileSync(src, dest);
    copiedCount++;
  }

  console.log(`✓ Copied ${copiedCount} WASM file(s) to public/wasm/`);

  // Copy and clean worker.js
  const workerDest = join(publicDir, 'worker.js');
  let workerContent = readFileSync(workerSrc, 'utf8');

  // Remove sourceMappingURL comment
  workerContent = workerContent.replace(/\n?\/\/# sourceMappingURL=worker\.js\.map\s*$/, '');

  writeFileSync(workerDest, workerContent);
  console.log('✓ Copied worker.js to public/');

  // Copy and clean nonce.js (required by worker.js)
  const nonceDest = join(publicDir, 'nonce.js');
  let nonceContent = readFileSync(nonceSrc, 'utf8');

  // Remove sourceMappingURL comment
  nonceContent = nonceContent.replace(/\n?\/\/# sourceMappingURL=nonce\.js\.map\s*$/, '');

  writeFileSync(nonceDest, nonceContent);
  console.log('✓ Copied nonce.js to public/');

  console.log('\n🎉 ZeldWallet setup complete!');
  console.log('   WASM mining support is now available.\n');
}

main();

