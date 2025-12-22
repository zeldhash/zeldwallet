// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Buffer as NodeBuffer } from 'buffer';

if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = NodeBuffer;
}

const waitFor = async (assertion: () => void, timeout = 1000, interval = 20) => {
  const start = Date.now();
  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (Date.now() - start >= timeout) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
};

vi.mock('../src/ZeldWallet', () => {
  type Network = 'mainnet' | 'testnet';
  class FakeZeldWallet {
    private static existsFlag = false;
    private static unlocked = false;
    private static password: string | undefined;
    private static backup: string | undefined;
    private static network: Network = 'mainnet';

    static async create(password?: string) {
      this.existsFlag = true;
      this.unlocked = true;
      this.password = password;
      this.backup = undefined;
      return { mnemonic: 'test mnemonic' };
    }

    static async destroy() {
      this.existsFlag = false;
      this.unlocked = false;
      this.password = undefined;
      this.backup = undefined;
    }

    static async unlock(password?: string) {
      if (!this.existsFlag) {
        throw new Error('No wallet found');
      }
      if (this.password) {
        if (!password) {
          throw new Error('Password required to unlock storage');
        }
        if (password !== this.password) {
          throw new Error('Decryption failed: data may be corrupted or password is incorrect');
        }
      }
      this.unlocked = true;
    }

    static async setPassword(password: string) {
      this.password = password;
      this.unlocked = false;
    }

    static lock() {
      this.unlocked = false;
    }

    static async exists() {
      return this.existsFlag;
    }

    static async hasPassword() {
      return !!this.password;
    }

    static async hasBackup() {
      return !!this.backup;
    }

    static async exportBackup(password?: string) {
      if (this.password && password !== this.password) {
        throw new Error('Decryption failed: data may be corrupted or password is incorrect');
      }
      this.backup = 'mock-backup';
      return this.backup;
    }

    static isUnlocked() {
      return this.unlocked;
    }

    static getAddresses() {
      return [
        {
          address: 'bc1qpayment',
          publicKey: '02deadbeef',
          purpose: 'payment',
          addressType: 'p2wpkh',
          derivationPath: "m/84'/0'/0'/0/0",
        },
        {
          address: 'bc1pordinals',
          publicKey: '02cafebabe',
          purpose: 'ordinals',
          addressType: 'p2tr',
          derivationPath: "m/86'/0'/0'/0/0",
        },
      ];
    }

    static async setNetwork(network: Network) {
      this.network = network;
    }

    static getNetwork(): Network {
      return this.network;
    }

    static registerProvider() {
      /* noop for tests */
    }

    static on() {
      /* noop */
    }

    static off() {
      /* noop */
    }
  }

  return { ZeldWallet: FakeZeldWallet, default: FakeZeldWallet };
});

type WalletModule = typeof import('../src/component/ZeldWalletUI');
let ZeldWallet: typeof import('../src/ZeldWallet').ZeldWallet;
let ZeldWalletUI: WalletModule['ZeldWalletUI'];
let defineZeldWalletUI: WalletModule['defineZeldWalletUI'];

describe('ZeldWalletUI web component', () => {
  beforeEach(async () => {
    const mod = await import('../src/component/ZeldWalletUI');
    const walletMod = await import('../src/ZeldWallet');
    ZeldWallet = walletMod.ZeldWallet;
    ZeldWalletUI = mod.ZeldWalletUI;
    defineZeldWalletUI = mod.defineZeldWalletUI;
    Object.defineProperty(window, 'indexedDB', {
      value: (globalThis as any).indexedDB,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'crypto', {
      value: globalThis.crypto as any,
      configurable: true,
      writable: true,
    });
    await ZeldWallet.destroy();
    (window as any).confirm = vi.fn(() => true);
    defineZeldWalletUI();
  });

  afterEach(async () => {
    if (ZeldWallet) {
      await ZeldWallet.destroy();
    }
    vi.restoreAllMocks();
  });

  it('auto-connects and renders addresses', async () => {
    const el = document.createElement('zeld-wallet-ui') as ZeldWalletUI;
    document.body.appendChild(el);
    await (el as any).connect();

    await waitFor(() => {
      expect(el.shadowRoot?.textContent ?? '').toMatch(/bc1qpayment/);
    });

    expect(ZeldWallet.isUnlocked()).toBe(true);
  });

  it('re-registers provider and listeners after destroy + reconnect', async () => {
    const regSpy = vi.spyOn(ZeldWallet, 'registerProvider');
    const onSpy = vi.spyOn(ZeldWallet, 'on');

    const el = document.createElement('zeld-wallet-ui') as ZeldWalletUI;
    document.body.appendChild(el);

    await (el as any).connect();

    await waitFor(() => {
      expect(regSpy).toHaveBeenCalledTimes(1);
      expect(onSpy).toHaveBeenCalledTimes(4);
    });

    await ZeldWallet.destroy();
    await (el as any).connect();

    await waitFor(() => {
      expect(regSpy).toHaveBeenCalledTimes(2);
      expect(onSpy).toHaveBeenCalledTimes(8);
    });
  });

  it('prompts for password when wallet is protected and unlocks after submit', async () => {
    await ZeldWallet.destroy();
    await ZeldWallet.create('topsecret');
    ZeldWallet.lock();

    const el = document.createElement('zeld-wallet-ui') as ZeldWalletUI;
    document.body.appendChild(el);

    await (el as any).connect();
    await waitFor(() => {
      expect(el.shadowRoot?.textContent ?? '').toMatch(/password/i);
    });

    await (el as any).connect('wrong');
    await waitFor(() => {
      expect(el.shadowRoot?.textContent ?? '').toMatch(/wrong password/i);
    });

    await (el as any).connect('topsecret');
    await waitFor(() => {
      expect(el.shadowRoot?.textContent ?? '').toMatch(/bc1qpayment/);
    });
  });

  it('honors language selection', async () => {
    const el = document.createElement('zeld-wallet-ui') as ZeldWalletUI;
    el.setAttribute('lang', 'fr');
    document.body.appendChild(el);

    await (el as any).connect();
    await waitFor(() => {
      expect(el.shadowRoot?.textContent ?? '').toMatch(/portefeuille/i);
    });
  });

  it('defineZeldWalletUI is idempotent', () => {
    defineZeldWalletUI('zeld-wallet-ui');
    defineZeldWalletUI('zeld-wallet-ui');
    expect(customElements.get('zeld-wallet-ui')).toBe(ZeldWalletUI);
  });
});

