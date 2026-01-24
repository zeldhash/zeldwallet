#!/usr/bin/env node

/**
 * ZeldWallet Setup Script
 *
 * Copies the zeldhash-miner assets to the user's public/ folder.
 * Run this after installing zeldwallet:
 *
 *   npx zeldwallet-setup
 *
 * Or add to your package.json scripts:
 *
 *   "postinstall": "zeldwallet-setup"
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
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

  const assetsSrc = join(minerPath, 'assets');
  const publicDir = join(process.cwd(), 'public');
  const assetsDest = join(publicDir, 'zeldhash-miner');

  // Check source folder exists
  if (!existsSync(assetsSrc)) {
    console.error(`❌ Assets folder not found: ${assetsSrc}`);
    console.error('   Make sure zeldhash-miner >= 0.3.1 is installed.');
    process.exit(1);
  }

  // Create destination directory
  mkdirSync(assetsDest, { recursive: true });

  // Copy all asset files
  const assetFiles = readdirSync(assetsSrc);
  let copiedCount = 0;

  for (const file of assetFiles) {
    const src = join(assetsSrc, file);
    const dest = join(assetsDest, file);
    copyFileSync(src, dest);
    copiedCount++;
  }

  console.log(`✓ Copied ${copiedCount} file(s) to public/zeldhash-miner/`);
  console.log('\n🎉 ZeldWallet setup complete!');
  console.log('   WASM mining support is now available.\n');
}

main();
