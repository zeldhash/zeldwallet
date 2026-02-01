# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.15] - 2026-01-24

### Added

- **Sweep mode**: New "Sweep" checkbox in the hunting UI that allows emptying the entire wallet (all BTC and ZELD) to a single destination address. When enabled, all UTXOs from both payment and ordinals addresses are used as inputs, with the destination address receiving all funds minus the network fee.

### Changed

- **Updated `zeldhash-miner` to 0.3.1**: Assets are now bundled in a single `public/zeldhash-miner/` folder (previously `public/wasm/` + `public/worker.js` + `public/nonce.js`)
- Updated `zeldwallet-setup` script and `copy-wasm` npm script to use the new unified asset structure
- `nonce.js` is no longer needed (worker is now a self-contained bundle)

### Migration

If you were using the previous setup, delete the old asset files and re-run the setup:

```bash
rm -rf public/wasm public/worker.js public/nonce.js
npx zeldwallet-setup
```

## [0.1.14] - 2025-01-11

### Fixed

- Fixed backup/restore not preserving custom derivation paths across domains
- Backups now include `customPaths` so that wallets with non-standard derivation paths (e.g., MagicEden-style) can be restored on different domains with the same addresses

## [0.1.13] - 2025-01-07

### Fixed

- Fixed custom derivation paths not being propagated to KeyManager during wallet initialization and unlock
- Fixed balance double-counting when payment and ordinals addresses are the same (now deduplicates addresses before fetching)
- Fixed PSBT signing failing for wallets with custom derivation paths by including `derivationPath` in sign inputs
- Fixed ZELD sending not selecting UTXOs with ZELD balance from the payment address (now selects from both ordinals and payment addresses)
- Fixed minimum BTC calculation for ZELD sending (now requires 3 × DUST for 3 outputs instead of 2)
- Fixed potential UTXO double-selection in miner by tracking already-selected UTXOs

### Added

- Added `setCustomPaths()` and `getCustomPaths()` methods to KeyManager for non-standard wallet configurations
- KeyManager's `findAddressPath()` now checks custom paths first before scanning standard derivation paths

## [0.1.12] - 2025-01-03

### Fixed

- Fixed Xverse wallet connection failing with "Invalid parameters" error on newer versions
- Xverse now uses the `getAddress` helper from sats-connect instead of `wallet_connect` RPC method
- Use `SatsPurpose` constants instead of string literals for better type safety

## [0.1.11] - 2025-01-03

### Fixed

- Fixed balance fetching failing when Leather wallet returns Stacks addresses alongside Bitcoin addresses
- Added Bitcoin address validation to filter out non-Bitcoin address formats (bech32, legacy, P2SH)
- Changed `Promise.all` to `Promise.allSettled` for balance fetching to prevent one address error from failing the entire batch

## [0.1.10] - 2025-12-28

### Fixed

- Fixed WASM mining not working due to missing `nonce.js` module
- Both `copy-wasm` script and `bin/setup.js` now properly copy `nonce.js` alongside `worker.js`

## [0.1.9] - 2025-12-28

### Changed

- Updated `zeldhash-miner` peer dependency to version `0.2.5`

## [0.1.8] - 2025-12-28

### Changed

- Updated `zeldhash-miner` peer dependency to version `0.2.4`

## [0.1.7] - 2025-12-28

### Changed

- Updated `zeldhash-miner` peer dependency to version `0.2.3`

## [0.1.6] - 2025-12-28

### Fixed

- Made `bin/setup.js` executable (chmod +x) for proper npx command execution

### Changed

- Pinned `zeldhash-miner` peer dependency to exact version `0.2.2` for better compatibility
- Added `zeldhash-miner` to devDependencies for development and testing

## [0.1.5] - 2025-12-28

### Fixed

- Fixed `copy-wasm` script to gracefully skip when `zeldhash-miner` is not installed (no more build errors)

### Changed

- Improved `copy-wasm` script: now checks for `zeldhash-miner` presence before attempting to copy WASM files
- Added TypeScript module declaration for optional `zeldhash-miner` peer dependency

## [0.1.4] - 2025-12-28

### Fixed

- **Breaking Fix for Next.js/Turbopack**: Moved `zeldhash-miner` from `dependencies` to optional `peerDependencies`. Turbopack parses all files in node_modules, and the Web Worker syntax in `zeldhash-miner` was causing build failures even with lazy loading. Now `zeldhash-miner` is not installed automatically—users must install it separately if they want mining functionality.

### Changed

- Mining feature now requires explicit installation of `zeldhash-miner`: `npm install zeldhash-miner`
- Added localized error messages when `zeldhash-miner` is not installed

## [0.1.3] - 2025-12-28

### Fixed

- Fixed Next.js/Turbopack compatibility issue: `zeldhash-miner` is now lazy-loaded to avoid Web Worker initialization at import time

## [0.1.2] - 2025-12-28

### Fixed

- Fixed `postinstall` script failing when zeldwallet is installed as a dependency (npm hoisting issue)

### Changed

- Replaced automatic `postinstall` with manual `npx zeldwallet-setup` command for WASM file setup
- Added `zeldwallet-setup` bin script that correctly locates `zeldhash-miner` regardless of node_modules structure

## [0.1.1] - 2025-12-28

### Changed

- Added React 19 compatibility in peerDependencies (now supports React 18.2+ and React 19.0+)

## [0.1.0] - 2025-12-28

### Added

- **Core Wallet Features**
  - BIP32/39/44/49/84/86 key derivation for Legacy, SegWit, Nested SegWit, and Taproot addresses
  - Secure storage with AES-256-GCM encryption and PBKDF2 key derivation (600k iterations)
  - Password-optional wallet creation for quick onboarding
  - Message signing (ECDSA and BIP-322)
  - PSBT signing support

- **WBIP Provider**
  - WBIP004/005/006 compatible provider registration
  - Full sats-connect integration for wallet discovery
  - Supported methods: `getInfo`, `getAddresses`, `signMessage`, `signPsbt`

- **UI Components**
  - `<zeld-wallet-ui>` Web Component with Shadow DOM encapsulation
  - `<ZeldWalletCard>` React component wrapper
  - `useZeldWalletController` React hook for custom UI
  - Built-in confirmation modal for signing requests
  - Dark/light theme variants
  - Internationalization support (30 languages)

- **Miner Integration**
  - Built-in zeldhash-miner support in the UI component for Zeld hunting
  - Support for simple hunt, BTC sending, and Zeld sending modes
  - Automatic UTXO selection with dust threshold handling

- **Backup & Recovery**
  - Mnemonic export/import
  - Encrypted backup export/import with separate backup password
  - Network switching (mainnet/testnet)

- **Auto-Lock**
  - Automatic wallet lock after 5 minutes of idle time when password is configured
  - Activity detection via mouse, keyboard, touch, and scroll events

### Security

- AES-256-GCM encryption for wallet data at rest
- PBKDF2 with 600,000 iterations for password-based key derivation
- Non-extractable CryptoKey usage where browser supports
- Automatic memory cleanup on wallet lock

### Other

- Dual licensing under MIT or Apache-2.0

[0.1.15]: https://github.com/zeldhash/zeldwallet/compare/v0.1.14...v0.1.15
[0.1.14]: https://github.com/zeldhash/zeldwallet/compare/v0.1.13...v0.1.14
[0.1.13]: https://github.com/zeldhash/zeldwallet/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/zeldhash/zeldwallet/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/zeldhash/zeldwallet/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/zeldhash/zeldwallet/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/zeldhash/zeldwallet/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/zeldhash/zeldwallet/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/zeldhash/zeldwallet/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/zeldhash/zeldwallet/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/zeldhash/zeldwallet/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/zeldhash/zeldwallet/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/zeldhash/zeldwallet/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/zeldhash/zeldwallet/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/zeldhash/zeldwallet/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zeldhash/zeldwallet/releases/tag/v0.1.0

