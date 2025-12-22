/**
 * Balance fetching service for BTC and ZELD.
 *
 * Uses Electrs/Mempool API to fetch UTXOs and calculate BTC balance,
 * then uses ZeldHash API to fetch ZELD balance for those UTXOs.
 */

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
 */
export async function fetchBalances(
  addresses: string[],
  electrsUrl: string = DEFAULT_ELECTRS_URL,
  zeldhashApiUrl: string = DEFAULT_ZELDHASH_API_URL
): Promise<BalanceResult> {
  if (addresses.length === 0) {
    return { btcSats: 0, zeldBalance: 0 };
  }

  const results = await Promise.all(
    addresses.map((addr) => fetchAddressBalance(addr, electrsUrl, zeldhashApiUrl))
  );

  return {
    btcSats: results.reduce((sum, r) => sum + r.btcSats, 0),
    zeldBalance: results.reduce((sum, r) => sum + r.zeldBalance, 0),
  };
}

/**
 * Formats satoshis to BTC string with 8 decimal places.
 */
export function formatBtc(sats: number): string {
  const btc = sats / 100_000_000;
  return btc.toFixed(8);
}

/**
 * Formats ZELD balance (stored in minimal units, 8 decimals).
 */
export function formatZeld(balance: number): string {
  const zeld = balance / 100_000_000;
  return zeld.toFixed(8);
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

