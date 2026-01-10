/**
 * Miner Preparation Helpers
 *
 * Functions to prepare transaction parameters for zeldhash-miner.
 * Handles three cases:
 * 1. Simple hunt (no BTC or Zeld sending)
 * 2. Hunt with BTC sending
 * 3. Hunt with Zeld sending
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import type { NetworkType } from '../types';
import { DUST, MIN_FEE_RESERVE } from './constants';

export { DUST, MIN_FEE_RESERVE } from './constants';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** UTXO from Electrs API */
export interface UtxoInfo {
  txid: string;
  vout: number;
  value: number; // sats
  status: {
    confirmed: boolean;
    block_height?: number;
  };
}

/** UTXO with Zeld balance (for ordinals address) */
export interface OrdinalsUtxo extends UtxoInfo {
  zeldBalance: number; // minimal units (8 decimals like sats)
}

/** Input format for zeldhash-miner */
export interface TxInput {
  txid: string;
  vout: number;
  scriptPubKey: string; // hex
  amount: number; // sats
}

/** Output format for zeldhash-miner */
export interface TxOutput {
  address: string;
  amount?: number; // required unless change: true
  change: boolean;
}

/** Result from prepareMinerArgs */
export interface MinerArgs {
  inputs: TxInput[];
  outputs: TxOutput[];
  targetZeros: number;
  useGpu: boolean;
  distribution?: bigint[]; // [change_zeld, zeld_output.amount]
}

/** Optional BTC output */
export interface BtcOutput {
  address: string;
  amount: number; // sats
}

/** Optional Zeld output */
export interface ZeldOutput {
  address: string;
  amount: number; // minimal units (8 decimals)
}

/** Error codes for miner errors */
export type MinerErrorCode =
  | 'MINER_NO_UTXO'
  | 'MINER_INSUFFICIENT_BTC'
  | 'MINER_INSUFFICIENT_ZELD'
  | 'MINER_INSUFFICIENT_BTC_FOR_ZELD'
  | 'MINER_INVALID_TARGET_ZEROS'
  | 'MINER_NOT_INSTALLED';

/** Error thrown when funds are insufficient or other miner errors */
export class MinerError extends Error {
  readonly code: MinerErrorCode;
  readonly params: Record<string, string | number>;

  constructor(code: MinerErrorCode, params: Record<string, string | number> = {}) {
    super(code);
    this.name = 'MinerError';
    this.code = code;
    this.params = params;
  }
}

/** @deprecated Use MinerError instead */
export class InsufficientFundsError extends MinerError {
  constructor(message: string) {
    // Legacy support: parse old messages or use generic code
    super('MINER_INSUFFICIENT_BTC', { message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures bitcoinjs has its ECC library initialized (required for Taproot).
 * Safe to call multiple times.
 */
function ensureEcc(): void {
  // bitcoinjs exposes the loaded ecc lib on the `ecc` property once initialized.
  if (!(bitcoin as unknown as { ecc?: unknown }).ecc) {
    bitcoin.initEccLib(ecc);
  }
}

/**
 * Converts a Bitcoin address to its scriptPubKey (hex).
 */
export function addressToScriptPubKey(address: string, network: NetworkType = 'mainnet'): string {
  ensureEcc();
  const btcNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  return bitcoin.address.toOutputScript(address, btcNetwork).toString('hex');
}

/**
 * Converts a UtxoInfo to a TxInput for the miner.
 */
function utxoToTxInput(utxo: UtxoInfo, address: string, network: NetworkType): TxInput {
  return {
    txid: utxo.txid,
    vout: utxo.vout,
    scriptPubKey: addressToScriptPubKey(address, network),
    amount: utxo.value,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hunt Preparation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prepares inputs/outputs for a simple hunt (no BTC or Zeld sending).
 *
 * Algorithm:
 * - Input: Select the smallest UTXO from payment address that has > 2 * DUST sats.
 * - Outputs:
 *   1. Ordinals address, value = DUST (330 sats), change = false
 *   2. Payment address, value = null, change = true (BTC change)
 */
export function prepareSimpleHunt(
  paymentAddress: string,
  paymentUtxos: UtxoInfo[],
  ordinalsAddress: string,
  targetZeros: number,
  useGpu: boolean,
  network: NetworkType = 'mainnet'
): MinerArgs {
  const minRequired = 2 * DUST;

  // Filter confirmed UTXOs with enough value, sort by value ascending
  const viableUtxos = paymentUtxos
    .filter((u) => u.status.confirmed && u.value > minRequired)
    .sort((a, b) => a.value - b.value);

  if (viableUtxos.length === 0) {
    throw new MinerError('MINER_NO_UTXO', { required: minRequired });
  }

  // Select the smallest viable UTXO
  const selectedUtxo = viableUtxos[0];

  const inputs: TxInput[] = [utxoToTxInput(selectedUtxo, paymentAddress, network)];

  const outputs: TxOutput[] = [
    { address: ordinalsAddress, amount: DUST, change: false },
    { address: paymentAddress, change: true },
  ];

  return {
    inputs,
    outputs,
    targetZeros,
    useGpu,
  };
}

/**
 * Prepares inputs/outputs for a hunt with BTC sending.
 *
 * Algorithm:
 * - Inputs: Starting with the largest UTXO from payment address, take enough to cover
 *   btc_output.amount + DUST + MIN_FEE_RESERVE.
 * - Outputs:
 *   1. Ordinals address, value = DUST (330 sats), change = false
 *   2. btc_output.address with btc_output.amount, change = false
 *   3. Payment address, value = null, change = true (BTC change)
 */
export function prepareBtcSendHunt(
  paymentAddress: string,
  paymentUtxos: UtxoInfo[],
  ordinalsAddress: string,
  btcOutput: BtcOutput,
  targetZeros: number,
  useGpu: boolean,
  network: NetworkType = 'mainnet'
): MinerArgs {
  const minRequired = btcOutput.amount + DUST + MIN_FEE_RESERVE;

  // Filter confirmed UTXOs, sort by value descending (greedy selection)
  const confirmedUtxos = paymentUtxos
    .filter((u) => u.status.confirmed)
    .sort((a, b) => b.value - a.value);

  // Greedy selection: take largest UTXOs until we have enough
  const selectedUtxos: UtxoInfo[] = [];
  let totalSelected = 0;

  for (const utxo of confirmedUtxos) {
    selectedUtxos.push(utxo);
    totalSelected += utxo.value;
    if (totalSelected >= minRequired) {
      break;
    }
  }

  if (totalSelected < minRequired) {
    throw new MinerError('MINER_INSUFFICIENT_BTC', { required: minRequired, available: totalSelected });
  }

  const inputs: TxInput[] = selectedUtxos.map((u) => utxoToTxInput(u, paymentAddress, network));

  const outputs: TxOutput[] = [
    { address: ordinalsAddress, amount: DUST, change: false },
    { address: btcOutput.address, amount: btcOutput.amount, change: false },
    { address: paymentAddress, change: true },
  ];

  return {
    inputs,
    outputs,
    targetZeros,
    useGpu,
  };
}

/**
 * Prepares inputs/outputs for a hunt with Zeld sending.
 *
 * Algorithm:
 * - Inputs:
 *   1. Starting with the largest, select UTXOs with ZELD (from both ordinals and payment addresses) to cover zeld_output.amount.
 *   2. If total BTC from selected inputs < 2 * DUST + MIN_FEE_RESERVE,
 *      add more UTXOs (Ordinals or Payment) to reach that threshold.
 * - Outputs:
 *   1. Ordinals address, value = DUST (330 sats), change = false (Zeld change)
 *   2. zeld_output.address, value = DUST (330 sats), change = false
 *   3. Payment address, value = null, change = true (BTC change, if needed)
 * - Distribution: [change_zeld, zeld_output.amount]
 *   where change_zeld = total Zeld in inputs - zeld_output.amount
 */
export function prepareZeldSendHunt(
  paymentAddress: string,
  paymentUtxos: UtxoInfo[] | OrdinalsUtxo[],
  ordinalsAddress: string,
  ordinalsUtxos: OrdinalsUtxo[],
  zeldOutput: ZeldOutput,
  targetZeros: number,
  useGpu: boolean,
  network: NetworkType = 'mainnet'
): MinerArgs {
  // Need enough BTC for 3 DUST outputs (ZELD change + ZELD recipient + BTC change)
  const minBtcRequired = 3 * DUST;

  // Step 1: Select UTXOs with ZELD from BOTH ordinals and payment addresses
  // Combine all confirmed UTXOs with ZELD balance, tracking their source address
  type ZeldUtxoWithAddress = OrdinalsUtxo & { sourceAddress: string };

  const allZeldUtxos: ZeldUtxoWithAddress[] = [
    // Ordinals UTXOs with ZELD
    ...ordinalsUtxos
      .filter((u) => u.status.confirmed && u.zeldBalance > 0)
      .map((u) => ({ ...u, sourceAddress: ordinalsAddress })),
    // Payment UTXOs with ZELD (if they have zeldBalance property)
    ...(paymentUtxos as OrdinalsUtxo[])
      .filter((u) => u.status.confirmed && (u.zeldBalance ?? 0) > 0)
      .map((u) => ({ ...u, sourceAddress: paymentAddress })),
  ];

  // Sort by zeldBalance descending (greedy)
  allZeldUtxos.sort((a, b) => b.zeldBalance - a.zeldBalance);

  const selectedZeldUtxos: ZeldUtxoWithAddress[] = [];
  let totalZeldSelected = 0;

  for (const utxo of allZeldUtxos) {
    selectedZeldUtxos.push(utxo);
    totalZeldSelected += utxo.zeldBalance;
    if (totalZeldSelected >= zeldOutput.amount) {
      break;
    }
  }

  if (totalZeldSelected < zeldOutput.amount) {
    throw new MinerError('MINER_INSUFFICIENT_ZELD', { required: zeldOutput.amount, available: totalZeldSelected });
  }

  // Step 2: Check if we have enough BTC, add more UTXOs if needed
  let totalBtcSelected = selectedZeldUtxos.reduce((sum, u) => sum + u.value, 0);
  const additionalInputs: Array<{ utxo: UtxoInfo; address: string }> = [];

  // Track which UTXOs are already selected
  const selectedTxids = new Set(selectedZeldUtxos.map((u) => `${u.txid}:${u.vout}`));

  if (totalBtcSelected < minBtcRequired) {
    // First try remaining Ordinals UTXOs (without Zeld balance, or already not selected)
    const remainingOrdinalsUtxos = ordinalsUtxos
      .filter((u) => u.status.confirmed && !selectedTxids.has(`${u.txid}:${u.vout}`))
      .sort((a, b) => b.value - a.value);

    for (const utxo of remainingOrdinalsUtxos) {
      additionalInputs.push({ utxo, address: ordinalsAddress });
      totalBtcSelected += utxo.value;
      if (totalBtcSelected >= minBtcRequired) {
        break;
      }
    }

    // If still not enough, use Payment UTXOs
    if (totalBtcSelected < minBtcRequired) {
      const confirmedPaymentUtxos = paymentUtxos
        .filter((u) => u.status.confirmed && !selectedTxids.has(`${u.txid}:${u.vout}`))
        .sort((a, b) => b.value - a.value);

      for (const utxo of confirmedPaymentUtxos) {
        additionalInputs.push({ utxo, address: paymentAddress });
        totalBtcSelected += utxo.value;
        if (totalBtcSelected >= minBtcRequired) {
          break;
        }
      }
    }
  }

  if (totalBtcSelected < minBtcRequired) {
    throw new MinerError('MINER_INSUFFICIENT_BTC_FOR_ZELD', { required: minBtcRequired, available: totalBtcSelected });
  }

  // Build inputs (using the tracked source address for each UTXO)
  const inputs: TxInput[] = [
    ...selectedZeldUtxos.map((u) => utxoToTxInput(u, u.sourceAddress, network)),
    ...additionalInputs.map(({ utxo, address }) => utxoToTxInput(utxo, address, network)),
  ];

  // Build outputs
  const outputs: TxOutput[] = [
    { address: ordinalsAddress, amount: DUST, change: false }, // Zeld change
    { address: zeldOutput.address, amount: DUST, change: false }, // Zeld recipient
    { address: paymentAddress, change: true }, // BTC change
  ];

  // Calculate Zeld distribution
  // Distribution must have one entry per output (non-OP_RETURN):
  // [ordinalsAddress (Zeld change), zeldRecipient, paymentAddress (BTC change = 0 Zeld)]
  const changeZeld = BigInt(totalZeldSelected) - BigInt(zeldOutput.amount);
  const distribution: bigint[] = [changeZeld, BigInt(zeldOutput.amount), 0n];

  return {
    inputs,
    outputs,
    targetZeros,
    useGpu,
    distribution,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prepares arguments for zeldhash-miner based on the hunting mode.
 *
 * Dispatches to the appropriate helper function based on btc_output and zeld_output.
 */
export function prepareMinerArgs(
  paymentAddress: string,
  paymentUtxos: UtxoInfo[],
  ordinalsAddress: string,
  ordinalsUtxos: OrdinalsUtxo[],
  targetZeros: number,
  useGpu: boolean,
  btcOutput?: BtcOutput,
  zeldOutput?: ZeldOutput,
  network: NetworkType = 'mainnet'
): MinerArgs {
  // Validate target zeros
  if (targetZeros < 6 || targetZeros > 10) {
    throw new MinerError('MINER_INVALID_TARGET_ZEROS', { value: targetZeros });
  }

  // Case 3: Hunt with Zeld sending
  if (zeldOutput) {
    return prepareZeldSendHunt(
      paymentAddress,
      paymentUtxos,
      ordinalsAddress,
      ordinalsUtxos,
      zeldOutput,
      targetZeros,
      useGpu,
      network
    );
  }

  // Case 2: Hunt with BTC sending
  if (btcOutput) {
    return prepareBtcSendHunt(
      paymentAddress,
      paymentUtxos,
      ordinalsAddress,
      btcOutput,
      targetZeros,
      useGpu,
      network
    );
  }

  // Case 1: Simple hunt (no sending)
  return prepareSimpleHunt(
    paymentAddress,
    paymentUtxos,
    ordinalsAddress,
    targetZeros,
    useGpu,
    network
  );
}

