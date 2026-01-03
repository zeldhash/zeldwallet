/**
 * Balance fetching service for BTC and ZELD.
 *
 * Uses Electrs/Mempool API to fetch UTXOs and calculate BTC balance,
 * then uses ZeldHash API to fetch ZELD balance for those UTXOs.
 */

import type { AddressInfo } from '../types';

// Simple Bitcoin address check (mainnet + testnet). We keep this lightweight to
// avoid pulling extra deps into the balance helper.
const isBitcoinAddress = (address: string): boolean => {
  if (!address) return false;
  const trimmed = address.trim();
  // bech32/bech32m mainnet + testnet
  if (/^(bc1|tb1)[0-9a-z]+$/i.test(trimmed)) return true;
  // legacy/p2sh mainnet
  if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(trimmed)) return true;
  // legacy/p2sh testnet
  if (/^[mn2][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(trimmed)) return true;
  return false;
};
import { DEFAULT_ELECTRS_URL, DEFAULT_ZELDHASH_API_URL } from './constants';

export type UtxoResponse = {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_height?: number;
  };
};

export type ZeldBalanceResponse = {
  txid: string;
  vout: number;
  balance: number;
};

export type BalanceResult = {
  btcSats: number;
  zeldBalance: number;
  /** BTC balance in sats for payment address only (first address if multiple) */
  btcPaymentSats?: number;
};

/**
 * Fetches UTXOs for an address from Electrs/Mempool API.
 */
async function fetchUtxos(address: string, electrsUrl: string): Promise<UtxoResponse[]> {
  const url = `${electrsUrl.replace(/\/$/, '')}/address/${address}/utxo`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch UTXOs: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches ZELD balances for a list of UTXOs from ZeldHash API.
 */
async function fetchZeldBalances(
  utxos: Array<{ txid: string; vout: number }>,
  zeldhashApiUrl: string
): Promise<ZeldBalanceResponse[]> {
  if (utxos.length === 0) return [];

  const url = `${zeldhashApiUrl.replace(/\/$/, '')}/utxos`;
  const outpoints = utxos.map((u) => `${u.txid}:${u.vout}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utxos: outpoints }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ZELD balances: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches balance for a single address.
 */
async function fetchAddressBalance(
  address: string,
  electrsUrl: string,
  zeldhashApiUrl: string
): Promise<BalanceResult> {
  const utxos = await fetchUtxos(address, electrsUrl);

  // Calculate BTC balance from confirmed UTXOs
  const btcSats = utxos
    .filter((u) => u.status.confirmed)
    .reduce((sum, u) => sum + u.value, 0);

  // Get ZELD balance for confirmed UTXOs
  const confirmedUtxos = utxos
    .filter((u) => u.status.confirmed)
    .map((u) => ({ txid: u.txid, vout: u.vout }));

  let zeldBalance = 0;
  if (confirmedUtxos.length > 0) {
    try {
      const zeldBalances = await fetchZeldBalances(confirmedUtxos, zeldhashApiUrl);
      zeldBalance = zeldBalances.reduce((sum, z) => sum + (z.balance || 0), 0);
    } catch {
      // If ZELD balance fetch fails, we still return the BTC balance
      console.warn(`Failed to fetch ZELD balance for ${address}`);
    }
  }

  return { btcSats, zeldBalance };
}

/**
 * Fetches combined balance for multiple addresses.
 * Explicitly identifies the payment address by purpose to avoid ordering issues.
 */
export async function fetchBalances(
  addresses: AddressInfo[],
  electrsUrl: string = DEFAULT_ELECTRS_URL,
  zeldhashApiUrl: string = DEFAULT_ZELDHASH_API_URL
): Promise<BalanceResult> {
  if (addresses.length === 0) {
    return { btcSats: 0, zeldBalance: 0, btcPaymentSats: 0 };
  }

  // Keep only Bitcoin addresses (Leather can return Stacks addresses)
  const filtered = addresses.filter((a) => isBitcoinAddress(a.address));
  if (filtered.length !== addresses.length) {
    const dropped = addresses.filter((a) => !isBitcoinAddress(a.address));
    console.warn('[fetchBalances] Dropping non-Bitcoin addresses', { dropped: dropped.map((d) => d.address) });
  }

  // Find payment address by purpose, not by position
  const paymentAddress = filtered.find((a) => a.purpose === 'payment');
  const addressStrings = filtered.map((a) => a.address).filter(Boolean);

  if (addressStrings.length === 0) {
    return { btcSats: 0, zeldBalance: 0, btcPaymentSats: 0 };
  }

  // Fetch balances per address, but don't fail the whole batch if one address errors
  const results = await Promise.allSettled(
    addressStrings.map((addr) => fetchAddressBalance(addr, electrsUrl, zeldhashApiUrl))
  );

  // Find payment balance by matching the address string
  let btcPaymentSats = 0;
  if (paymentAddress) {
    const paymentIndex = addressStrings.indexOf(paymentAddress.address);
    if (paymentIndex >= 0) {
      const paymentResult = results[paymentIndex];
      if (paymentResult.status === 'fulfilled') {
        btcPaymentSats = paymentResult.value.btcSats;
      }
    }
  }

  const fulfilled = results.filter((r): r is PromiseFulfilledResult<BalanceResult> => r.status === 'fulfilled');

  if (fulfilled.length === 0) {
    // If everything failed, surface the first error
    const firstRejection = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (firstRejection) {
      throw firstRejection.reason;
    }
    return { btcSats: 0, zeldBalance: 0, btcPaymentSats };
  }

  return {
    btcSats: fulfilled.reduce((sum, r) => sum + r.value.btcSats, 0),
    zeldBalance: fulfilled.reduce((sum, r) => sum + r.value.zeldBalance, 0),
    btcPaymentSats,
  };
}

/**
 * Locale to BCP 47 tag mapping for Intl.NumberFormat.
 * Most locale keys are already valid BCP 47 tags.
 */
function toBcp47Locale(locale?: string): string {
  if (!locale) return 'en';
  // Handle our locale keys that are already BCP 47 compliant
  // 'zh-CN', 'zh-TW' are already correct
  return locale;
}

/**
 * Formats a number with locale-aware thousand separators.
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @param locale - Locale key (e.g., 'en', 'fr', 'de', 'zh-CN')
 */
function formatWithThousandSeparators(value: number, decimals: number, locale?: string): string {
  const bcp47 = toBcp47Locale(locale);
  try {
    return new Intl.NumberFormat(bcp47, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    // Fallback if locale is not supported
    return value.toFixed(decimals);
  }
}

/**
 * Formats satoshis to BTC string with 8 decimal places.
 * Uses locale-aware thousand separators when locale is provided.
 */
export function formatBtc(sats: number, locale?: string): string {
  const btc = sats / 100_000_000;
  return formatWithThousandSeparators(btc, 8, locale);
}

/**
 * Formats ZELD balance (stored in minimal units, 8 decimals).
 * Uses locale-aware thousand separators when locale is provided.
 */
export function formatZeld(balance: number, locale?: string): string {
  const zeld = balance / 100_000_000;
  return formatWithThousandSeparators(zeld, 8, locale);
}

/**
 * Truncates an address for display (first 6 + … + last 6 characters).
 */
export function truncateAddress(address: string, prefixLen = 6, suffixLen = 6): string {
  if (!address || address.length <= prefixLen + suffixLen + 1) {
    return address;
  }
  return `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`;
}

