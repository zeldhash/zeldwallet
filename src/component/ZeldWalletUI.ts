import type { NetworkType } from '../types';
import {
  bindBackupActions,
  bindCopyButtons,
  bindPasswordForm,
  bindPasswordVisibility,
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
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.controller.detach();
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

    this.shadowRootRef.innerHTML = buildTemplate({
      state,
      network,
      dir,
      strings,
      showPasswordWarning,
      showBackupWarning,
      readyWithSecurity,
    });

    bindPasswordVisibility(this.shadowRootRef, strings);
    bindWalletSwitcher(this.shadowRootRef, {
      onToggle: () => this.controller.toggleWalletPicker(),
      onConnect: (walletId) => this.controller.connectWallet(walletId as SupportedWalletId),
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

