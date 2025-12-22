import { ZeldWallet } from '../ZeldWallet';
import type { AddressInfo, NetworkType, WalletEvent } from '../types';
import { UnifiedWallet } from '../unifiedWallet';
import { fetchBalances } from './balance';
import { DEFAULT_ELECTRS_URL, DEFAULT_PROVIDER, DEFAULT_ZELDHASH_API_URL } from './constants';
import { describeError, isPasswordRequiredError, isWrongPasswordError } from './errors';
import { getDirection, getStrings, resolveLocale, type LocaleKey, type LocaleStrings, type TextDirection } from './i18n';
import { createInitialState, type ComponentState } from './state';
import {
  connectExternalWallet,
  discoverWallets,
  type SupportedWalletId,
  type WalletDiscovery,
} from './wallets';

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

  private async refreshBalances(): Promise<void> {
    const addresses = this.state.addresses;
    if (!addresses || addresses.length === 0) {
      this.setState({ balance: undefined });
      return;
    }

    const addressStrings = addresses.map((a) => a.address).filter(Boolean);
    if (addressStrings.length === 0) {
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
      const result = await fetchBalances(addressStrings, this.electrsUrl, this.zeldhashApiUrl);
      this.setState({
        balance: {
          btcSats: result.btcSats,
          zeldBalance: result.zeldBalance,
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

  toggleWalletPicker(): void {
    this.refreshWalletOptions();
    this.setState({ walletPickerOpen: !this.state.walletPickerOpen });
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
        hasProvider: !!(session as any).provider,
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
      // eslint-disable-next-line no-console
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
}


