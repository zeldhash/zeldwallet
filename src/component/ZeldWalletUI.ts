import type { NetworkType } from '../types';
import {
  bindBackupActions,
  bindCopyButtons,
  bindHunting,
  bindMobileTabs,
  bindPasswordForm,
  bindPasswordVisibility,
  bindRestoreActions,
  bindSetPasswordActions,
  bindWalletSwitcher,
} from './bindings';
import { BaseElement, DEFAULT_TAG_NAME } from './constants';
import { ZeldWalletController, type ControllerSnapshot } from './controller';
import { buildTemplate } from './render';
import type { SupportedWalletId } from './wallets';

export class ZeldWalletUI extends BaseElement {
  private controller: ZeldWalletController;
  private snapshot: ControllerSnapshot;
  private unsubscribe?: () => void;
  private shadowRootRef?: ShadowRoot;
  private initialVariant: string | null = null;
  private variantApplied = false;
  private boundActivityHandler?: () => void;

  /**
   * Activity events that reset the idle timer (for shadow DOM).
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

  private applyVariant(value: string | null): void {
    // Default to dark theme when no variant is specified
    const isDark = value !== 'light';
    this.classList.toggle('dark-card', isDark);
  }

  constructor() {
    super();
    if (typeof (this as HTMLElement).attachShadow === 'function') {
      this.shadowRootRef = (this as HTMLElement).attachShadow({ mode: 'open' });
    }

    const networkAttr = this.getAttribute('network');
    const autoconnectAttr = this.getAttribute('autoconnect');
    this.initialVariant = this.getAttribute('variant');

    this.controller = new ZeldWalletController({
      lang: this.getAttribute('lang') ?? undefined,
      network: networkAttr === 'testnet' ? 'testnet' : 'mainnet',
      autoconnect: autoconnectAttr !== 'false' && autoconnectAttr !== '0',
      electrsUrl: this.getAttribute('electrs-url') ?? undefined,
      zeldhashApiUrl: this.getAttribute('zeldhash-api-url') ?? undefined,
    });

    this.snapshot = this.controller.getSnapshot();
    // Don't apply variant in constructor - it's not allowed for custom elements in React
    this.unsubscribe = this.controller.subscribe((next) => {
      this.snapshot = next;
      this.render();
    });
  }

  static get observedAttributes(): string[] {
    return ['lang', 'network', 'autoconnect', 'variant', 'electrs-url', 'zeldhash-api-url'];
  }

  get lang(): string {
    return this.snapshot?.locale ?? 'en';
  }

  set lang(value: string) {
    if (value == null) {
      this.removeAttribute('lang');
    } else {
      this.setAttribute('lang', value);
    }
  }

  get network(): NetworkType {
    return this.snapshot?.network ?? 'mainnet';
  }

  set network(value: NetworkType) {
    if (value === 'mainnet' || value === 'testnet') {
      this.setAttribute('network', value);
    } else {
      this.removeAttribute('network');
    }
  }

  get variant(): 'light' | 'dark' {
    return this.classList.contains('dark-card') ? 'dark' : 'light';
  }

  set variant(value: 'light' | 'dark') {
    const normalized = value === 'dark' ? 'dark' : 'light';
    this.applyVariant(normalized);
    const attrValue = normalized;
    if (this.getAttribute('variant') !== attrValue) {
      this.setAttribute('variant', attrValue);
    }
  }

  get autoconnect(): boolean {
    return this.getAttribute('autoconnect') !== 'false' && this.getAttribute('autoconnect') !== '0';
  }

  set autoconnect(value: boolean) {
    const normalized = Boolean(value);
    this.setAttribute('autoconnect', normalized ? 'true' : 'false');
  }

  get electrsUrl(): string | null {
    return this.getAttribute('electrs-url');
  }

  set electrsUrl(value: string | null) {
    if (value == null) {
      this.removeAttribute('electrs-url');
    } else {
      this.setAttribute('electrs-url', value);
    }
  }

  get zeldhashApiUrl(): string | null {
    return this.getAttribute('zeldhash-api-url');
  }

  set zeldhashApiUrl(value: string | null) {
    if (value == null) {
      this.removeAttribute('zeldhash-api-url');
    } else {
      this.setAttribute('zeldhash-api-url', value);
    }
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'lang') {
      this.controller.setLocale(newValue ?? undefined);
    }

    if (name === 'network') {
      if (newValue === 'mainnet' || newValue === 'testnet') {
        this.controller.setNetwork(newValue);
      }
    }

    if (name === 'variant') {
      this.applyVariant(newValue);
    }

    if (name === 'autoconnect') {
      this.controller.setAutoconnect(newValue !== 'false' && newValue !== '0');
      this.controller.maybeAutoconnect();
    }

    if (name === 'electrs-url') {
      this.controller.setElectrsUrl(newValue ?? undefined);
    }

    if (name === 'zeldhash-api-url') {
      this.controller.setZeldhashApiUrl(newValue ?? undefined);
    }
  }

  connectedCallback(): void {
    // Apply initial variant now that the element is connected
    if (!this.variantApplied) {
      this.applyVariant(this.getAttribute('variant') ?? this.initialVariant);
      this.variantApplied = true;
    }
    this.render();
    this.controller.maybeAutoconnect();
    
    // Set up shadow DOM activity listeners for auto-lock
    this.setupActivityListeners();
  }

  disconnectedCallback(): void {
    this.teardownActivityListeners();
    this.unsubscribe?.();
    this.controller.detach();
  }

  /**
   * Set up activity event listeners on the shadow DOM root.
   * These events bubble up from the shadow DOM and notify the controller.
   */
  private setupActivityListeners(): void {
    if (!this.shadowRootRef) return;
    
    this.boundActivityHandler = () => this.controller.notifyActivity();
    
    for (const event of ZeldWalletUI.ACTIVITY_EVENTS) {
      this.shadowRootRef.addEventListener(event, this.boundActivityHandler, { passive: true });
    }
  }

  /**
   * Remove activity event listeners from the shadow DOM root.
   */
  private teardownActivityListeners(): void {
    if (!this.shadowRootRef || !this.boundActivityHandler) return;
    
    for (const event of ZeldWalletUI.ACTIVITY_EVENTS) {
      this.shadowRootRef.removeEventListener(event, this.boundActivityHandler);
    }
    this.boundActivityHandler = undefined;
  }

  /**
   * Public API to set the locale programmatically.
   */
  setLocale(lang?: string): void {
    if (lang == null) {
      this.removeAttribute('lang');
    } else {
      this.setAttribute('lang', lang);
    }
  }

  /**
   * Public API to trigger (or retry) connection manually.
   */
  async connect(password?: string): Promise<void> {
    return this.controller.connect(password);
  }

  private render(): void {
    if (!this.shadowRootRef) return;
    const snapshot = this.snapshot ?? this.controller.getSnapshot();
    const { state, strings, dir, network, showBackupWarning, showPasswordWarning, readyWithSecurity } = snapshot;

    // Preserve focus before re-rendering
    const activeElement = this.shadowRootRef.activeElement as HTMLElement | null;
    const focusedSelector = activeElement?.hasAttribute('data-hunting-address')
      ? '[data-hunting-address]'
      : activeElement?.hasAttribute('data-hunting-amount')
        ? '[data-hunting-amount]'
        : activeElement?.hasAttribute('data-fee-custom-rate')
          ? '[data-fee-custom-rate]'
          : null;
    const selectionStart = (activeElement as HTMLInputElement | null)?.selectionStart ?? null;
    const selectionEnd = (activeElement as HTMLInputElement | null)?.selectionEnd ?? null;

    this.shadowRootRef.innerHTML = buildTemplate({
      state,
      network,
      dir,
      strings,
      locale: snapshot.locale,
      showPasswordWarning,
      showBackupWarning,
      readyWithSecurity,
    });

    // Restore focus after re-rendering
    if (focusedSelector) {
      const newElement = this.shadowRootRef.querySelector<HTMLInputElement>(focusedSelector);
      if (newElement) {
        newElement.focus();
        // Restore cursor position
        if (selectionStart !== null && selectionEnd !== null) {
          try {
            newElement.setSelectionRange(selectionStart, selectionEnd);
          } catch {
            // Some input types don't support setSelectionRange
          }
        }
      }
    }

    bindPasswordVisibility(this.shadowRootRef, strings);
    bindWalletSwitcher(this.shadowRootRef, {
      onToggle: () => this.controller.toggleWalletPicker(),
      onConnect: (walletId) => this.controller.connectWallet(walletId as SupportedWalletId),
    });
    bindMobileTabs(this.shadowRootRef, {
      onTabChange: (tab) => this.controller.setMobileActiveTab(tab),
    });
    // Restore is always available for ZeldWallet (not external wallets)
    bindRestoreActions(this.shadowRootRef, {
      onShowForm: () => this.controller.showRestoreForm(),
      onSubmitBackup: (backupString, password) => this.controller.handleRestore(backupString, password),
      onSubmitMnemonic: (data) => this.controller.handleMnemonicRestore(data),
      onCancel: () => this.controller.hideRestoreForm(),
      onModeChange: (mode) => this.controller.setRestoreMode(mode),
      onToggleAdvanced: (currentValues) => this.controller.toggleRestoreAdvanced(currentValues),
      onInputChange: (values) => this.controller.updateMnemonicRestoreState(values),
    });

    if (state.status === 'locked') {
      bindPasswordForm(this.shadowRootRef, (value) => {
        this.connect(value);
      });
    }
    if (state.status === 'ready') {
      bindCopyButtons(this.shadowRootRef, strings);
      bindSetPasswordActions(this.shadowRootRef, {
        onShowForm: () => this.controller.showSetPasswordForm(),
        onSubmit: (value, confirmValue) => this.controller.handleSetPassword(value, confirmValue),
        onCancel: () => this.controller.hideSetPasswordForm(),
      });
      bindBackupActions(this.shadowRootRef, {
        onShowForm: () => this.controller.showBackupForm(),
        onSubmit: (value) => this.controller.handleExportBackup(value),
        onCancel: () => this.controller.hideBackupForm(),
        onCloseResult: () => this.controller.clearBackupResult(),
      }, strings);
      bindHunting(this.shadowRootRef, {
        onSendBtcChange: (checked) => this.controller.setHuntingSendBtc(checked),
        onSendZeldChange: (checked) => this.controller.setHuntingSendZeld(checked),
        onSweepChange: (checked) => this.controller.setHuntingSweep(checked),
        onZeroCountChange: (value) => this.controller.setHuntingZeroCount(value),
        onUseGpuChange: (checked) => this.controller.setHuntingUseGpu(checked),
        onFeeModeChange: (mode) => this.controller.setHuntingFeeMode(mode as import('./state').FeeMode),
        onCustomFeeRateChange: (value) => this.controller.setHuntingCustomFeeRate(value),
        onFeeToggle: () => this.controller.toggleHuntingFeeExpanded(),
        onAddressChange: (value) => this.controller.setHuntingAddress(value),
        onAmountChange: (value) => this.controller.setHuntingAmount(value),
        onHunt: () => this.controller.startHunting(),
        onMiningStop: () => this.controller.stopMining(),
        onMiningResume: () => this.controller.resumeMining(),
        onMiningSign: () => this.controller.signAndBroadcast(),
        onMiningCancel: () => this.controller.cancelMining(),
        onMiningRetry: () => this.controller.retryMining(),
        onConfirmTransaction: () => this.controller.confirmTransaction(),
        onCancelConfirmation: () => this.controller.cancelConfirmation(),
      });
    }
  }

}

/**
 * Helper to define the custom element with an optional custom tag name.
 */
export function defineZeldWalletUI(tagName: string = DEFAULT_TAG_NAME): string {
  if (typeof window === 'undefined' || typeof window.customElements === 'undefined') {
    return tagName;
  }
  if (!window.customElements.get(tagName)) {
    window.customElements.define(tagName, ZeldWalletUI);
  }
  return tagName;
}

// Auto-define when running in a browser and the tag is free.
if (typeof window !== 'undefined' && typeof window.customElements !== 'undefined') {
  defineZeldWalletUI();
}

