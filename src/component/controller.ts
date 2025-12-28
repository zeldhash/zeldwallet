import * as bitcoin from 'bitcoinjs-lib';
import { ZeldWallet } from '../ZeldWallet';
import type { AddressInfo, NetworkType, WalletEvent } from '../types';
import { isValidBitcoinAddress } from '../utils/validation';
import { UnifiedWallet } from '../unifiedWallet';
import { fetchBalances, type UtxoResponse } from './balance';
import { AUTO_LOCK_TIMEOUT_MS, DEFAULT_ELECTRS_URL, DEFAULT_PROVIDER, DEFAULT_ZELDHASH_API_URL } from './constants';
import { describeError, isPasswordRequiredError, isWrongPasswordError } from './errors';
import { getDirection, getStrings, resolveLocale, type LocaleKey, type LocaleStrings, type TextDirection } from './i18n';
import { createInitialHuntingState, createInitialMnemonicRestoreState, createInitialState, type ComponentState, type FeeMode, type MobileActiveTab, type OpReturnData, type ParsedTransaction, type ParsedTxInput, type ParsedTxOutput, type RecommendedFees } from './state';
import { prepareMinerArgs, type OrdinalsUtxo, type UtxoInfo } from './miner';
import {
  connectExternalWallet,
  discoverWallets,
  type SupportedWalletId,
  type WalletDiscovery,
} from './wallets';
// Types imported statically (no runtime import, compatible with Next.js/Turbopack)
import type { ZeldMiner, ZeldMinerError, ProgressStats, MineResult } from 'zeldhash-miner';

// Lazy-loaded miner module reference (loaded only when startHunting is called)
let zeldMinerModule: typeof import('zeldhash-miner') | undefined;

const BALANCE_REFRESH_INTERVAL_MS = 30_000;

export type ControllerSnapshot = {
  state: ComponentState;
  locale: LocaleKey;
  dir: TextDirection;
  strings: LocaleStrings;
  network: NetworkType;
  showPasswordWarning: boolean;
  showBackupWarning: boolean;
  readyWithSecurity: boolean;
};

type Subscriber = (snapshot: ControllerSnapshot) => void;

export type ControllerOptions = {
  lang?: string;
  network?: NetworkType;
  autoconnect?: boolean;
  electrsUrl?: string;
  zeldhashApiUrl?: string;
  onChange?: Subscriber;
};

type StoredWalletPreference = { id: SupportedWalletId; network?: NetworkType };

const LAST_WALLET_STORAGE_KEY = 'zeldwallet:lastWallet';

// Default fee rate in sats/vbyte (fallback when API is unavailable)
const DEFAULT_SATS_PER_VBYTE = 12;

// Mempool.space API for recommended fees
const MEMPOOL_FEES_API = 'https://mempool.space/api/v1/fees/recommended';

/**
 * OP_RETURN opcode
 */
const OP_RETURN = 0x6a;

/**
 * Decodes a CBOR unsigned integer from a buffer at the given offset.
 * Returns [value, bytesConsumed] or null if invalid.
 */
function decodeCborUint(data: Uint8Array, offset: number): [bigint, number] | null {
  if (offset >= data.length) return null;
  
  const initial = data[offset];
  const majorType = initial >> 5;
  
  // Must be major type 0 (unsigned integer)
  if (majorType !== 0) return null;
  
  const additionalInfo = initial & 0x1f;
  
  if (additionalInfo <= 23) {
    return [BigInt(additionalInfo), 1];
  } else if (additionalInfo === 24) {
    if (offset + 1 >= data.length) return null;
    return [BigInt(data[offset + 1]), 2];
  } else if (additionalInfo === 25) {
    if (offset + 2 >= data.length) return null;
    const value = (data[offset + 1] << 8) | data[offset + 2];
    return [BigInt(value), 3];
  } else if (additionalInfo === 26) {
    if (offset + 4 >= data.length) return null;
    const value = (data[offset + 1] << 24) | (data[offset + 2] << 16) | (data[offset + 3] << 8) | data[offset + 4];
    return [BigInt(value >>> 0), 5];
  } else if (additionalInfo === 27) {
    if (offset + 8 >= data.length) return null;
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value = (value << 8n) | BigInt(data[offset + 1 + i]);
    }
    return [value, 9];
  }
  
  return null;
}

/**
 * Attempts to decode a CBOR array of unsigned integers.
 * Returns the array of values or null if invalid.
 */
function decodeCborArray(data: Uint8Array): bigint[] | null {
  if (data.length === 0) return null;
  
  const initial = data[0];
  const majorType = initial >> 5;
  
  // Must be major type 4 (array)
  if (majorType !== 4) return null;
  
  const additionalInfo = initial & 0x1f;
  let arrayLen: number;
  let offset: number;
  
  if (additionalInfo <= 23) {
    arrayLen = additionalInfo;
    offset = 1;
  } else if (additionalInfo === 24) {
    if (data.length < 2) return null;
    arrayLen = data[1];
    offset = 2;
  } else if (additionalInfo === 25) {
    if (data.length < 3) return null;
    arrayLen = (data[1] << 8) | data[2];
    offset = 3;
  } else {
    // Larger arrays not expected in practice
    return null;
  }
  
  const values: bigint[] = [];
  for (let i = 0; i < arrayLen; i++) {
    const result = decodeCborUint(data, offset);
    if (!result) return null;
    values.push(result[0]);
    offset += result[1];
  }
  
  // Make sure we consumed exactly all the data
  if (offset !== data.length) return null;
  
  return values;
}

/**
 * Decodes a simple big-endian nonce from bytes.
 */
function decodeSimpleNonce(data: Uint8Array): bigint {
  let value = 0n;
  for (const byte of data) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/**
 * Parses an OP_RETURN script and extracts the data.
 * Returns OpReturnData or null if not a valid OP_RETURN.
 */
function parseOpReturn(script: Buffer): OpReturnData | null {
  // OP_RETURN scripts: OP_RETURN [OP_PUSHBYTES_N] [data]
  // Minimum: OP_RETURN (1 byte)
  if (script.length < 1 || script[0] !== OP_RETURN) {
    return null;
  }
  
  // Extract the data payload
  let data: Uint8Array;
  if (script.length === 1) {
    // OP_RETURN with no data
    return { type: 'nonce', nonce: 0n };
  }
  
  const pushOp = script[1];
  
  // Handle different push opcodes
  if (pushOp <= 0x4b) {
    // OP_PUSHBYTES_0 to OP_PUSHBYTES_75: direct push
    const dataLen = pushOp;
    if (script.length < 2 + dataLen) return null;
    data = new Uint8Array(script.slice(2, 2 + dataLen));
  } else if (pushOp === 0x4c) {
    // OP_PUSHDATA1
    if (script.length < 3) return null;
    const dataLen = script[2];
    if (script.length < 3 + dataLen) return null;
    data = new Uint8Array(script.slice(3, 3 + dataLen));
  } else if (pushOp === 0x4d) {
    // OP_PUSHDATA2
    if (script.length < 4) return null;
    const dataLen = script[2] | (script[3] << 8);
    if (script.length < 4 + dataLen) return null;
    data = new Uint8Array(script.slice(4, 4 + dataLen));
  } else {
    return null;
  }
  
  // Check for ZELD magic prefix (0x5a 0x45 0x4c 0x44 = "ZELD")
  const ZELD_MAGIC = [0x5a, 0x45, 0x4c, 0x44]; // "ZELD"
  
  const hasZeldPrefix = data.length >= 5 && 
      data[0] === ZELD_MAGIC[0] && 
      data[1] === ZELD_MAGIC[1] && 
      data[2] === ZELD_MAGIC[2] && 
      data[3] === ZELD_MAGIC[3];
  
  if (hasZeldPrefix) {
    // Skip the "ZELD" prefix to get to the CBOR data
    const cborData = data.slice(4);
    
    // Try to decode as CBOR array (ZELD distribution)
    // The array contains distribution amounts + nonce as last element
    const cborArray = decodeCborArray(cborData);
    if (cborArray && cborArray.length >= 1) {
      return {
        type: 'zeld',
        distribution: cborArray,
      };
    }
  }
  
  // Otherwise, treat as simple nonce (big-endian encoded)
  const nonce = decodeSimpleNonce(data);
  return {
    type: 'nonce',
    nonce,
  };
}

// GPU batch size for better throughput
const GPU_BATCH_SIZE = 65_536;
// CPU batch size
const CPU_BATCH_SIZE = 256;
// Start inside the 4-byte nonce range to avoid template rebuild churn
const DEFAULT_START_NONCE = 0n;

export class ZeldWalletController {
  private locale: LocaleKey;
  private state: ComponentState;
  private preferredNetwork: NetworkType;
  private autoconnectEnabled: boolean;
  private readonly animationDelayMs: number;
  private hasConnected = false;
  private pendingConnect?: Promise<void>;
  private providerRegistered = false;
  private listenersBound = false;
  private unsubs: Array<() => void> = [];
  private subscribers = new Set<Subscriber>();
  private initialWalletId?: SupportedWalletId;
  private initialExternalNetwork?: NetworkType;
  private electrsUrl: string;
  private zeldhashApiUrl: string;
  private balanceIntervalId?: ReturnType<typeof setInterval>;
  // Miner state
  private miner?: ZeldMiner;
  private miningAbortController?: AbortController;
  private miningRunId = 0;
  private lastMiningProgressMs = 0;
  private static readonly MIN_PROGRESS_INTERVAL_MS = 300;
  // Auto-lock idle timer
  private autoLockTimeoutId?: ReturnType<typeof setTimeout>;
  private boundActivityHandler?: () => void;

  constructor(options?: ControllerOptions) {
    const discovery: WalletDiscovery = discoverWallets();
    this.state = createInitialState(discovery.options);
    this.locale = resolveLocale(options?.lang ?? 'en');
    this.preferredNetwork = options?.network === 'testnet' ? 'testnet' : 'mainnet';
    this.autoconnectEnabled = options?.autoconnect ?? true;
    this.electrsUrl = options?.electrsUrl ?? DEFAULT_ELECTRS_URL;
    this.zeldhashApiUrl = options?.zeldhashApiUrl ?? DEFAULT_ZELDHASH_API_URL;
    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    this.animationDelayMs = isTestEnv ? 10 : 4000;
    const stored = this.loadPreferredWallet();
    if (!options?.network && stored?.network && (stored.network === 'mainnet' || stored.network === 'testnet')) {
      this.preferredNetwork = stored.network;
    }
    if (stored?.id) {
      this.initialWalletId = stored.id;
      this.initialExternalNetwork = stored.network;
      if (stored.id !== 'zeld') {
        this.state = {
          ...this.state,
          walletKind: 'external',
          activeWalletId: stored.id,
          activeWalletName: this.getWalletName(stored.id),
          externalNetwork: stored.network ?? this.state.externalNetwork,
        };
      }
    } else {
      this.initialWalletId = 'zeld';
    }
    if (options?.onChange) {
      this.subscribe(options.onChange);
    }
  }

  getSnapshot(): ControllerSnapshot {
    const strings = getStrings(this.locale);
    const dir = getDirection(this.locale);
    const isExternal = this.state.walletKind === 'external';
    const network = isExternal
      ? this.state.externalNetwork ?? this.preferredNetwork
      : ZeldWallet.isUnlocked()
        ? ZeldWallet.getNetwork()
        : this.preferredNetwork;
    const showPasswordWarning = !isExternal && this.state.status === 'ready' && this.state.hasPassword === false;
    const showBackupWarning =
      !isExternal && this.state.status === 'ready' && this.state.hasPassword === true && this.state.hasBackup === false;
    const readyWithSecurity =
      !isExternal && this.state.status === 'ready' && this.state.hasPassword === true && this.state.hasBackup === true;

    return {
      state: this.state,
      locale: this.locale,
      dir,
      strings,
      network,
      showPasswordWarning,
      showBackupWarning,
      readyWithSecurity,
    };
  }

  subscribe(listener: Subscriber): () => void {
    this.subscribers.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  setLocale(lang?: string): void {
    this.locale = resolveLocale(lang);
    this.emitChange();
  }

  setNetwork(network?: NetworkType): void {
    if (network !== 'mainnet' && network !== 'testnet') return;
    this.preferredNetwork = network;
    if (ZeldWallet.isUnlocked()) {
      void this.applyNetwork();
    } else {
      this.emitChange();
    }
  }

  setAutoconnect(value: boolean): void {
    this.autoconnectEnabled = Boolean(value);
  }

  setElectrsUrl(url?: string): void {
    this.electrsUrl = url ?? DEFAULT_ELECTRS_URL;
    void this.refreshBalances();
  }

  setZeldhashApiUrl(url?: string): void {
    this.zeldhashApiUrl = url ?? DEFAULT_ZELDHASH_API_URL;
    void this.refreshBalances();
  }

  maybeAutoconnect(): void {
    if (!this.autoconnectEnabled || this.hasConnected) return;
    const targetWallet = this.initialWalletId ?? 'zeld';
    if (targetWallet !== 'zeld') {
      this.hasConnected = true;
      void this.connectWallet(targetWallet, this.initialExternalNetwork ?? this.preferredNetwork);
      return;
    }
    void this.connect();
  }

  async connect(password?: string): Promise<void> {
    if (this.pendingConnect) {
      return this.pendingConnect;
    }
    UnifiedWallet.reset();
    this.setState({
      walletKind: 'zeld',
      activeWalletId: 'zeld',
      activeWalletName: this.getWalletName('zeld'),
      externalNetwork: undefined,
    });
    this.resetIntegrationState();
    this.hasConnected = true;
    this.initialWalletId = 'zeld';
    this.initialExternalNetwork = undefined;
    this.pendingConnect = this.bootstrap(password).finally(() => {
      this.pendingConnect = undefined;
    });
    return this.pendingConnect;
  }

  detach(): void {
    this.stopBalanceRefresh();
    this.stopAutoLockTimer();
    this.resetIntegrationState();
  }

  destroy(): void {
    this.detach();
    this.subscribers.clear();
  }

  private startBalanceRefresh(): void {
    this.stopBalanceRefresh();
    void this.refreshBalances();
    this.balanceIntervalId = setInterval(() => {
      void this.refreshBalances();
    }, BALANCE_REFRESH_INTERVAL_MS);
  }

  private stopBalanceRefresh(): void {
    if (this.balanceIntervalId) {
      clearInterval(this.balanceIntervalId);
      this.balanceIntervalId = undefined;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-lock Idle Timer
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Activity events that reset the idle timer
   */
  private static readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
    'pointerdown',
  ] as const;

  /**
   * Start the auto-lock idle timer.
   * Only active when wallet is ZeldWallet, unlocked, and has a password.
   */
  private startAutoLockTimer(): void {
    // Only for ZeldWallet with password protection
    if (this.state.walletKind !== 'zeld') return;
    if (this.state.status !== 'ready') return;
    if (!this.state.hasPassword) return;
    if (typeof window === 'undefined') return;

    this.stopAutoLockTimer();

    // Create the activity handler if not already bound
    if (!this.boundActivityHandler) {
      this.boundActivityHandler = () => this.resetAutoLockTimer();
    }

    // Add event listeners for user activity
    for (const event of ZeldWalletController.ACTIVITY_EVENTS) {
      window.addEventListener(event, this.boundActivityHandler, { passive: true });
    }

    // Start the idle timeout
    this.autoLockTimeoutId = setTimeout(() => {
      this.performAutoLock();
    }, AUTO_LOCK_TIMEOUT_MS);
  }

  /**
   * Stop the auto-lock idle timer and remove activity listeners.
   */
  private stopAutoLockTimer(): void {
    if (this.autoLockTimeoutId) {
      clearTimeout(this.autoLockTimeoutId);
      this.autoLockTimeoutId = undefined;
    }

    // Remove activity listeners
    if (this.boundActivityHandler && typeof window !== 'undefined') {
      for (const event of ZeldWalletController.ACTIVITY_EVENTS) {
        window.removeEventListener(event, this.boundActivityHandler);
      }
    }
  }

  /**
   * Reset the auto-lock timer on user activity.
   */
  private resetAutoLockTimer(): void {
    if (!this.autoLockTimeoutId) return;
    
    clearTimeout(this.autoLockTimeoutId);
    this.autoLockTimeoutId = setTimeout(() => {
      this.performAutoLock();
    }, AUTO_LOCK_TIMEOUT_MS);
  }

  /**
   * Perform the auto-lock after idle timeout.
   */
  private performAutoLock(): void {
    if (this.state.walletKind !== 'zeld') return;
    if (!ZeldWallet.isUnlocked()) return;

    this.stopAutoLockTimer();
    ZeldWallet.lock();
  }

  /**
   * Public method to notify the controller of user activity.
   * This can be called by the UI component for shadow DOM events.
   */
  notifyActivity(): void {
    this.resetAutoLockTimer();
  }

  private async refreshBalances(): Promise<void> {
    const addresses = this.state.addresses;
    if (!addresses || addresses.length === 0) {
      this.setState({ balance: undefined });
      return;
    }

    // Filter out addresses with empty address strings
    const validAddresses = addresses.filter((a) => Boolean(a.address));
    if (validAddresses.length === 0) {
      this.setState({ balance: undefined });
      return;
    }

    // Set loading state
    this.setState({
      balance: {
        btcSats: this.state.balance?.btcSats ?? 0,
        zeldBalance: this.state.balance?.zeldBalance ?? 0,
        loading: true,
        error: undefined,
      },
    });

    try {
      const result = await fetchBalances(validAddresses, this.electrsUrl, this.zeldhashApiUrl);
      this.setState({
        balance: {
          btcSats: result.btcSats,
          zeldBalance: result.zeldBalance,
          btcPaymentSats: result.btcPaymentSats,
          loading: false,
          error: undefined,
        },
      });
    } catch (error) {
      this.setState({
        balance: {
          btcSats: this.state.balance?.btcSats ?? 0,
          zeldBalance: this.state.balance?.zeldBalance ?? 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Balance fetch failed',
        },
      });
    }
  }

  private getWalletName(id: SupportedWalletId): string {
    const match = this.state.walletOptions.find((opt) => opt.id === id);
    if (match?.name) return match.name;
    if (id === 'zeld') return DEFAULT_PROVIDER.name;
    return id;
  }

  showSetPasswordForm(): void {
    this.setState({
      showSetPasswordForm: true,
      setPasswordError: undefined,
      showBackupForm: false,
      backupError: undefined,
      backupValue: undefined,
    });
  }

  hideSetPasswordForm(): void {
    this.setState({ showSetPasswordForm: false, setPasswordError: undefined });
  }

  showBackupForm(): void {
    this.setState({
      showBackupForm: true,
      backupError: undefined,
      backupValue: undefined,
      showSetPasswordForm: false,
      setPasswordError: undefined,
    });
  }

  hideBackupForm(): void {
    this.setState({ showBackupForm: false, backupError: undefined });
  }

  clearBackupResult(): void {
    this.setState({ backupValue: undefined, backupError: undefined, showBackupForm: false });
  }

  showRestoreForm(): void {
    this.setState({
      showRestoreForm: true,
      restoreMode: 'backup',
      restoreError: undefined,
      mnemonicRestoreState: createInitialMnemonicRestoreState(),
      showSetPasswordForm: false,
      setPasswordError: undefined,
      showBackupForm: false,
      backupError: undefined,
      backupValue: undefined,
    });
  }

  hideRestoreForm(): void {
    this.setState({
      showRestoreForm: false,
      restoreError: undefined,
      restoreMode: undefined,
      mnemonicRestoreState: undefined,
    });
  }

  setRestoreMode(mode: 'backup' | 'mnemonic'): void {
    this.setState({ restoreMode: mode, restoreError: undefined });
  }

  toggleRestoreAdvanced(currentValues?: {
    mnemonic: string;
    password: string;
    confirmPassword: string;
    paymentPath: string;
    ordinalsPath: string;
  }): void {
    const current = this.state.mnemonicRestoreState;
    if (!current) return;
    this.setState({
      mnemonicRestoreState: {
        ...current,
        // Preserve form values if provided
        mnemonic: currentValues?.mnemonic ?? current.mnemonic,
        password: currentValues?.password ?? current.password,
        confirmPassword: currentValues?.confirmPassword ?? current.confirmPassword,
        paymentDerivationPath: currentValues?.paymentPath || current.paymentDerivationPath,
        ordinalsDerivationPath: currentValues?.ordinalsPath || current.ordinalsDerivationPath,
        showAdvanced: !current.showAdvanced,
      },
    });
  }

  updateMnemonicRestoreState(values: {
    mnemonic?: string;
    password?: string;
    confirmPassword?: string;
    paymentPath?: string;
    ordinalsPath?: string;
  }): void {
    const current = this.state.mnemonicRestoreState;
    if (!current) return;
    this.setState({
      mnemonicRestoreState: {
        ...current,
        mnemonic: values.mnemonic ?? current.mnemonic,
        password: values.password ?? current.password,
        confirmPassword: values.confirmPassword ?? current.confirmPassword,
        paymentDerivationPath: values.paymentPath ?? current.paymentDerivationPath,
        ordinalsDerivationPath: values.ordinalsPath ?? current.ordinalsDerivationPath,
      },
    });
  }

  async handleRestore(backupString: string, backupPassword: string): Promise<void> {
    this.setState({ restoreError: undefined, status: 'recovering' });
    try {
      // Import the backup with overwrite option to replace existing wallet
      // Use the backup password as both the decryption key and the new wallet password
      await ZeldWallet.importBackup(backupString, backupPassword, backupPassword, { overwrite: true });
      // Lock the wallet so the user needs to enter the password again
      ZeldWallet.lock();
      // After successful restore, hide the form and show locked state
      this.setState({
        showRestoreForm: false,
        restoreError: undefined,
        restoreMode: undefined,
        mnemonicRestoreState: undefined,
        status: 'locked',
        hasPassword: true,
        hasBackup: true,
        addresses: undefined,
        passwordError: undefined,
      });
    } catch (error) {
      this.setState({
        restoreError: describeError(error, this.locale),
        status: this.state.addresses ? 'ready' : 'loading',
      });
      // Re-run bootstrap to reset to proper state
      await this.bootstrap();
    }
  }

  async handleMnemonicRestore(data: {
    mnemonic: string;
    password: string;
    confirmPassword: string;
    paymentPath: string;
    ordinalsPath: string;
  }): Promise<void> {
    const strings = getStrings(this.locale);
    const { mnemonic, password, confirmPassword, paymentPath, ordinalsPath } = data;

    // Validate password is provided
    if (!password || password.trim() === '') {
      this.setState({ restoreError: strings.restorePasswordRequired });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      this.setState({ restoreError: strings.restorePasswordMismatch });
      return;
    }

    // Validate mnemonic word count (12 or 24 words)
    const words = mnemonic.trim().toLowerCase().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      this.setState({ restoreError: strings.restoreMnemonicInvalid });
      return;
    }

    // Validate derivation paths format (basic check)
    const pathRegex = /^m\/\d+'\/\d+'\/\d+'\/\d+\/\d+$/;
    if (paymentPath && !pathRegex.test(paymentPath)) {
      this.setState({ restoreError: strings.restoreDerivationPathInvalid });
      return;
    }
    if (ordinalsPath && !pathRegex.test(ordinalsPath)) {
      this.setState({ restoreError: strings.restoreDerivationPathInvalid });
      return;
    }

    this.setState({ restoreError: undefined, status: 'recovering' });

    try {
      // Check if wallet exists and destroy it first
      if (await ZeldWallet.exists()) {
        await ZeldWallet.destroy();
      }

      // Prepare custom paths (use provided paths, or undefined to use defaults)
      const customPaths = (paymentPath || ordinalsPath) ? {
        payment: paymentPath || undefined,
        ordinals: ordinalsPath || undefined,
      } : undefined;

      // Restore wallet from mnemonic with custom derivation paths
      await ZeldWallet.restore(mnemonic.trim().toLowerCase(), password, undefined, customPaths);

      // Mark as backed up since user has the mnemonic
      await ZeldWallet.markBackupCompleted();

      // Lock the wallet so the user needs to enter the password again
      ZeldWallet.lock();

      // After successful restore, hide the form and show locked state
      this.setState({
        showRestoreForm: false,
        restoreError: undefined,
        restoreMode: undefined,
        mnemonicRestoreState: undefined,
        status: 'locked',
        hasPassword: true,
        hasBackup: true,
        addresses: undefined,
        passwordError: undefined,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for common mnemonic errors
      if (errorMessage.toLowerCase().includes('mnemonic') || errorMessage.toLowerCase().includes('invalid')) {
        this.setState({
          restoreError: strings.restoreMnemonicInvalid,
          status: this.state.addresses ? 'ready' : 'loading',
        });
      } else {
        this.setState({
          restoreError: describeError(error, this.locale),
          status: this.state.addresses ? 'ready' : 'loading',
        });
      }
      // Re-run bootstrap to reset to proper state
      await this.bootstrap();
    }
  }

  toggleWalletPicker(): void {
    this.refreshWalletOptions();
    this.setState({ walletPickerOpen: !this.state.walletPickerOpen });
  }

  /** Set the active tab on mobile (addresses or balances) */
  setMobileActiveTab(tab: MobileActiveTab): void {
    this.setState({ mobileActiveTab: tab });
  }

  async connectWallet(walletId: SupportedWalletId, networkOverride?: NetworkType): Promise<void> {
    if (walletId === 'zeld') {
      UnifiedWallet.reset();
      this.setState({
        walletKind: 'zeld',
        activeWalletId: 'zeld',
        activeWalletName: this.getWalletName('zeld'),
        walletPickerOpen: false,
        externalNetwork: undefined,
      });
      this.refreshWalletOptions();
      await this.connect();
      return;
    }

    this.hasConnected = true;
    this.initialWalletId = walletId;

    this.setState({
      status: 'loading',
      walletKind: 'external',
      activeWalletId: walletId,
      activeWalletName: this.getWalletName(walletId),
      walletPickerOpen: false,
      showSetPasswordForm: false,
      showBackupForm: false,
      hasBackup: undefined,
      hasPassword: undefined,
      passwordError: undefined,
      message: undefined,
      backupError: undefined,
      backupValue: undefined,
    });

    try {
      console.log('[controller.connectWallet] Connecting to external wallet:', walletId);
      const targetNetwork = networkOverride ?? this.state.externalNetwork ?? this.preferredNetwork;
      const strings = getStrings(this.locale);
      const session = await connectExternalWallet(walletId, targetNetwork, strings.walletRequestAddresses);
      console.log('[controller.connectWallet] Session created:', {
        id: session.id,
        name: session.name,
        network: session.network,
        addressCount: session.addresses.length,
        hasSignMessage: typeof session.signMessage === 'function',
        hasSignPsbt: typeof session.signPsbt === 'function',
        hasProvider: !!session.provider,
      });
      UnifiedWallet.useExternal(session);
      console.log('[controller.connectWallet] UnifiedWallet.useExternal called, isExternalActive:', UnifiedWallet.isExternalActive());
      this.setState({
        status: 'ready',
        addresses: session.addresses,
        walletKind: 'external',
        activeWalletId: walletId,
        activeWalletName: session.name,
        externalNetwork: session.network,
        message: undefined,
        showSetPasswordForm: false,
        showBackupForm: false,
        hasBackup: undefined,
        hasPassword: undefined,
        passwordError: undefined,
      });
      this.initialExternalNetwork = session.network;
      this.persistPreferredWallet(walletId, session.network);
      this.startBalanceRefresh();
      // Fetch recommended fees when wallet is ready
      void this.fetchRecommendedFees();
    } catch (error) {
      console.error('[controller.connectWallet] Error connecting:', error);
      UnifiedWallet.reset();
      this.setError(error);
    } finally {
      this.refreshWalletOptions();
    }
  }

  async handleSetPassword(password: string, confirmPassword?: string): Promise<void> {
    if (password !== confirmPassword) {
      this.setState({ setPasswordError: getStrings(this.locale).passwordMismatch });
      return;
    }
    this.setState({ setPasswordError: undefined });
    try {
      await ZeldWallet.setPassword(password);
      ZeldWallet.lock();
      this.setState({
        hasPassword: true,
        showSetPasswordForm: false,
        passwordError: undefined,
        status: 'locked',
        message: undefined,
        addresses: undefined,
        hasBackup: false,
        showBackupForm: false,
        backupError: undefined,
        backupValue: undefined,
      });
    } catch (error) {
      this.setState({ setPasswordError: describeError(error, this.locale) });
    }
  }

  async handleExportBackup(walletPassword: string): Promise<void> {
    this.setState({ backupError: undefined });
    try {
      const backupValue = await ZeldWallet.exportBackup(walletPassword);
      this.setState({
        hasBackup: true,
        showBackupForm: false,
        backupError: undefined,
        backupValue,
      });
    } catch (error) {
      this.setState({ backupError: describeError(error, this.locale) });
    }
  }

  private emitChange(): void {
    const snapshot = this.getSnapshot();
    for (const subscriber of this.subscribers) {
      subscriber(snapshot);
    }
  }

  private setState(next: Partial<ComponentState>): void {
    this.state = { ...this.state, ...next };
    this.emitChange();
  }

  private refreshWalletOptions(): void {
    const discovery = discoverWallets();
    this.setState({ walletOptions: discovery.options });
  }

  private resetIntegrationState(): void {
    this.unregisterProvider();
    this.teardownListeners();
    this.providerRegistered = false;
  }

  private async bootstrap(password?: string): Promise<void> {
    this.setState({
      status: 'loading',
      message: undefined,
      passwordError: undefined,
      showBackupForm: false,
      backupError: undefined,
      backupValue: undefined,
    });

    try {
      const exists = await ZeldWallet.exists();
      if (exists) {
        // Show recovering animation when wallet exists and no password is provided yet
        if (!password) {
          this.setState({ status: 'recovering' });
        }
        try {
          await ZeldWallet.unlock(password);
          // If unlock succeeded without password, show recovery animation for a few seconds
          if (!password) {
            await this.delay(this.animationDelayMs);
          }
        } catch (error) {
          if (isPasswordRequiredError(error, this.locale) && !password) {
            this.setState({
              status: 'locked',
              addresses: undefined,
              message: undefined,
              showBackupForm: false,
              backupError: undefined,
              backupValue: undefined,
              hasBackup: undefined,
            });
            return;
          }
          if (isWrongPasswordError(error, this.locale)) {
            const strings = getStrings(this.locale);
            this.setState({
              status: 'locked',
              addresses: undefined,
              passwordError: strings.wrongPassword,
              showBackupForm: false,
              backupError: undefined,
              backupValue: undefined,
              hasBackup: undefined,
            });
            return;
          }
          throw error;
        }
      } else {
        // Show generating state with animation for new wallet creation
        this.setState({ status: 'generating' });
        await ZeldWallet.create();
        // Keep the generating animation visible for a few seconds
        await this.delay(this.animationDelayMs);
      }

      await this.applyNetwork();
      this.registerProvider();
      this.bindListeners();
      this.refreshAddresses();
      this.refreshWalletOptions();
      const [hasPassword, hasBackup] = await Promise.all([ZeldWallet.hasPassword(), this.getBackupStatus()]);

      this.setState({
        status: 'ready',
        message: undefined,
        passwordError: undefined,
        hasPassword,
        showSetPasswordForm: false,
        setPasswordError: undefined,
        hasBackup,
        showBackupForm: false,
        backupError: undefined,
        backupValue: undefined,
        walletKind: 'zeld',
        activeWalletId: 'zeld',
        activeWalletName: this.getWalletName('zeld'),
        externalNetwork: undefined,
      });
      this.persistPreferredWallet('zeld', this.preferredNetwork);
      this.startBalanceRefresh();
      // Start auto-lock timer if password is set
      if (hasPassword) {
        this.startAutoLockTimer();
      }
      // Fetch recommended fees when wallet is ready
      void this.fetchRecommendedFees();
    } catch (error) {
      this.resetIntegrationState();
      this.setError(error);
    }
  }

  private async applyNetwork(): Promise<void> {
    if (!ZeldWallet.isUnlocked()) return;
    const desired = this.preferredNetwork;
    if (!desired || ZeldWallet.getNetwork() === desired) return;
    await ZeldWallet.setNetwork(desired);
    this.emitChange();
  }

  private registerProvider(): void {
    if (this.providerRegistered) return;
    if (typeof window === 'undefined') {
      return;
    }
    try {
      ZeldWallet.registerProvider(DEFAULT_PROVIDER);
      this.providerRegistered = true;
    } catch (error) {
      console.warn('[ZeldWalletController] Failed to register WBIP provider', error);
      throw error;
    }
  }

  private unregisterProvider(): void {
    if (!this.providerRegistered) return;
    if (typeof window === 'undefined') return;
    try {
      ZeldWallet.unregisterProvider(DEFAULT_PROVIDER.id);
    } catch {
      // best-effort cleanup
    }
    this.providerRegistered = false;
  }

  private bindListeners(): void {
    if (this.listenersBound) return;
    const handlers: Array<[WalletEvent, (data: unknown) => void]> = [
      [
        'lock',
        () => {
          if (this.state.walletKind !== 'zeld') return;
          this.stopBalanceRefresh();
          this.stopAutoLockTimer();
          this.unregisterProvider();
          this.setState({
            status: 'locked',
            addresses: undefined,
            message: undefined,
            showSetPasswordForm: false,
            showBackupForm: false,
            backupError: undefined,
            backupValue: undefined,
            balance: undefined,
          });
        },
      ],
      [
        'unlock',
        () => {
          if (this.state.walletKind !== 'zeld') return;
          void (async () => {
            this.refreshAddresses();
            const [hasPassword, hasBackup] = await Promise.all([ZeldWallet.hasPassword(), this.getBackupStatus()]);
            this.setState({
              status: 'ready',
              message: undefined,
              passwordError: undefined,
              hasPassword,
              hasBackup,
              showSetPasswordForm: false,
              showBackupForm: false,
              backupError: undefined,
            });
            this.startBalanceRefresh();
            // Start auto-lock timer if password is set
            if (hasPassword) {
              this.startAutoLockTimer();
            }
          })();
        },
      ],
      [
        'accountsChanged',
        (addresses) => {
          if (this.state.walletKind !== 'zeld') return;
          this.setState({ addresses: (addresses as AddressInfo[]) ?? [] });
        },
      ],
      [
        'networkChanged',
        () => {
          if (this.state.walletKind !== 'zeld') return;
          this.emitChange();
        },
      ],
    ];

    for (const [event, handler] of handlers) {
      ZeldWallet.on(event, handler);
      this.unsubs.push(() => ZeldWallet.off(event, handler));
    }

    this.listenersBound = true;
  }

  private teardownListeners(): void {
    for (const off of this.unsubs) {
      try {
        off();
      } catch {
        // ignore teardown failures
      }
    }
    this.unsubs = [];
    this.listenersBound = false;
  }

  private async refreshAddresses(): Promise<void> {
    if (this.state.walletKind !== 'zeld') return;
    if (!ZeldWallet.isUnlocked()) return;
    const addresses = ZeldWallet.getAddresses(['payment', 'ordinals']);
    this.setState({ addresses });
  }

  private async getBackupStatus(): Promise<boolean> {
    if (!ZeldWallet.isUnlocked()) return false;
    try {
      return await ZeldWallet.hasBackup();
    } catch {
      return false;
    }
  }

  private setError(error: unknown): void {
    const message = describeError(error, this.locale);
    this.setState({
      status: 'error',
      message,
      addresses: undefined,
      showBackupForm: false,
      backupError: undefined,
      backupValue: undefined,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loadPreferredWallet(): StoredWalletPreference | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem(LAST_WALLET_STORAGE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Partial<StoredWalletPreference> | null;
      const allowed: SupportedWalletId[] = ['zeld', 'xverse', 'leather', 'magicEden'];
      if (!parsed?.id || !allowed.includes(parsed.id)) return undefined;
      const network = parsed.network === 'testnet' || parsed.network === 'mainnet' ? parsed.network : undefined;
      return { id: parsed.id, network };
    } catch {
      return undefined;
    }
  }

  private persistPreferredWallet(id: SupportedWalletId, network?: NetworkType): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload: StoredWalletPreference = { id, network };
      localStorage.setItem(LAST_WALLET_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore persistence failures to avoid blocking the UX.
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Hunting section methods
  // ─────────────────────────────────────────────────────────────────────────────

  setHuntingSendBtc(checked: boolean): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        sendBtcChecked: checked,
        // Mutual exclusivity: uncheck sendZeld if sendBtc is checked
        sendZeldChecked: checked ? false : hunting.sendZeldChecked,
        // Clear fields when unchecking
        ...(checked ? {} : { recipientAddress: '', amount: '', addressError: undefined, amountError: undefined }),
      },
    });
  }

  setHuntingSendZeld(checked: boolean): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        sendZeldChecked: checked,
        // Mutual exclusivity: uncheck sendBtc if sendZeld is checked
        sendBtcChecked: checked ? false : hunting.sendBtcChecked,
        // Clear fields when unchecking
        ...(checked ? {} : { recipientAddress: '', amount: '', addressError: undefined, amountError: undefined }),
      },
    });
  }

  setHuntingZeroCount(value: number): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    const clamped = Math.min(10, Math.max(6, value));
    this.setState({
      hunting: {
        ...hunting,
        zeroCount: clamped,
      },
    });
  }

  setHuntingUseGpu(checked: boolean): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        useGpu: checked,
      },
    });
  }

  setHuntingFeeMode(mode: FeeMode): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        feeMode: mode,
      },
    });
  }

  setHuntingCustomFeeRate(value: string): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        customFeeRate: value,
      },
    });
  }

  toggleHuntingFeeExpanded(): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({
      hunting: {
        ...hunting,
        feeExpanded: !hunting.feeExpanded,
      },
    });
  }

  /**
   * Gets the current fee rate based on the selected mode.
   */
  private getCurrentFeeRate(): number {
    const hunting = this.state.hunting;
    if (!hunting) return DEFAULT_SATS_PER_VBYTE;

    const { feeMode, customFeeRate, recommendedFees } = hunting;

    if (feeMode === 'custom') {
      const parsed = parseFloat(customFeeRate.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
      return DEFAULT_SATS_PER_VBYTE;
    }

    if (recommendedFees) {
      switch (feeMode) {
        case 'slow':
          return recommendedFees.slow;
        case 'fast':
          return recommendedFees.fast;
        case 'medium':
        default:
          return recommendedFees.medium;
      }
    }

    return DEFAULT_SATS_PER_VBYTE;
  }

  /**
   * Fetches recommended fees from mempool.space API.
   */
  async fetchRecommendedFees(): Promise<void> {
    this.setHuntingState({ feeLoading: true, feeError: undefined });

    try {
      const response = await fetch(MEMPOOL_FEES_API);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      // mempool.space returns: { fastestFee, halfHourFee, hourFee, economyFee, minimumFee }
      const recommendedFees: RecommendedFees = {
        slow: data.hourFee ?? data.economyFee ?? DEFAULT_SATS_PER_VBYTE,
        medium: data.halfHourFee ?? DEFAULT_SATS_PER_VBYTE,
        fast: data.fastestFee ?? DEFAULT_SATS_PER_VBYTE,
      };
      this.setHuntingState({
        recommendedFees,
        feeLoading: false,
        feeError: undefined,
      });
    } catch (error) {
      console.warn('[ZeldWalletController] Failed to fetch recommended fees:', error);
      // Set default fallback fees
      this.setHuntingState({
        recommendedFees: {
          slow: Math.round(DEFAULT_SATS_PER_VBYTE * 0.5),
          medium: DEFAULT_SATS_PER_VBYTE,
          fast: Math.round(DEFAULT_SATS_PER_VBYTE * 2),
        },
        feeLoading: false,
        feeError: error instanceof Error ? error.message : 'Failed to fetch fees',
      });
    }
  }

  setHuntingAddress(value: string): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    const network = this.getSnapshot().network;
    
    // Validate address
    let addressError: string | undefined;
    if (value.trim() && !isValidBitcoinAddress(value.trim(), network)) {
      addressError = getStrings(this.locale).huntingDisabledInvalidAddress;
    }

    this.setState({
      hunting: {
        ...hunting,
        recipientAddress: value,
        addressError,
      },
    });
  }

  setHuntingAmount(value: string): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    
    // Validate amount
    let amountError: string | undefined;
    if (value.trim()) {
      const num = parseFloat(value.trim());
      if (isNaN(num) || num <= 0) {
        amountError = getStrings(this.locale).huntingDisabledInvalidAmount;
      }
    }

    this.setState({
      hunting: {
        ...hunting,
        amount: value,
        amountError,
      },
    });
  }

  /**
   * Starts the hunting process using zeldhash-miner.
   */
  async startHunting(): Promise<void> {
    const runId = ++this.miningRunId;
    console.log('[ZeldWalletController] startHunting invoked, runId=', runId);
    this.lastMiningProgressMs = 0;
    const hunting = this.state.hunting;
    if (!hunting || hunting.miningStatus !== 'idle') {
      console.warn('[ZeldWalletController] Cannot start hunting - invalid state');
      return;
    }

    const addresses = this.state.addresses ?? [];
    const paymentAddr = addresses.find((a) => a.purpose === 'payment');
    const ordinalsAddr = addresses.find((a) => a.purpose === 'ordinals');

    if (!paymentAddr?.address || !ordinalsAddr?.address) {
      console.warn('[ZeldWalletController] Missing payment or ordinals address');
      return;
    }

    const strings = getStrings(this.locale);
    const network = this.getSnapshot().network;

    const trimmedAddress = hunting.recipientAddress.trim();
    const trimmedAmount = hunting.amount.trim();
    const parsedAmount = trimmedAmount ? parseFloat(trimmedAmount) : NaN;

    // Simplified validation - only check input format, let zeldhash-miner handle balance errors
    let pendingBtcAmountSats: number | undefined;
    let pendingZeldAmount: number | undefined;

    if (hunting.sendBtcChecked) {
      // Validate address format
      if (!trimmedAddress || !isValidBitcoinAddress(trimmedAddress, network)) {
        this.setMiningError(strings.huntingDisabledInvalidAddress);
        return;
      }
      // Validate amount format
      if (!trimmedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        this.setMiningError(strings.huntingDisabledInvalidAmount);
        return;
      }
      pendingBtcAmountSats = Math.round(parsedAmount * 100_000_000);
    } else if (hunting.sendZeldChecked) {
      // Validate address format
      if (!trimmedAddress || !isValidBitcoinAddress(trimmedAddress, network)) {
        this.setMiningError(strings.huntingDisabledInvalidAddress);
        return;
      }
      // Validate amount format
      if (!trimmedAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        this.setMiningError(strings.huntingDisabledInvalidAmount);
        return;
      }
      pendingZeldAmount = Math.round(parsedAmount * 100_000_000);
    }

    // Set mining status
    this.setHuntingState({ miningStatus: 'mining', miningError: undefined, miningResult: undefined, broadcastTxid: undefined });

    try {
      // Fetch UTXOs with their ZELD balances so we can filter out ZELD-bearing inputs when needed
      const [paymentUtxosWithZeld, ordinalsUtxosWithZeld] = await Promise.all([
        this.fetchUtxosWithZeldBalances(paymentAddr.address),
        this.fetchOrdinalsUtxosWithZeld(ordinalsAddr.address),
      ]);

      // When not sending ZELD, never include inputs that hold a positive ZELD balance
      let paymentUtxos: OrdinalsUtxo[] = paymentUtxosWithZeld;
      let ordinalsUtxos: OrdinalsUtxo[] = ordinalsUtxosWithZeld;
      if (!hunting.sendZeldChecked) {
        const filterZeldFree = <T extends { zeldBalance?: number }>(utxos: T[]): T[] =>
          utxos.filter((u) => (u.zeldBalance ?? 0) <= 0);

        paymentUtxos = filterZeldFree(paymentUtxosWithZeld) as OrdinalsUtxo[];
        ordinalsUtxos = filterZeldFree(ordinalsUtxosWithZeld) as OrdinalsUtxo[];

        // If we filtered everything out, we cannot proceed without risking ZELD spend.
        if (paymentUtxos.length === 0) {
          this.setMiningError(strings.huntingDisabledInsufficientBtc);
          return;
        }
      }

      // If user stopped while we were preparing, abort early
      if (runId !== this.miningRunId) {
        console.log('[ZeldWalletController] startHunting aborted after fetch (stale run)', { runId, current: this.miningRunId });
        return;
      }

      // Build optional outputs
      let btcOutput: { address: string; amount: number } | undefined;
      let zeldOutput: { address: string; amount: number } | undefined;

      if (pendingBtcAmountSats !== undefined) {
        btcOutput = { address: trimmedAddress, amount: pendingBtcAmountSats };
      }
      if (pendingZeldAmount !== undefined) {
        zeldOutput = { address: trimmedAddress, amount: pendingZeldAmount };
      }

      // Prepare miner arguments
      const minerArgs = prepareMinerArgs(
        paymentAddr.address,
        paymentUtxos as UtxoInfo[],
        ordinalsAddr.address,
        ordinalsUtxos,
        hunting.zeroCount,
        hunting.useGpu,
        btcOutput,
        zeldOutput,
        network
      );

      // Store ZELD balances for inputs so we can display them in the confirmation dialog
      // Build a map of "txid:vout" -> zeldBalance from the ordinalsUtxos
      const inputUtxoZeldBalances: Record<string, number> = {};
      for (const utxo of ordinalsUtxos) {
        if (utxo.zeldBalance > 0) {
          inputUtxoZeldBalances[`${utxo.txid}:${utxo.vout}`] = utxo.zeldBalance;
        }
      }
      this.setHuntingState({ inputUtxoZeldBalances });

      // Lazy-load zeldhash-miner module (avoids Worker initialization at import time)
      // This is required for Next.js/Turbopack compatibility
      if (!zeldMinerModule) {
        zeldMinerModule = await import('zeldhash-miner');
      }
      const { ZeldMiner: MinerClass } = zeldMinerModule;

      // Create miner instance
      const batchSize = hunting.useGpu ? GPU_BATCH_SIZE : CPU_BATCH_SIZE;
      const feeRate = this.getCurrentFeeRate();
      this.miner = new MinerClass({
        network: network === 'mainnet' ? 'mainnet' : 'testnet',
        batchSize,
        useWebGPU: hunting.useGpu,
        workerThreads: Math.max(1, navigator.hardwareConcurrency || 4),
        satsPerVbyte: feeRate,
      });

      // Create abort controller
      this.miningAbortController = new AbortController();

      // If a new run was started/stopped before reaching this point, abort
      if (runId !== this.miningRunId) {
        console.log('[ZeldWalletController] startHunting aborting miner init (stale run)', { runId, current: this.miningRunId });
        this.miningAbortController.abort();
        return;
      }

      // Set up event handlers
      this.miner.on('progress', (stats: ProgressStats) => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - this.lastMiningProgressMs < ZeldWalletController.MIN_PROGRESS_INTERVAL_MS) {
          return;
        }
        this.lastMiningProgressMs = now;
        this.setHuntingState({
          miningStats: {
            hashRate: stats.hashRate,
            hashesProcessed: stats.hashesProcessed,
            elapsedMs: stats.elapsedMs ?? 0,
          },
        });
      });

      this.miner.on('found', (result: MineResult) => {
        this.setHuntingState({
          miningStatus: 'found',
          miningResult: {
            txid: result.txid,
            psbt: result.psbt,
            nonce: result.nonce,
            attempts: result.attempts,
            duration: result.duration,
          },
        });
      });

      this.miner.on('error', (err: ZeldMinerError) => {
        console.error('[ZeldWalletController] Mining error event:', err.code, err.message, err);
        if (zeldMinerModule && err.code === zeldMinerModule.ZeldMinerErrorCode.MINING_ABORTED) {
          // User stopped mining, don't show as error
          return;
        }
        this.setMiningError(err.message);
      });

      this.miner.on('stopped', () => {
        console.log('[ZeldWalletController] miner stopped event', { status: this.state.hunting?.miningStatus });
        if (this.state.hunting?.miningStatus === 'mining') {
          this.setHuntingState({ miningStatus: 'idle' });
        }
      });

      // Start mining
      console.log('[ZeldWalletController] Starting mineTransaction with args:', {
        inputs: minerArgs.inputs,
        outputs: minerArgs.outputs,
        targetZeros: minerArgs.targetZeros,
        distribution: minerArgs.distribution,
      });
      await this.miner.mineTransaction({
        inputs: minerArgs.inputs,
        outputs: minerArgs.outputs,
        targetZeros: minerArgs.targetZeros,
        startNonce: DEFAULT_START_NONCE,
        distribution: minerArgs.distribution,
        signal: this.miningAbortController.signal,
      });
    } catch (error) {
      console.error('[ZeldWalletController] Mining catch error:', error);
      // Check if this is an aborted mining error (user stopped)
      if (zeldMinerModule) {
        const { ZeldMinerError: MinerErrorClass, ZeldMinerErrorCode } = zeldMinerModule;
        if (error instanceof MinerErrorClass && error.code === ZeldMinerErrorCode.MINING_ABORTED) {
          // User stopped mining
          console.log('[ZeldWalletController] Mining aborted by user');
          return;
        }
      }
      const message = error instanceof Error ? error.message : 'Mining failed';
      this.setMiningError(message);
    }
  }

  /**
   * Pauses the current mining session.
   */
  pauseMining(): void {
    if (this.miner && this.state.hunting?.miningStatus === 'mining') {
      this.miner.pause();
      this.setHuntingState({ miningStatus: 'paused' });
    }
  }

  /**
   * Resumes a paused mining session.
   */
  async resumeMining(): Promise<void> {
    if (this.miner && this.state.hunting?.miningStatus === 'paused') {
      this.setHuntingState({ miningStatus: 'mining' });
      await this.miner.resume();
    }
  }

  /**
   * Stops the current mining session.
   */
  stopMining(): void {
    console.log('[ZeldWalletController] stopMining called', {
      hasMiner: Boolean(this.miner),
      hasAbort: Boolean(this.miningAbortController),
      currentRunId: this.miningRunId,
    });
    // Invalidate any in-flight startHunting run
    this.miningRunId += 1;
    if (this.miningAbortController) {
      console.log('[ZeldWalletController] aborting miningAbortController');
      this.miningAbortController.abort();
    }
    if (this.miner) {
      console.log('[ZeldWalletController] stopping miner instance');
      this.miner.stop();
    }
    this.setHuntingState({ miningStatus: 'idle', miningStats: undefined });
  }

  /**
   * Parses the PSBT and shows the confirmation dialog.
   * The actual signing happens when user confirms.
   */
  async signAndBroadcast(): Promise<void> {
    const hunting = this.state.hunting;
    if (!hunting?.miningResult?.psbt) {
      console.warn('[ZeldWalletController] No PSBT to sign');
      return;
    }

    try {
      // Parse PSBT to extract transaction details for confirmation
      const parsedTx = this.parsePsbtForConfirmation(hunting.miningResult.psbt);
      
      // Show confirmation dialog
      this.setHuntingState({
        showConfirmDialog: true,
        parsedTransaction: parsedTx,
      });
    } catch (error) {
      console.error('[signAndBroadcast] Error parsing PSBT:', error);
      const strings = getStrings(this.locale);
      const message = error instanceof Error ? error.message : strings.error;
      this.setMiningError(message);
    }
  }

  /**
   * Called when user confirms the transaction in the confirmation dialog.
   */
  async confirmTransaction(): Promise<void> {
    const hunting = this.state.hunting;
    if (!hunting?.miningResult?.psbt) {
      console.warn('[ZeldWalletController] No PSBT to sign');
      return;
    }

    // Hide confirmation dialog and set signing status
    this.setHuntingState({ 
      showConfirmDialog: false, 
      parsedTransaction: undefined,
      miningStatus: 'signing' 
    });

    try {
      // Parse PSBT to determine inputs and their addresses
      const network = this.getSnapshot().network;
      const btcNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
      const psbt = bitcoin.Psbt.fromBase64(hunting.miningResult.psbt);
      const inputCount = psbt.data.inputs.length;

      // Get our addresses to match inputs
      const addresses = this.state.addresses ?? [];
      const paymentAddr = addresses.find((a) => a.purpose === 'payment')?.address;
      const ordinalsAddr = addresses.find((a) => a.purpose === 'ordinals')?.address;
      
      console.log('[confirmTransaction] Our addresses:', { paymentAddr, ordinalsAddr });

      // Build sign inputs array with addresses extracted from PSBT witness UTXOs
      const signInputs: Array<{ index: number; address: string }> = [];
      for (let i = 0; i < inputCount; i++) {
        const input = psbt.data.inputs[i];
        let inputAddress: string | undefined;

        // Extract address from witnessUtxo's scriptPubKey
        if (input.witnessUtxo?.script) {
          try {
            inputAddress = bitcoin.address.fromOutputScript(input.witnessUtxo.script, btcNetwork);
          } catch (err) {
            console.warn(`[confirmTransaction] Could not extract address from input ${i}:`, err);
          }
        }

        // Fallback: try to match with our known addresses
        if (!inputAddress) {
          // If we can't determine the address, use payment address as fallback
          inputAddress = paymentAddr;
        }

        if (inputAddress) {
          signInputs.push({ index: i, address: inputAddress });
          console.log(`[confirmTransaction] Input ${i} belongs to address: ${inputAddress}`);
        } else {
          console.warn(`[confirmTransaction] Could not determine address for input ${i}`);
        }
      }

      if (signInputs.length === 0) {
        throw new Error('Could not determine addresses for any PSBT inputs');
      }

      console.log('[confirmTransaction] Signing PSBT with inputs:', signInputs);

      // Sign the PSBT using UnifiedWallet
      const signedPsbt = await UnifiedWallet.signPsbt(hunting.miningResult.psbt, signInputs);
      
      console.log('[confirmTransaction] PSBT signed successfully');
      
      // Extract the transaction from the signed PSBT and broadcast
      const txHex = this.finalizePsbt(signedPsbt);
      const txid = await this.broadcastTransaction(txHex);

      this.setHuntingState({
        miningStatus: 'broadcast',
        broadcastTxid: txid,
      });

      // Refresh balances after broadcast
      void this.refreshBalances();
    } catch (error) {
      console.error('[confirmTransaction] Error:', error);
      
      // Check if user cancelled the signing - in that case, go back to 'found' state
      // so they can try again without losing their mined result
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as Error & { code?: string | number })?.code;
      const isUserCancelled = 
        errorCode === 'user-cancelled-signing' ||
        errorCode === 'user-cancelled' ||
        errorCode === 4001 || // WBIP USER_REJECTED
        errorMessage.toLowerCase().includes('cancel') ||
        errorMessage.toLowerCase().includes('rejected') ||
        errorMessage.toLowerCase().includes('denied');
      
      if (isUserCancelled) {
        console.log('[confirmTransaction] User cancelled signing, returning to found state');
        this.setHuntingState({ miningStatus: 'found' });
      } else {
        const strings = getStrings(this.locale);
        const message = error instanceof Error ? error.message : strings.error;
        this.setMiningError(message);
      }
    }
  }

  /**
   * Called when user cancels the confirmation dialog.
   */
  cancelConfirmation(): void {
    this.setHuntingState({
      showConfirmDialog: false,
      parsedTransaction: undefined,
    });
  }

  /**
   * Parses a PSBT and extracts inputs/outputs for the confirmation dialog.
   */
  private parsePsbtForConfirmation(psbtBase64: string): ParsedTransaction {
    const network = this.getSnapshot().network;
    const btcNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

    // Get our addresses to identify change outputs
    const addresses = this.state.addresses ?? [];
    const ourAddresses = new Set(addresses.map((a) => a.address).filter(Boolean));

    // Get ZELD balances map for inputs
    const inputUtxoZeldBalances = this.state.hunting?.inputUtxoZeldBalances ?? {};

    // Parse inputs
    const inputs: ParsedTxInput[] = [];
    let totalInputValue = 0;

    for (let i = 0; i < psbt.data.inputs.length; i++) {
      const input = psbt.data.inputs[i];
      const txInput = psbt.txInputs[i];
      let inputAddress = '';
      let inputValue = 0;

      // Extract address and value from witnessUtxo
      if (input.witnessUtxo) {
        inputValue = input.witnessUtxo.value;
        try {
          inputAddress = bitcoin.address.fromOutputScript(input.witnessUtxo.script, btcNetwork);
        } catch {
          inputAddress = 'Unknown';
        }
      }

      // Get the txid for this input
      const inputTxid = Buffer.from(txInput.hash).reverse().toString('hex');
      const inputVout = txInput.index;
      
      // Look up ZELD balance from stored map
      const zeldBalance = inputUtxoZeldBalances[`${inputTxid}:${inputVout}`];

      totalInputValue += inputValue;
      inputs.push({
        txid: inputTxid,
        vout: inputVout,
        address: inputAddress,
        value: inputValue,
        zeldBalance,
      });
    }

    // Parse outputs
    const outputs: ParsedTxOutput[] = [];
    let totalOutputValue = 0;

    for (const txOutput of psbt.txOutputs) {
      let outputAddress = '';
      let opReturn: OpReturnData | undefined;
      
      // Check if this is an OP_RETURN output
      const opReturnData = parseOpReturn(txOutput.script);
      if (opReturnData) {
        opReturn = opReturnData;
        outputAddress = 'OP_RETURN';
      } else {
        try {
          outputAddress = bitcoin.address.fromOutputScript(txOutput.script, btcNetwork);
        } catch {
          outputAddress = 'Unknown';
        }
      }

      const isChange = ourAddresses.has(outputAddress);
      totalOutputValue += txOutput.value;

      outputs.push({
        address: outputAddress,
        value: txOutput.value,
        isChange,
        opReturn,
      });
    }

    const fee = totalInputValue - totalOutputValue;

    return {
      inputs,
      outputs,
      fee,
      totalInputValue,
      totalOutputValue,
    };
  }

  /**
   * Cancels the current mining result and returns to idle state.
   */
  cancelMining(): void {
    this.stopMining();
    this.setHuntingState({
      miningStatus: 'idle',
      miningStats: undefined,
      miningResult: undefined,
      miningError: undefined,
      broadcastTxid: undefined,
    });
  }

  /**
   * Retries mining after an error.
   */
  retryMining(): void {
    this.setHuntingState({
      miningStatus: 'idle',
      miningError: undefined,
    });
    void this.startHunting();
  }

  private setHuntingState(partial: Partial<NonNullable<ComponentState['hunting']>>): void {
    const hunting = this.state.hunting ?? createInitialHuntingState();
    this.setState({ hunting: { ...hunting, ...partial } });
  }

  private setMiningError(message: string): void {
    this.setHuntingState({
      miningStatus: 'error',
      miningError: message,
    });
  }

  /**
   * Finalizes a signed PSBT and returns the raw transaction hex.
   */
  private finalizePsbt(signedPsbtBase64: string): string {
    // The signed PSBT should already be finalized by the wallet
    // We just need to extract the transaction
    const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64);
    
    // Try to finalize if not already finalized
    try {
      psbt.finalizeAllInputs();
    } catch {
      // Already finalized, ignore
    }
    
    return psbt.extractTransaction().toHex();
  }

  /**
   * Broadcasts a raw transaction to the network.
   */
  private async broadcastTransaction(txHex: string): Promise<string> {
    const url = `${this.electrsUrl.replace(/\/$/, '')}/tx`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Broadcast failed: ${errorText}`);
    }

    return await response.text(); // Returns the txid
  }

  /**
   * Fetches UTXOs for a single address.
   */
  private async fetchUtxosForAddress(address: string): Promise<UtxoResponse[]> {
    try {
      const url = `${this.electrsUrl.replace(/\/$/, '')}/address/${address}/utxo`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[ZeldWalletController] Failed to fetch UTXOs for ${address}: ${response.status}`);
        return [];
      }
      return await response.json();
    } catch (error) {
      console.warn(`[ZeldWalletController] Error fetching UTXOs for ${address}:`, error);
      return [];
    }
  }

  /**
   * Fetches UTXOs for an address and annotates them with their ZELD balances.
   */
  private async fetchUtxosWithZeldBalances(address: string): Promise<OrdinalsUtxo[]> {
    const utxos = await this.fetchUtxosForAddress(address);

    const confirmedOutpoints = utxos
      .filter((u) => u.status.confirmed)
      .map((u) => `${u.txid}:${u.vout}`);

    if (confirmedOutpoints.length === 0) {
      // No confirmed UTXOs; return zero ZELD balances.
      return utxos.map((u) => ({ ...u, zeldBalance: 0 }));
    }

    const url = `${this.zeldhashApiUrl.replace(/\/$/, '')}/utxos`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utxos: confirmedOutpoints }),
      });

      if (!response.ok) {
        console.warn(`[ZeldWalletController] Failed to fetch ZELD balances for ${address}: ${response.status}`);
        return utxos.map((u) => ({ ...u, zeldBalance: 0 }));
      }

      const balances: Array<{ txid: string; vout: number; balance: number }> = await response.json();
      const balanceMap = new Map<string, number>(
        balances.map((b) => [`${b.txid}:${b.vout}`, b.balance ?? 0])
      );

      return utxos.map((u) => ({
        ...u,
        zeldBalance: balanceMap.get(`${u.txid}:${u.vout}`) ?? 0,
      }));
    } catch (error) {
      console.warn(`[ZeldWalletController] Error fetching ZELD balances for ${address}:`, error);
      return utxos.map((u) => ({ ...u, zeldBalance: 0 }));
    }
  }

  /**
   * Fetches ordinals UTXOs and enriches them with ZELD balances from the ZeldHash API.
   */
  private async fetchOrdinalsUtxosWithZeld(address: string): Promise<OrdinalsUtxo[]> {
    return this.fetchUtxosWithZeldBalances(address);
  }
}


