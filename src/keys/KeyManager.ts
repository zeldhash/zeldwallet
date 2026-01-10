/**
 * KeyManager
 * 
 * Handles Bitcoin key generation, derivation, and signing.
 * Supports BIP32/39/44/49/84/86 standards.
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { Buffer as NodeBuffer } from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import * as secp256k1 from '@noble/secp256k1';

// Initialize bitcoinjs-lib with ECC library (idempotent)
function ensureEcc(): void {
  bitcoin.initEccLib(ecc);
}
ensureEcc();

function ensureBuffer(): typeof Buffer {
  if (typeof globalThis.Buffer === 'undefined') {
    (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = NodeBuffer;
  }
  return globalThis.Buffer;
}

type EccWithSchnorr = typeof ecc & { signSchnorr?: (msg: Uint8Array, priv: Uint8Array) => Uint8Array };
const schnorrImpl =
  (ecc as EccWithSchnorr).signSchnorr
    ? {
        sign: (msg: Uint8Array, priv: Uint8Array) =>
          Promise.resolve((ecc as EccWithSchnorr).signSchnorr!(msg, priv)),
      }
    : undefined;

import type {
  AddressType,
  AddressPurpose,
  DerivedAddress,
  AddressInfo,
  NetworkType,
  SignInputOptions,
} from '../types';
import {
  addressTypeToPathType,
  purposeToAddressType,
  buildDerivationPath,
  pathTypeToAddressType,
  type DerivationPathType,
  parseDerivationPath,
} from './derivation';
import {
  createMessageHash,
  signMessageEcdsa,
  signMessageBip322Simple,
} from './signing';
import { bytesToHex } from '../utils/encoding';

type AddressLookupConfig = {
  maxAccount: number;
  receiveWindow: number;
  changeWindow: number;
};

const DEFAULT_ADDRESS_LOOKUP: AddressLookupConfig = {
  // Keep the default scan tiny; callers can opt-in to larger gaps via setAddressLookupConfig.
  maxAccount: 4, // scan accounts 0..4
  receiveWindow: 20, // indices 0..19 for receive addresses
  changeWindow: 20, // indices 0..19 for change addresses (common gap limit)
};

const ADDRESS_LOOKUP_LIMITS: AddressLookupConfig = {
  maxAccount: 100,
  receiveWindow: 200,
  changeWindow: 200,
};

/**
 * Custom derivation paths for non-standard wallet configurations
 */
export type CustomPaths = {
  payment?: string;
  ordinals?: string;
};

/**
 * KeyManager class for Bitcoin key operations
 */
export class KeyManager {
  private masterKey: HDKey | null = null;
  private mnemonic: string | null = null;
  private network: NetworkType = 'mainnet';
  private derivedKeys: Map<string, HDKey> = new Map();
  private addressLookup: AddressLookupConfig = { ...DEFAULT_ADDRESS_LOOKUP };
  private customPaths: CustomPaths = {};

  private assertUnlocked(): void {
    if (!this.masterKey || !this.mnemonic) {
      throw new Error('Wallet is locked');
    }
  }

  /**
   * Generate a new BIP39 mnemonic phrase
   * @param strength - 128 for 12 words, 256 for 24 words
   */
  generateMnemonic(strength: 128 | 256 = 128): string {
    return bip39.generateMnemonic(wordlist, strength);
  }

  /**
   * Set custom derivation paths for non-standard wallet configurations.
   * These paths will be checked first when resolving addresses.
   */
  setCustomPaths(paths: CustomPaths | undefined): void {
    this.customPaths = paths ?? {};
  }

  /**
   * Get the current custom derivation paths.
   */
  getCustomPaths(): CustomPaths {
    return { ...this.customPaths };
  }

  /**
   * Adjust the address lookup window used when resolving addresses -> paths.
   * Useful for wallets with large gaps; values must be non-negative integers.
   */
  setAddressLookupConfig(config: Partial<AddressLookupConfig>): void {
    const next: AddressLookupConfig = { ...this.addressLookup };

    if (config.maxAccount !== undefined) {
      if (!Number.isInteger(config.maxAccount) || config.maxAccount < 0) {
        throw new Error('maxAccount must be a non-negative integer');
      }
      next.maxAccount = Math.min(config.maxAccount, ADDRESS_LOOKUP_LIMITS.maxAccount);
    }
    if (config.receiveWindow !== undefined) {
      if (!Number.isInteger(config.receiveWindow) || config.receiveWindow < 0) {
        throw new Error('receiveWindow must be a non-negative integer');
      }
      next.receiveWindow = Math.min(config.receiveWindow, ADDRESS_LOOKUP_LIMITS.receiveWindow);
    }
    if (config.changeWindow !== undefined) {
      if (!Number.isInteger(config.changeWindow) || config.changeWindow < 0) {
        throw new Error('changeWindow must be a non-negative integer');
      }
      next.changeWindow = Math.min(config.changeWindow, ADDRESS_LOOKUP_LIMITS.changeWindow);
    }

    this.addressLookup = next;
  }

  /**
   * Initialize the key manager from a mnemonic phrase
   * @param mnemonic - The BIP39 mnemonic phrase
   * @param passphrase - Optional BIP39 passphrase
   */
  async fromMnemonic(mnemonic: string, passphrase: string = ''): Promise<void> {
    // Validate the mnemonic
    if (!bip39.validateMnemonic(mnemonic, wordlist)) {
      // Align error message with tests and keep wording concise
      throw new Error('Invalid mnemonic');
    }

    // Derive seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
    
    // Create master key from seed
    this.masterKey = HDKey.fromMasterSeed(seed);
    this.mnemonic = mnemonic;
    
    // Clear cached derived keys
    this.derivedKeys.clear();
  }

  /**
   * Set the network (mainnet or testnet)
   */
  setNetwork(network: NetworkType): void {
    if (this.network !== network) {
      this.network = network;
      // Clear cached keys when network changes
      this.derivedKeys.clear();
    }
  }

  /**
   * Get the current network
   */
  getNetwork(): NetworkType {
    return this.network;
  }

  /**
   * Get the Bitcoin network configuration
   */
  private getBitcoinNetwork(): bitcoin.Network {
    return this.network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  }

  /**
   * Derive a key for a specific path
   */
  private deriveKey(path: string): HDKey {
    this.assertUnlocked();

    // Check cache
    let key = this.derivedKeys.get(path);
    if (key) return key;

    // Derive and cache
    key = this.masterKey!.derive(path);
    this.derivedKeys.set(path, key);
    return key;
  }

  /**
   * Derive a Bitcoin address
   */
  deriveAddress(
    type: DerivationPathType,
    account: number = 0,
    change: 0 | 1 = 0,
    index: number = 0
  ): DerivedAddress {
    this.assertUnlocked();
    const path = buildDerivationPath(type, this.network, account, change, index);
    const key = this.deriveKey(path);
    
    if (!key.publicKey) {
      throw new Error('Failed to derive public key');
    }

    const bufferCtor = ensureBuffer();
    ensureEcc();
    const pubkeyBytes = new Uint8Array(key.publicKey);
    if (!ecc.isPoint(pubkeyBytes)) {
      throw new Error('Derived invalid public key');
    }
    const pubkeyBuffer = bufferCtor.from(pubkeyBytes);
    // Defensive: ensure ECC library accepts the derived point before handing it to bitcoinjs-lib.
    if (!ecc.isPoint(pubkeyBuffer)) {
      throw new Error('Derived invalid public key');
    }

    const address = this.createAddress(pubkeyBuffer, type, bufferCtor);
    
    return {
      address,
      publicKey: bytesToHex(key.publicKey),
      path,
      type: pathTypeToAddressType(type),
    };
  }

  /**
   * Create a Bitcoin address from a public key
   */
  private createAddress(publicKey: Buffer, type: DerivationPathType, bufferCtor: typeof Buffer): string {
    const network = this.getBitcoinNetwork();

    switch (type) {
      case 'legacy': {
        // P2PKH: HASH160(pubkey) with version byte
        const payment = bitcoin.payments.p2pkh({
          pubkey: bufferCtor.from(publicKey),
          network,
        });
        return payment.address!;
      }

      case 'nestedSegwit': {
        // P2SH-P2WPKH: P2SH wrapping P2WPKH
        const payment = bitcoin.payments.p2sh({
          redeem: bitcoin.payments.p2wpkh({
            pubkey: bufferCtor.from(publicKey),
            network,
          }),
          network,
        });
        return payment.address!;
      }

      case 'nativeSegwit': {
        // P2WPKH: Native SegWit
        const payment = bitcoin.payments.p2wpkh({
          pubkey: bufferCtor.from(publicKey),
          network,
        });
        return payment.address!;
      }

      case 'taproot': {
        // P2TR: Taproot with key-path only
        // For Taproot, we need the x-only public key
        const xOnlyPubKey = publicKey.length === 33 ? publicKey.slice(1) : publicKey;
        const payment = bitcoin.payments.p2tr({
          internalPubkey: bufferCtor.from(xOnlyPubKey),
          network,
        });
        return payment.address!;
      }
    }
  }

  /**
   * Derive a Bitcoin address from a custom derivation path string.
   * @param path - Full derivation path (e.g., "m/84'/0'/0'/0/0")
   * @returns DerivedAddress with address, publicKey, path, and type
   */
  deriveAddressFromPath(path: string): DerivedAddress {
    this.assertUnlocked();
    
    const parsed = parseDerivationPath(path);
    if (!parsed) {
      throw new Error(`Invalid derivation path format: ${path}`);
    }
    
    const key = this.deriveKey(path);
    
    if (!key.publicKey) {
      throw new Error('Failed to derive public key');
    }

    const bufferCtor = ensureBuffer();
    ensureEcc();
    const pubkeyBytes = new Uint8Array(key.publicKey);
    if (!ecc.isPoint(pubkeyBytes)) {
      throw new Error('Derived invalid public key');
    }
    const pubkeyBuffer = bufferCtor.from(pubkeyBytes);
    if (!ecc.isPoint(pubkeyBuffer)) {
      throw new Error('Derived invalid public key');
    }

    // Detect address type from purpose in path
    const pathType = this.detectPathTypeFromPurpose(parsed.purpose);
    const address = this.createAddress(pubkeyBuffer, pathType, bufferCtor);
    
    return {
      address,
      publicKey: bytesToHex(key.publicKey),
      path,
      type: pathTypeToAddressType(pathType),
    };
  }

  /**
   * Detect derivation path type from purpose number
   */
  private detectPathTypeFromPurpose(purpose: number): DerivationPathType {
    switch (purpose) {
      case 86:
        return 'taproot';
      case 84:
        return 'nativeSegwit';
      case 49:
        return 'nestedSegwit';
      case 44:
      default:
        return 'legacy';
    }
  }

  /**
   * Get addresses for specified purposes (WBIP compatible)
   * @param purposes - Array of address purposes
   * @param customPaths - Optional map of purpose to custom derivation path
   */
  getAddresses(purposes: AddressPurpose[], customPaths?: { payment?: string; ordinals?: string }): AddressInfo[] {
    const addresses: AddressInfo[] = [];

    for (const purpose of purposes) {
      let derived: DerivedAddress;
      
      // Check if we have a custom path for this purpose
      const customPath = purpose === 'payment' ? customPaths?.payment : 
                         purpose === 'ordinals' ? customPaths?.ordinals : undefined;
      
      if (customPath) {
        // Use custom path
        derived = this.deriveAddressFromPath(customPath);
      } else {
        // Use default path
        const addressType = purposeToAddressType(purpose);
        const pathType = addressTypeToPathType(addressType);
        derived = this.deriveAddress(pathType, 0, 0, 0);
      }

      addresses.push({
        address: derived.address,
        publicKey: derived.publicKey,
        purpose,
        addressType: derived.type,
        derivationPath: derived.path,
      });
    }

    return addresses;
  }

  /**
   * Find the derivation path for an address.
   * Checks custom paths first, then scans standard derivation paths.
   */
  findAddressPath(address: string): { path: string; type: AddressType } | null {
    // First, check custom paths (these take priority for non-standard wallets)
    const customPathsToCheck = [
      this.customPaths.payment,
      this.customPaths.ordinals,
    ].filter((p): p is string => !!p);

    for (const customPath of customPathsToCheck) {
      try {
        const derived = this.deriveAddressFromPath(customPath);
        if (derived.address === address) {
          return { path: derived.path, type: derived.type };
        }
      } catch {
        // Invalid path format, skip
      }
    }

    // Then scan standard derivation paths
    const types: DerivationPathType[] = ['legacy', 'nestedSegwit', 'nativeSegwit', 'taproot'];

    for (const type of types) {
      for (let account = 0; account <= this.addressLookup.maxAccount; account++) {
        // Receive addresses
        for (let index = 0; index < this.addressLookup.receiveWindow; index++) {
          const derived = this.deriveAddress(type, account, 0, index);
          if (derived.address === address) {
            return { path: derived.path, type: derived.type };
          }
        }

        // Change addresses
        for (let index = 0; index < this.addressLookup.changeWindow; index++) {
          const change = this.deriveAddress(type, account, 1, index);
          if (change.address === address) {
            return { path: change.path, type: change.type };
          }
        }
      }
    }

    return null;
  }

  /**
   * Sign a message with the private key of the specified address
   */
  async signMessage(
    message: string,
    address: string,
    protocol?: 'ecdsa' | 'bip322-simple'
  ): Promise<string> {
    this.assertUnlocked();
    const addressInfo = this.findAddressPath(address);
    if (!addressInfo) {
      throw new Error(`Address not found: ${address}`);
    }

    const key = this.deriveKey(addressInfo.path);
    if (!key.privateKey) {
      throw new Error('Private key not available');
    }

    const schnorrAvailable = Boolean(schnorrImpl?.sign);
    const isTaproot = addressInfo.type === 'p2tr';
    const resolvedProtocol = protocol ?? (isTaproot ? 'bip322-simple' : 'ecdsa');

    if (resolvedProtocol === 'bip322-simple') {
      if (!isTaproot) {
        throw new Error('BIP322 simple signing is only supported for taproot addresses');
      }
      if (!schnorrAvailable) {
        throw new Error('BIP322 signing requires Schnorr support');
      }
      const { evenPriv, xOnlyPubKey } = this.getEvenYKeyMaterial(key);
      return signMessageBip322Simple(
        message,
        address,
        this.getBitcoinNetwork(),
        evenPriv,
        xOnlyPubKey,
        schnorrImpl
      );
    }

    if (isTaproot && resolvedProtocol === 'ecdsa') {
      throw new Error('Taproot addresses require bip322-simple signing');
    }

    const messageHash = createMessageHash(message);
    return signMessageEcdsa(messageHash, key.privateKey);
  }

  /**
   * Sign a PSBT (Partially Signed Bitcoin Transaction)
   */
  async signPsbt(psbtBase64: string, inputsToSign: SignInputOptions[]): Promise<string> {
    this.assertUnlocked();
    // Decode PSBT
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
      network: this.getBitcoinNetwork(),
    });
    const bufferCtor = ensureBuffer();

    // Reject unsupported advanced taproot options explicitly
    for (const input of inputsToSign) {
      if (input.tapMerkleRootHex || input.tapLeafHashHex) {
        throw new Error('Taproot script-path signing is not supported yet');
      }
    }

    for (const input of inputsToSign) {
      const psbtInput = psbt.data.inputs[input.index];
      if (!psbtInput) {
        throw new Error(`Input ${input.index} not found in PSBT`);
      }

      const voutIndex = psbt.txInputs?.[input.index]?.index;
      const scriptPubKey =
        psbtInput.witnessUtxo?.script ||
        (psbtInput.nonWitnessUtxo && voutIndex !== undefined
          ? this.extractScriptFromTx(psbtInput.nonWitnessUtxo, voutIndex)
          : null);

      if (!scriptPubKey) {
        throw new Error(`Cannot determine script for input ${input.index}`);
      }

      // Get the key for signing (explicit path overrides lookups)
      let key: HDKey | null = null;
      let resolvedAddressType: AddressType | null = null;
      let resolvedPath: string | null = null;
      let resolvedAddress: string | null = null;

      if (input.derivationPath) {
        resolvedPath = input.derivationPath;
        key = this.deriveKey(resolvedPath);
        const pathType = this.detectPathTypeFromPath(resolvedPath);
        resolvedAddressType = pathTypeToAddressType(pathType);
        resolvedAddress = this.createAddress(bufferCtor.from(key.publicKey!), pathType, bufferCtor);
      } else if (input.address) {
        const addressInfo = this.findAddressPath(input.address);
        if (!addressInfo) {
          throw new Error(`Address not found: ${input.address}`);
        }
        key = this.deriveKey(addressInfo.path);
        resolvedAddressType = addressInfo.type;
        resolvedPath = addressInfo.path;
        resolvedAddress = input.address;
      } else {
        // Try to determine the address from the PSBT input
        const address = this.scriptToAddress(scriptPubKey);
        if (address) {
          const addressInfo = this.findAddressPath(address);
          if (addressInfo) {
            key = this.deriveKey(addressInfo.path);
            resolvedAddressType = addressInfo.type;
            resolvedPath = addressInfo.path;
            resolvedAddress = address;
          }
        }
      }

      if (!key || !key.privateKey) {
        throw new Error(`Cannot find key for input ${input.index}`);
      }

      const pathType =
        resolvedAddressType
          ? addressTypeToPathType(resolvedAddressType)
          : (resolvedPath ? this.detectPathTypeFromPath(resolvedPath) : null);

      if (!pathType) {
        throw new Error(
          `Unable to determine derivation path for input ${input.index}; provide address or derivationPath`
        );
      }

      const addressType =
        resolvedAddressType || pathTypeToAddressType(pathType);
      const addressForScript =
        resolvedAddress || this.createAddress(bufferCtor.from(key.publicKey!), pathType, bufferCtor);

      if (addressForScript) {
        const expectedScript = bitcoin.address.toOutputScript(
          addressForScript,
          this.getBitcoinNetwork()
        );
        if (!expectedScript.equals(scriptPubKey)) {
          throw new Error(
            `PSBT input ${input.index} does not match provided address ${addressForScript}`
          );
        }
      }

      // Taproot (Schnorr) signing path
      if (addressType === 'p2tr') {
        const taprootSighash = this.resolveTaprootSighash(input.sighashTypes);
        this.signTaprootInput(
          psbt,
          input.index,
          key,
          taprootSighash,
          input.finalize === true
        );
      } else {
        // Create ECDSA signer
        const signer = {
          publicKey: Buffer.from(key.publicKey!),
          sign: (hash: Buffer) => {
            // bitcoinjs expects a compact (r || s) 64-byte signature; HDKey.sign already returns that
            const compact = key!.sign(new Uint8Array(hash));
            return Buffer.from(compact);
          },
        };

        // Sign the input
        psbt.signInput(input.index, signer, input.sighashTypes);
      }

      // Finalize only when explicitly requested
      if (input.finalize === true) {
        try {
          psbt.finalizeInput(input.index);
        } catch {
          // Input may not be finalizable yet
        }
      }
    }

    return psbt.toBase64();
  }

  /**
   * Extract script from a raw transaction
   */
  private extractScriptFromTx(txBuffer: Buffer, voutIndex: number): Buffer | null {
    ensureBuffer();
    try {
      const tx = bitcoin.Transaction.fromBuffer(txBuffer);
      const vout = tx.outs[voutIndex];
      return vout ? vout.script : null;
    } catch {
      return null;
    }
  }

  /**
   * Detect derivation path type from a derived key path string
   * Used to infer address type for signing decisions.
   */
  private detectPathTypeFromPath(path: string): DerivationPathType {
    const parsed = parseDerivationPath(path);
    if (!parsed) {
      throw new Error(`Unsupported derivation path format: ${path}`);
    }

    switch (parsed.purpose) {
      case 86:
        return 'taproot';
      case 84:
        return 'nativeSegwit';
      case 49:
        return 'nestedSegwit';
      case 44:
        return 'legacy';
      default:
        throw new Error(`Unsupported derivation purpose: ${parsed.purpose} in path ${path}`);
    }
  }

  /**
   * Validate Taproot sighash selection; only a single value is allowed.
   */
  private resolveTaprootSighash(sighashTypes?: number[]): number {
    if (!sighashTypes || sighashTypes.length === 0) {
      return 0x00;
    }
    if (sighashTypes.length > 1) {
      throw new Error('Taproot signing supports a single sighashType');
    }
    return sighashTypes[0];
  }

  /**
   * Normalize key material to the even-Y form required by BIP340.
   */
  private getEvenYKeyMaterial(key: HDKey): { evenPriv: Uint8Array; xOnlyPubKey: Uint8Array } {
    if (!key.privateKey || !key.publicKey) {
      throw new Error('Private key not available for Taproot signing');
    }

    const Buffer = ensureBuffer();
    const pubkey = Buffer.from(key.publicKey);
    const curveN = secp256k1.CURVE.n;
    const privAsBigInt = BigInt('0x' + Buffer.from(key.privateKey).toString('hex'));
    const isOddY = pubkey[0] === 0x03;
    const evenPrivBigInt = isOddY ? (curveN - privAsBigInt) % curveN : privAsBigInt;
    const evenPriv = Buffer.from(evenPrivBigInt.toString(16).padStart(64, '0'), 'hex');
    const evenPub = Buffer.from(ecc.pointFromScalar(evenPriv, true)!);
    const xOnlyPubKey = evenPub.slice(1);

    return {
      evenPriv: new Uint8Array(evenPriv),
      xOnlyPubKey: new Uint8Array(xOnlyPubKey),
    };
  }

  /**
   * Sign a Taproot input (key-path) using Schnorr
   */
  private signTaprootInput(
    psbt: bitcoin.Psbt,
    inputIndex: number,
    key: HDKey,
    sighashType: number = 0x00,
    finalize: boolean = false
  ): void {
    const Buffer = ensureBuffer();
    if (typeof (ecc as EccWithSchnorr).signSchnorr !== 'function') {
      throw new Error('Taproot signing requires Schnorr support in tiny-secp256k1');
    }

    const { evenPriv, xOnlyPubKey } = this.getEvenYKeyMaterial(key);
    const network = this.getBitcoinNetwork();
    const evenPrivBuffer = Buffer.from(evenPriv);
    const xOnlyPubKeyBuffer = Buffer.from(xOnlyPubKey);

    const input = psbt.data.inputs[inputIndex];
    if (!input) {
      throw new Error(`Input ${inputIndex} not found in PSBT`);
    }

    // Verify the PSBT input actually matches the derived internal key to avoid mismatched signing.
    if (input.tapInternalKey && !Buffer.from(input.tapInternalKey).equals(xOnlyPubKeyBuffer)) {
      throw new Error(`Taproot input ${inputIndex} does not match derived internal key`);
    }

    const scriptPubKey =
      input.witnessUtxo?.script ||
      (input.nonWitnessUtxo && psbt.txInputs?.[inputIndex]?.index !== undefined
        ? this.extractScriptFromTx(
            input.nonWitnessUtxo,
            psbt.txInputs[inputIndex]?.index as number
          )
        : null);

    if (scriptPubKey) {
      const expectedScript = bitcoin.payments.p2tr({
        internalPubkey: xOnlyPubKeyBuffer,
        network,
      }).output;

      if (expectedScript && !expectedScript.equals(scriptPubKey)) {
        throw new Error(`Taproot input ${inputIndex} script does not match derived key`);
      }
    }

    // Ensure tapInternalKey is set for proper Taproot signing
    if (!input.tapInternalKey) {
      psbt.updateInput(inputIndex, {
        tapInternalKey: xOnlyPubKeyBuffer,
      });
    }

    // Tweak private key for Taproot key-path spend
    const tweak = bitcoin.crypto.taggedHash('TapTweak', xOnlyPubKeyBuffer);
    const tweakedPrivateKey = ecc.privateAdd(evenPrivBuffer, tweak);
    if (!tweakedPrivateKey) {
      throw new Error('Failed to tweak private key for Taproot');
    }

    // Compute tweaked public key for the signer
    const tweakedPubKey = ecc.pointFromScalar(tweakedPrivateKey, true);
    if (!tweakedPubKey) {
      throw new Error('Failed to compute tweaked public key');
    }
    const tweakedXOnlyPubKey = Buffer.from(tweakedPubKey).slice(1);

    // Create a BIP340 Schnorr signer compatible with bitcoinjs-lib's signInput
    // The Signer type requires a `sign` method, but for Taproot inputs,
    // bitcoinjs-lib internally calls `signSchnorr` instead.
    type TaprootSigner = { publicKey: Buffer; signSchnorr: (hash: Buffer) => Buffer };
    const taprootSigner: TaprootSigner = {
      publicKey: tweakedXOnlyPubKey,
      signSchnorr: (hash: Buffer): Buffer => {
        const sig = (ecc as EccWithSchnorr).signSchnorr!(hash, tweakedPrivateKey);
        return Buffer.from(sig);
      },
    };

    // Use the standard signInput API with the Schnorr signer
    // bitcoinjs-lib expects a signer with signSchnorr for taproot inputs
    psbt.signInput(inputIndex, taprootSigner as unknown as bitcoin.Signer, sighashType ? [sighashType] : undefined);

    // Attempt to finalize if requested; ignore if not yet possible
    if (finalize) {
      try {
        psbt.finalizeInput(inputIndex);
      } catch {
        /* noop */
      }
    }
  }

  /**
   * Convert a script to an address
   */
  private scriptToAddress(script: Buffer): string | null {
    try {
      return bitcoin.address.fromOutputScript(script, this.getBitcoinNetwork());
    } catch {
      return null;
    }
  }

  /**
   * Export the mnemonic phrase
   * WARNING: This exposes the seed - use with caution
   */
  exportMnemonic(): string {
    if (!this.mnemonic) {
      throw new Error('No mnemonic available');
    }
    return this.mnemonic;
  }

  /**
   * Check if the key manager is initialized
   */
  isInitialized(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Lock the wallet - clear all sensitive data from memory
   */
  lock(): void {
    // Clear master key
    if (this.masterKey) {
      // Note: We can't truly zero the memory in JS, but we can dereference
      this.masterKey = null;
    }

    // Clear mnemonic
    this.mnemonic = null;

    // Clear derived keys
    this.derivedKeys.clear();

    // Clear custom paths
    this.customPaths = {};
  }
}

