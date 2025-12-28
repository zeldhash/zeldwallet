# ZeldWallet

[![Lint](https://github.com/ouziel-slama/zeldwallet/actions/workflows/lint.yml/badge.svg)](https://github.com/ouziel-slama/zeldwallet/actions/workflows/lint.yml)
[![Test](https://github.com/ouziel-slama/zeldwallet/actions/workflows/test.yml/badge.svg)](https://github.com/ouziel-slama/zeldwallet/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/ouziel-slama/zeldwallet/graph/badge.svg?token=L5P886HP35)](https://codecov.io/gh/ouziel-slama/zeldwallet)
[![npm version](https://img.shields.io/npm/v/zeldwallet.svg)](https://www.npmjs.com/package/zeldwallet)

Lightweight JavaScript library for creating a Bitcoin wallet directly in the browser.

ZeldWallet combines Bitcoin key generation, secure storage (IndexedDB + Web Crypto API), and WBIP004 standard compatibility to be detected by existing Bitcoin applications like sats-connect.

## Features

- 🔐 **Secure Storage**: AES-256-GCM encryption with PBKDF2 key derivation
- 🔑 **BIP Standards**: Full support for BIP32/39/44/49/84/86
- 🌐 **Browser Native**: No extensions needed, works directly in the browser
- 📱 **WBIP Compatible**: Works with sats-connect and other WBIP004-compatible apps
- ⚡ **Multiple Address Types**: Legacy, SegWit, Nested SegWit, and Taproot
- 🔓 **Flexible Security**: Start passwordless for quick onboarding, add password later

## Installation

```bash
npm install zeldwallet
```

### WASM Mining Setup (Optional)

If you want to use the mining functionality, run the setup script to copy the required WASM files to your `public/` folder:

```bash
npx zeldwallet-setup
```

This copies:
- WASM files to `public/wasm/`
- Web worker to `public/worker.js`

You can also add this to your `package.json` scripts:

```json
{
  "scripts": {
    "postinstall": "zeldwallet-setup"
  }
}
```

## Quick Start

### Create a New Wallet

```typescript
import { ZeldWallet, ConfirmationModal } from 'zeldwallet';

const wallet = new ZeldWallet();

// Optional: use the built-in modal confirmation UI (auto-enabled in browsers)
wallet.useDefaultConfirmationModal();

// Quick creation WITHOUT password (simple onboarding)
const { mnemonic } = await wallet.create();
console.log('Backup:', mnemonic); // IMPORTANT: User must save this!

// OR with password (more secure)
const { mnemonic: securedMnemonic } = await wallet.create('my-secure-password');

// User can add a password later
await wallet.setPassword('my-secure-password');

// Make the wallet discoverable by sats-connect
wallet.registerProvider({
  id: 'ZeldWallet',
  name: 'Zeld Wallet',
  icon: 'data:image/svg+xml;base64,...'
});
```

### Restore from Mnemonic

```typescript
const wallet = new ZeldWallet();
await wallet.restore('your twelve word mnemonic phrase goes here ...', 'optional-password');
```

### Backup & Restore

```typescript
// Export (requires wallet password – disable the button until hasPassword() is true)
if (!(await wallet.hasPassword())) {
  await wallet.setPassword('my-secure-password');
}
const backupString = await wallet.exportBackup('backup-password');

// Import (walletPassword is required to hydrate storage)
await wallet.importBackup(backupString, 'backup-password', 'my-secure-password');
```
Gate the “Export backup” action behind a password prompt or disable it until `await wallet.hasPassword()` resolves to `true` to avoid confusing users.

### Get Addresses

```typescript
const addresses = wallet.getAddresses(['payment', 'ordinals']);
console.log(addresses);
// [
//   { address: 'bc1q...', publicKey: '...', purpose: 'payment', addressType: 'p2wpkh', derivationPath: "m/84'/0'/0'/0/0" },
//   { address: 'bc1p...', publicKey: '...', purpose: 'ordinals', addressType: 'p2tr', derivationPath: "m/86'/0'/0'/0/0" }
// ]
```

### Sign a Message

```typescript
const signature = await wallet.signMessage('Hello Bitcoin!', 'bc1q...');
console.log(signature); // Base64 encoded signature
```

### Sign a PSBT

```typescript
const signedPsbt = await wallet.signPsbt(psbtBase64, [
  { index: 0, address: 'bc1q...' }
]);
```

### WBIP Provider Registration

```typescript
// Register as a WBIP provider (makes wallet detectable by sats-connect)
wallet.registerProvider({
  id: 'ZeldWallet',
  name: 'Zeld Wallet',
  icon: 'data:image/svg+xml;base64,...'
});

// Now apps using sats-connect can discover and use ZeldWallet!
```

### Confirmation UI

```typescript
import { ConfirmationModal } from 'zeldwallet';

const modal = new ConfirmationModal();
wallet.useConfirmationModal(modal); // or wallet.useDefaultConfirmationModal();
```

ZeldWallet uses the provided confirmation handler for connect/sign flows. In browsers the built-in modal is enabled automatically; in SSR/native contexts plug in your own handler instead of relying on `window.confirm`.

### Web Component

`<zeld-wallet-ui>` is a native web component that silently creates/unlocks a wallet (passwordless by default), registers the WBIP provider, and renders payment + ordinals addresses. If the wallet is password-protected it switches to a locked state with a password form.

```html
<script type="module">
  import { defineZeldWalletUI } from 'zeldwallet';
  defineZeldWalletUI(); // no-op if already defined
</script>

<zeld-wallet-ui lang="en" autoconnect="true"></zeld-wallet-ui>
```

Attributes / props:
- `lang`: i18n (`en` default, `fr` available, falls back `en`)
- `network`: `mainnet` or `testnet` (applied after unlock)
- `autoconnect`: defaults to `true`; set `autoconnect="false"` to require a manual `connect()`

CSS hooks (shadow DOM classes): `zeldwallet-card`, `zeldwallet-header`, `zeldwallet-title`, `zeldwallet-subtitle`, `zeldwallet-rows`, `zeldwallet-row`, `zeldwallet-label`, `zeldwallet-value`, `zeldwallet-copy`, `zeldwallet-status`, `zeldwallet-status--error`, `zeldwallet-status--loading`, `zeldwallet-password-form`, `zeldwallet-password-fields`, `zeldwallet-password-input`, `zeldwallet-password-button`, `zeldwallet-password-error`.

See `examples/web-component.html` for a complete demo with language toggle and style overrides.

### React Component

`ZeldWalletCard` is a thin React wrapper around the **same** `<zeld-wallet-ui>` custom element; there is no separate React UI to maintain. It autoconnects by default, registers the WBIP provider, and exposes a `connect(password?)` imperative handle via `ref`.

```tsx
import { ZeldWalletCard, type ZeldWalletCardRef } from 'zeldwallet';
import { useRef } from 'react';

const walletRef = useRef<ZeldWalletCardRef>(null);

<ZeldWalletCard ref={walletRef} lang="en" network="mainnet" variant="dark" autoconnect />;
```

Props:
- `lang`: `en` or `fr` (defaults to `en`)
- `network`: `mainnet` | `testnet` (applied after unlock)
- `autoconnect`: defaults to `true`; set `false` to require manual `connect()`
- `variant`: `light` (default) or `dark` to mirror the web component classes
- `className`: optional custom wrapper class

See `examples/react` for a Vite demo with language toggle, dark mode, destroy/remount, and message signing.

## Examples

- Run `npm run build` once to refresh `dist/zeldwallet.es.js`, then `npm run dev`.
- Open http://localhost:5173/ (examples root) to pick the Web Component, sats-connect, or React demos.

## API Reference

### Lifecycle Methods

| Method | Description |
|--------|-------------|
| `create(password?)` | Create a new wallet, returns mnemonic |
| `restore(mnemonic, password?)` | Restore wallet from mnemonic |
| `unlock(password?)` | Unlock an existing wallet |
| `lock()` | Lock the wallet, clear sensitive data |
| `exists()` | Check if a wallet exists |
| `destroy()` | Permanently delete all wallet data |

### Password Management

| Method | Description |
|--------|-------------|
| `setPassword(password)` | Add password protection |
| `changePassword(old, new)` | Change the password |
| `removePassword(current)` | Remove password protection |
| `hasPassword()` | Check if password protected |

### Address & Signing

| Method | Description |
|--------|-------------|
| `getAddresses(purposes)` | Get addresses for purposes |
| `signMessage(message, address, protocol?)` | Sign a message |
| `signPsbt(psbt, inputsToSign)` | Sign a PSBT |

### Network & Backup

| Method | Description |
|--------|-------------|
| `getNetwork()` | Get current network |
| `setNetwork(network)` | Set network (mainnet/testnet) |
| `exportMnemonic()` | Export the mnemonic phrase |
| `exportBackup(password)` | Export encrypted backup |
| `importBackup(backup, backupPwd, walletPwd?)` | Import backup |

### Events

| Event | Description |
|-------|-------------|
| `lock` | Wallet was locked |
| `unlock` | Wallet was unlocked |
| `accountsChanged` | Addresses changed |
| `networkChanged` | Network changed |

## Security Considerations

| Mode | Protection Level | Best For |
|------|-----------------|----------|
| No password | AES key stored in IndexedDB | Quick onboarding, small amounts |
| With password | Key derived via PBKDF2 (600k iterations) | Medium amounts |
| Hardware wallet | (not supported yet) | Large amounts |

### ⚠️ Important Security Notes

- **Backup your mnemonic**: The 12/24 word phrase is the only way to recover your wallet
- **Designed for small amounts**: For large sums, use a hardware wallet
- **Browser storage**: Data persists in IndexedDB, vulnerable to XSS if site is compromised
- **Add a password**: Protects against casual physical access and some browser extensions
- **Passwordless mode is weaker**: When the browser cannot persist a non-extractable key (e.g., some Safari/Firefox versions), a raw key envelope is stored in IndexedDB. Malicious extensions could exfiltrate it—set a password to harden the wallet.
- **Lock when idle**: `wallet.lock()` wipes keys from memory and closes storage handles.
- **No key logging**: The library avoids logging secrets; keep your app logs clean too.
- **CSP**: Ship a strict Content-Security-Policy (no inline/eval) to reduce XSS risk around IndexedDB/crypto usage.

### Security posture comparison

| Aspect | ZeldWallet (no password, no backup) | ZeldWallet (password, no backup) | ZeldWallet (password + backup) | Extension wallet (e.g., Xverse) | Custodial wallet (e.g., Web3Auth) |
|---|---|---|---|---|---|
| Key custody | Fully self-custodial | Fully self-custodial | Fully self-custodial | Self-custodial | Custodial / shared custody |
| Secrets at rest | Raw AES key envelope in IndexedDB; weak against device malware/XSS | AES key derived via PBKDF2 (600k); stronger against casual access, still in IndexedDB | Encrypted at rest; off-device backup available with backup password | Stored in extension storage/background page; exposed to extension supply-chain risks | Keys or recovery shares held by service; relies on server/cloud security |
| Exposure surface | Browser tab + other extensions; XSS can read storage | Same surface, but password gates decryption | Same as passworded; backup allows cold copy off the device | Extension APIs and any installed extensions; phishing of extension permissions | Web/app auth; service infrastructure; phishing of login factors |
| Device loss | Funds lost (no recovery) | Funds lost (no recovery) | Recoverable via mnemonic or encrypted backup | Recoverable via seed; loss if no seed backup | Recoverable via account recovery / service-managed backup |
| Recommended use | Only for throwaway/test funds | Small/medium amounts; add backup ASAP | Primary mode for non-custodial users; safer against loss | Small/medium amounts; depends on extension supply chain | Convenience; mitigates device loss; trust placed in provider |

Using ZeldWallet inside a web page means the wallet shares the page’s security boundary: a compromised site, injected script (XSS), or malicious extension can try to read IndexedDB data or page memory. Browser extensions like Xverse run with background-page storage and stricter isolation, so they are less exposed to the host site—but they add their own supply-chain and permission phishing risks. Use a strong CSP, avoid untrusted extensions, and prefer password + backup for ZeldWallet.

### Integration checklist for developers

- Enforce CSP: start with `default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';` and add only the `connect-src`, `img-src`, `font-src` you truly need. Avoid `'unsafe-inline'`/`'unsafe-eval'`; use nonces or hashes for any inline script/style you must keep.
- Avoid inline scripts/styles in your app and in any ZeldWallet integration code; keep everything external or nonce-based.
- Minimize third-party scripts/extensions on pages hosting ZeldWallet; treat every added script as part of your attack surface.
- Always enable wallet password and encourage users to export an encrypted backup; lock the wallet when idle.
- Do not log secrets; scrub request/response bodies and console logs around signing flows.
- If embedding ZeldWallet in an iframe, set `sandbox` appropriately and restrict `allow` attributes; prefer same-origin frames to reduce cross-context exposure.

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Build Outputs

`npm run build` emits to `dist/`:
- ES module: `zeldwallet.es.js` (used by `exports.import` and `main`)
- TypeScript declarations: `index.d.ts` and nested `.d.ts` files

## Standards

- [BIP32](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki) - HD Wallets
- [BIP39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) - Mnemonic code
- [BIP44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki) - Multi-Account HD
- [BIP84](https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki) - Native SegWit
- [BIP86](https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki) - Taproot
- [WBIP004](https://wbips.netlify.app) - Browser Wallet Standard

## License

This project is licensed under either of:

- [Apache License, Version 2.0](LICENSE-APACHE)
- [MIT License](LICENSE-MIT)

at your option.

