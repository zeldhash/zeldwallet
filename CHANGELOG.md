# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.6]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ouziel-slama/zeldwallet/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ouziel-slama/zeldwallet/releases/tag/v0.1.0

