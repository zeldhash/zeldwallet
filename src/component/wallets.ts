import satsConnect, { AddressPurpose as SatsPurpose, BitcoinNetworkType, getAddress, signMessage as satsSignMessage, MessageSigningProtocols } from 'sats-connect';
import type { AddressInfo, AddressType, NetworkType, SignInputOptions } from '../types';
import { DEFAULT_PROVIDER } from './constants';

// Import wallet logos as assets (Vite handles these as URLs)
import XVERSE_ICON from './logos/xverse.png';
import LEATHER_ICON from './logos/leather.png';
import MAGIC_EDEN_ICON from './logos/magiceden.png';

export type SupportedWalletId = 'zeld' | 'xverse' | 'leather' | 'magicEden';

export type WalletOptionState = {
  id: SupportedWalletId;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  installUrl?: string;
};

export type WalletDiscovery = {
  options: WalletOptionState[];
  entries: Partial<Record<SupportedWalletId, WalletEntry>>;
};

export type WalletEntry = {
  id: string;
  name: string;
  icon?: string;
  provider?: unknown;
  getProvider?: () => unknown | Promise<unknown>;
};

export type ExternalWalletSession = {
  id: SupportedWalletId;
  name: string;
  addresses: AddressInfo[];
  network: NetworkType;
  provider?: unknown;
  signMessage: (message: string, address: string, protocol?: 'ecdsa' | 'bip322-simple') => Promise<string>;
  signPsbt?: (psbtBase64: string, inputs: SignInputOptions[]) => Promise<string>;
};

export class WrongNetworkError extends Error {
  code = 'wrong-network' as const;
  expected: NetworkType | string;
  received?: NetworkType | string;

  constructor(expected: NetworkType | string, received?: NetworkType | string) {
    const detail = received ? ` Expected ${expected} but received ${received}.` : '';
    super(`Wrong network.${detail}`);
    this.name = 'WrongNetworkError';
    this.expected = expected;
    this.received = received;
    Object.setPrototypeOf(this, WrongNetworkError.prototype);
  }
}

const codedError = (message: string, code: string): Error => Object.assign(new Error(message), { code });

type AddressLike = Partial<AddressInfo> & { path?: string };

export const FALLBACK_ICON =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="%23eef2f7"/><path d="M9 21l4-6 3 4 3-5 4 7" stroke="%232563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="11" r="2" fill="%232563eb"/></svg>';

const CATALOG: Record<SupportedWalletId, Omit<WalletOptionState, 'installed'>> = {
  zeld: {
    id: 'zeld',
    name: 'ZeldWallet',
    description: 'In-browser • Zero-install • Built for ZeldHash',
    icon: DEFAULT_PROVIDER.icon,
  },
  xverse: {
    id: 'xverse',
    name: 'Xverse',
    description: 'Popular • Full-featured • Ledger support',
    icon: XVERSE_ICON,
    installUrl: 'https://www.xverse.app/download',
  },
  leather: {
    id: 'leather',
    name: 'Leather',
    description: 'Open-source • Minimalist • Audited',
    icon: LEATHER_ICON,
    installUrl: 'https://leather.io',
  },
  magicEden: {
    id: 'magicEden',
    name: 'Magic Eden',
    description: 'Built-in marketplace • Rare sats • Collectors',
    icon: MAGIC_EDEN_ICON,
    installUrl: 'https://magiceden.io/wallet',
  },
};

const buildNetworkParams = (network: NetworkType): { type: BitcoinNetworkType } => ({
  type: network === 'testnet' ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet,
});

const normalizeAddress = (address: AddressLike, fallbackPurpose: 'payment' | 'ordinals'): AddressInfo => ({
  address: address.address ?? '',
  publicKey: address.publicKey ?? '',
  purpose: (address.purpose as AddressInfo['purpose']) ?? fallbackPurpose,
  addressType: (address.addressType as AddressType) ?? 'p2wpkh',
  derivationPath: address.derivationPath ?? address.path ?? '',
});

const normalizeAddresses = (addresses: AddressLike[], defaultNetwork: NetworkType): { list: AddressInfo[]; network: NetworkType } => {
  const list = addresses.map((addr, idx) => normalizeAddress(addr, idx === 0 ? 'payment' : 'ordinals'));
  return { list, network: defaultNetwork };
};

const detectNetworkFromAddress = (value?: string): NetworkType | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('tb1') || lower.startsWith('bcrt1')) return 'testnet';
  if (lower.startsWith('bc1')) return 'mainnet';
  const first = trimmed[0];
  if (first === 'm' || first === 'n' || first === '2') return 'testnet';
  if (first === '1' || first === '3') return 'mainnet';
  return undefined;
};

const detectNetworkFromAddresses = (addresses: AddressLike[]): { detected?: NetworkType; mixed: boolean } => {
  const networks = new Set<NetworkType>();
  for (const entry of addresses) {
    const net = detectNetworkFromAddress(entry.address);
    if (net) networks.add(net);
  }
  if (networks.size === 1) {
    return { detected: Array.from(networks)[0], mixed: false };
  }
  return { mixed: networks.size > 1, detected: undefined };
};

const ensureNetworkMatches = (addresses: AddressLike[], expected: NetworkType): NetworkType => {
  const { detected, mixed } = detectNetworkFromAddresses(addresses);
  if (mixed) {
    throw new WrongNetworkError(expected, detected);
  }
  if (detected && detected !== expected) {
    throw new WrongNetworkError(expected, detected);
  }
  return detected ?? expected;
};

const normalizeResponse = <T>(resp: T): T | (T extends { result: infer R } ? R : unknown) => {
  if (!resp) return resp;
  // @ts-expect-error - runtime normalization mirrors demo logic.
  if (resp.jsonrpc === '2.0') {
    // @ts-expect-error - runtime shape check
    if (resp.error) throw resp.error;
    // @ts-expect-error - runtime shape check
    return resp.result;
  }
  // @ts-expect-error - runtime normalization mirrors demo logic.
  if (resp.status === 'error') throw (resp as any).error ?? resp;
  // @ts-expect-error - runtime normalization mirrors demo logic.
  if (resp.status === 'success') return (resp as any).result;
  return resp;
};

const getByPath = (root: any, path: string): any =>
  path.split('.').reduce((acc: any, part: string) => (acc ? acc[part] : undefined), root);

const toWalletEntry = (candidate: unknown): WalletEntry | undefined => {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const anyCandidate = candidate as Record<string, unknown>;
  const id = typeof anyCandidate.id === 'string' ? anyCandidate.id : undefined;
  const name = typeof anyCandidate.name === 'string' ? anyCandidate.name : undefined;
  if (!id || !name) return undefined;
  return {
    id,
    name,
    icon: typeof anyCandidate.icon === 'string' ? anyCandidate.icon : undefined,
    getProvider: typeof anyCandidate.getProvider === 'function' ? (anyCandidate.getProvider as () => unknown) : undefined,
    provider: 'provider' in anyCandidate ? anyCandidate.provider : undefined,
  };
};

const discoverFromGlobals = (providers: WalletEntry[], idMatch: RegExp): WalletEntry | undefined =>
  providers.find(
    (p) => idMatch.test(p.id) || idMatch.test(p.name ?? '') || (p.icon && idMatch.test(p.icon))
  );

const discoverLeather = (): WalletEntry | undefined => {
  if (typeof window === 'undefined') return undefined;
  const provider = (window as Record<string, unknown>).LeatherProvider ?? (window as Record<string, unknown>).btc;
  if (!provider) return undefined;
  return {
    id: 'LeatherProvider',
    name: 'Leather',
    icon: (provider as Record<string, unknown>).icon as string | undefined,
    provider,
  };
};

const discoverMagicEden = (): WalletEntry | undefined => {
  if (typeof window === 'undefined') return undefined;
  const provider = (window as any)?.magicEden?.bitcoin;
  if (!provider) {
    return undefined;
  }
  return {
    id: 'magicEden.bitcoin',
    name: 'Magic Eden Wallet',
    icon: (provider as Record<string, unknown>).icon as string | undefined,
    provider,
  };
};

export const discoverWallets = (): WalletDiscovery => {
  const catalogOptions = Object.values(CATALOG);
  if (typeof window === 'undefined') {
    return {
      options: catalogOptions.map((opt) => ({ ...opt, installed: opt.id === 'zeld' })),
      entries: {},
    };
  }

  const providerList = Array.isArray((window as Record<string, unknown>).btc_providers)
    ? ((window as Record<string, unknown>).btc_providers as WalletEntry[])
    : [];
  const leatherEntry = discoverLeather();
  const magicEntry = discoverMagicEden();

  const mergedProviders: WalletEntry[] = [...providerList];
  const addIfMissing = (entry?: WalletEntry) => {
    if (!entry) return;
    if (!mergedProviders.some((p) => p?.id === entry.id)) mergedProviders.push(entry);
  };
  addIfMissing(leatherEntry);
  addIfMissing(magicEntry);

  // Expose merged providers back to sats-connect to avoid "no wallet provider found"
  (window as any).btc_providers = mergedProviders;

  const normalizedProviders = mergedProviders
    .map((p) => ({
      ...p,
      getProvider: typeof (p as Record<string, unknown>).getProvider === 'function' ? (p as Record<string, unknown>).getProvider : undefined,
    }))
    .map(toWalletEntry)
    .filter((p): p is WalletEntry => Boolean(p));

  const entries: Partial<Record<SupportedWalletId, WalletEntry>> = {};

  // ZeldWallet is always available via the embedded provider.
  const zeldEntry: WalletEntry = {
    id: DEFAULT_PROVIDER.id,
    name: DEFAULT_PROVIDER.name,
    icon: DEFAULT_PROVIDER.icon,
    provider: (window as Record<string, unknown>)[DEFAULT_PROVIDER.id],
  };
  entries.zeld = zeldEntry;

  const xverseEntry = discoverFromGlobals(normalizedProviders, /xverse/i);
  const resolvedLeather = leatherEntry ?? discoverFromGlobals(normalizedProviders, /leather/i);
  const resolvedMagic = magicEntry ?? discoverFromGlobals(normalizedProviders, /magic.?eden/i);

  if (xverseEntry) entries.xverse = xverseEntry;
  if (resolvedLeather) entries.leather = resolvedLeather;
  if (resolvedMagic) entries.magicEden = resolvedMagic;

  const options = catalogOptions.map((opt) => ({
    ...opt,
    installed:
      opt.id === 'zeld'
        ? true
        : opt.id === 'xverse'
          ? Boolean(entries.xverse)
          : opt.id === 'leather'
            ? Boolean(entries.leather)
            : Boolean(entries.magicEden),
  }));

  return { options, entries };
};

const providerHasInterface = (candidate: unknown): candidate is { request?: unknown; getAddresses?: unknown; connect?: unknown } =>
  !!candidate && typeof candidate === 'object';

const buildGetInfoShim = (provider: any): any => {
  if (!provider || typeof provider.request !== 'function') return provider;
  if (provider.__zw_getInfoShimmed) return provider;
  const shimmed = {
    ...provider,
    request: async (method: string, params?: unknown) => {
      if (method !== 'getInfo') return provider.request(method, params);
      try {
        return await provider.request(method, params);
      } catch (err: any) {
        const code = err?.code;
        const message = err?.message ?? '';
        const unsupported = code === -32601 || message.includes('getInfo');
        if (!unsupported) throw err;
        return {
          version: '1.0.0',
          platform: 'web',
          methods: ['getAddresses', 'signMessage', 'signPsbt'],
          supports: ['WBIP004', 'WBIP005', 'WBIP006'],
        };
      }
    },
  };
  Object.defineProperty(shimmed, '__zw_getInfoShimmed', { value: true });
  return shimmed;
};

const resolveProvider = async (entry: WalletEntry): Promise<any> => {
  const candidates = [
    await entry.getProvider?.(),
    entry.provider,
    typeof window !== 'undefined' ? getByPath(window, entry.id) : undefined,
    typeof window !== 'undefined' ? getByPath(window, `${entry.id}.provider`) : undefined,
    (typeof window !== 'undefined' ? (window as Record<string, unknown>)[entry.id] : undefined) as unknown,
    typeof window !== 'undefined' ? (window as Record<string, unknown>)[`${entry.id}.provider`] : undefined,
  ].filter(providerHasInterface);

  const provider = candidates.find(providerHasInterface);
  return buildGetInfoShim(provider);
};

const connectWith = async (
  entry: WalletEntry,
  network: NetworkType,
  requestMessage: string
): Promise<{ provider?: unknown; addresses: AddressLike[] }> => {
  const provider = await resolveProvider(entry);
  const requestFn = typeof (provider as any)?.request === 'function' ? (provider as any).request.bind(provider) : undefined;
  const addressParams = {
    purposes: ['payment', 'ordinals'],
    network: buildNetworkParams(network),
    message: requestMessage,
  };

  const attempts: Array<{ label: string; fn: () => Promise<any> }> = [];

  const isMagicEden = entry.id.toLowerCase().includes('magic');
  const isXverse = entry.id.toLowerCase().includes('xverse') || entry.name?.toLowerCase?.().includes('xverse');
  const isLeather = entry.id.toLowerCase().includes('leather') || entry.name?.toLowerCase?.().includes('leather');

  if (isMagicEden) {
    attempts.push({
      label: 'magicEden.getAddress',
      fn: () =>
        new Promise((resolve, reject) => {
          getAddress({
            getProvider: () => (window as any)?.magicEden?.bitcoin,
            payload: {
              purposes: [SatsPurpose.Ordinals, SatsPurpose.Payment],
              message: addressParams.message,
              network: { type: network === 'testnet' ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet },
            },
            onFinish: (response) => resolve(response),
            onCancel: () => reject(codedError('User cancelled.', 'user-cancelled')),
          });
        }),
    });
  }

  if (isLeather && requestFn) {
    const leatherParams = { purposes: addressParams.purposes };
    attempts.push({
      label: 'leather.request(getAddresses, simple)',
      fn: () => requestFn('getAddresses', leatherParams),
    });
    attempts.push({
      label: 'leather.request(getAddresses, empty)',
      fn: () => requestFn('getAddresses', {}),
    });
  }

  if (requestFn) {
    if (isXverse) {
      attempts.push({
        label: 'request(wallet_connect)',
        fn: () => requestFn('wallet_connect', addressParams),
      });
    }
    attempts.push({
      label: 'request(getAddresses)',
      fn: () => requestFn('getAddresses', addressParams),
    });
    attempts.push({
      label: 'request({method:getAddresses})',
      fn: () => requestFn({ method: 'getAddresses', params: addressParams }),
    });
  }

  if (typeof (provider as any)?.connect === 'function') {
    attempts.push({
      label: 'connect+getAddresses',
      fn: async () => {
        await (provider as any).connect(addressParams);
        if (typeof (provider as any).getAddresses === 'function') return (provider as any).getAddresses(addressParams);
        return requestFn?.('getAddresses', addressParams);
      },
    });
  }

  if (typeof (provider as any)?.getAddresses === 'function') {
    attempts.push({ label: 'provider.getAddresses', fn: () => (provider as any).getAddresses(addressParams) });
  }

  const scRequest = (satsConnect as unknown as { request?: (...args: any[]) => Promise<any> }).request;
  if (scRequest) {
    attempts.push({
      label: 'satsConnect.request(getAddresses)',
      fn: () => scRequest.call(satsConnect as any, 'getAddresses', addressParams as any, entry.id, { skipGetInfo: true }),
    });
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = normalizeResponse(await attempt.fn());
      const addresses =
        Array.isArray((result as any)?.addresses) && (result as any).addresses.length
          ? (result as any).addresses
          : Array.isArray(result)
            ? result
            : [];
      return { provider, addresses };
    } catch (err) {
      lastError = err;
      // eslint-disable-next-line no-console
      console.warn(`[wallets] ${attempt.label} failed`, err);
    }
  }

  throw lastError ?? codedError('No provider response.', 'wallet-no-provider');
};

export const connectExternalWallet = async (
  walletId: SupportedWalletId,
  network: NetworkType,
  requestMessage: string
): Promise<ExternalWalletSession> => {
  console.log('[connectExternalWallet] Starting connection for:', walletId, 'network:', network);
  
  if (walletId === 'zeld') {
    throw codedError('ZeldWallet is built in. Use the default connect flow instead.', 'wallet-built-in');
  }

  const discovery = discoverWallets();
  console.log('[connectExternalWallet] Discovery entries:', Object.keys(discovery.entries));
  
  const entry = discovery.entries[walletId];
  if (!entry) {
    throw codedError('Wallet is not installed in this browser.', 'wallet-not-installed');
  }
  console.log('[connectExternalWallet] Found entry:', { id: entry.id, name: entry.name, hasProvider: !!entry.provider, hasGetProvider: !!entry.getProvider });

  const { provider, addresses } = await connectWith(entry, network, requestMessage);
  console.log('[connectExternalWallet] After connectWith:', {
    hasProvider: !!provider,
    providerType: typeof provider,
    hasRequest: typeof (provider as any)?.request === 'function',
    addressCount: addresses.length,
  });
  
  const normalized = normalizeAddresses(addresses, network);
  const sessionNetwork = ensureNetworkMatches(normalized.list, network);

  const scRequest = (satsConnect as unknown as { request?: (...args: any[]) => Promise<any> }).request;
  console.log('[connectExternalWallet] satsConnect.request available:', !!scRequest);

  const isMagicEden = walletId === 'magicEden';
  
  const signMessage = async (
    message: string,
    address: string,
    protocol: 'ecdsa' | 'bip322-simple' = 'ecdsa'
  ): Promise<string> => {
    console.log('[signMessage] Called with:', { message, address, protocol, walletId });
    console.log('[signMessage] Provider state:', {
      hasProvider: !!provider,
      providerType: typeof provider,
      hasRequest: typeof (provider as any)?.request === 'function',
      entryId: entry.id,
      isMagicEden,
    });
    
    const requestFn = typeof (provider as any)?.request === 'function' ? (provider as any).request.bind(provider) : undefined;
    console.log('[signMessage] requestFn resolved:', !!requestFn);
    
    // External wallets (Xverse, etc.) expect uppercase: "ECDSA" or "BIP322"
    const externalProtocol = protocol === 'bip322-simple' ? MessageSigningProtocols.BIP322 : MessageSigningProtocols.ECDSA;
    const params = { address, message, protocol: externalProtocol };
    
    // Magic Eden: use sats-connect signMessage with getProvider (same pattern as getAddress)
    if (isMagicEden) {
      console.log('[signMessage] Using satsSignMessage with getProvider for Magic Eden');
      return new Promise((resolve, reject) => {
        satsSignMessage({
          getProvider: () => (window as any)?.magicEden?.bitcoin,
          payload: {
            address,
            message,
            protocol: externalProtocol,
            network: { type: sessionNetwork === 'testnet' ? BitcoinNetworkType.Testnet : BitcoinNetworkType.Mainnet },
          },
          onFinish: (response) => {
            console.log('[signMessage] Magic Eden signMessage response:', response);
            resolve(typeof response === 'string' ? response : (response as any)?.signature ?? JSON.stringify(response));
          },
          onCancel: () => reject(codedError('User cancelled signing.', 'user-cancelled-signing')),
        });
      });
    }
    
    if (requestFn) {
      console.log('[signMessage] Using provider.request directly');
      const resp = normalizeResponse(await requestFn('signMessage', params));
      if (typeof resp === 'string') return resp;
      return (resp as any)?.signature ?? JSON.stringify(resp);
    }
    
    console.log('[signMessage] scRequest available:', !!scRequest);
    if (scRequest) {
      console.log('[signMessage] Using satsConnect.request with entry.id:', entry.id);
      const resp = normalizeResponse(await scRequest.call(satsConnect as any, 'signMessage', params as any, entry.id, { skipGetInfo: true }));
      if (typeof resp === 'string') return resp;
      return (resp as any)?.signature ?? JSON.stringify(resp);
    }
    
    console.log('[signMessage] Fallback to satsConnect.request (no scRequest)');
    const resp = normalizeResponse(await (satsConnect as any).request('signMessage', params as any, entry.id, { skipGetInfo: true }));
    if (typeof resp === 'string') return resp;
    return (resp as any)?.signature ?? JSON.stringify(resp);
  };

  const signPsbt = typeof (provider as any)?.request === 'function'
    ? async (psbtBase64: string, inputs: SignInputOptions[]): Promise<string> => {
        const resp = normalizeResponse(await (provider as any).request('signPsbt', { psbt: psbtBase64, signInputs: inputs }));
        if (typeof resp === 'string') return resp;
        return (resp as any)?.psbt ?? JSON.stringify(resp);
      }
    : undefined;

  return {
    id: walletId,
    name: CATALOG[walletId].name,
    network: sessionNetwork,
    addresses: normalized.list,
    provider,
    signMessage,
    signPsbt,
  };
};

