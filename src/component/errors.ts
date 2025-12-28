import type { NetworkType } from '../types';
import { getStrings, type LocaleKey } from './i18n';
import type { MinerErrorCode } from './miner';

/**
 * Helper to replace placeholders in a string with values from params.
 * Replaces {key} with params[key].
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export const describeError = (error: unknown, locale: LocaleKey): string => {
  const strings = getStrings(locale);
  const code = (error as { code?: string })?.code;
  const expectedNetwork = (error as { expected?: NetworkType })?.expected;
  const params = (error as { params?: Record<string, string | number> })?.params ?? {};

  if (code === 'wrong-network') {
    const networkLabel =
      expectedNetwork === 'mainnet'
        ? strings.networkMainnet
        : expectedNetwork === 'testnet'
          ? strings.networkTestnet
          : expectedNetwork ?? strings.networkFallback;
    return strings.wrongNetwork.replace('{network}', String(networkLabel));
  }

  if (code === 'wallet-not-installed') return strings.walletNotInstalled;
  if (code === 'wallet-built-in') return strings.walletBuiltIn;
  if (code === 'wallet-no-provider') return strings.walletNoProviderResponse;
  if (code === 'user-cancelled') return strings.walletUserCancelled;
  if (code === 'user-cancelled-signing') return strings.walletUserCancelledSigning;

  // Miner errors
  const minerErrorMap: Record<MinerErrorCode, keyof typeof strings> = {
    'MINER_NO_UTXO': 'minerErrorNoUtxo',
    'MINER_INSUFFICIENT_BTC': 'minerErrorInsufficientBtc',
    'MINER_INSUFFICIENT_ZELD': 'minerErrorInsufficientZeld',
    'MINER_INSUFFICIENT_BTC_FOR_ZELD': 'minerErrorInsufficientBtcForZeld',
    'MINER_INVALID_TARGET_ZEROS': 'minerErrorInvalidTargetZeros',
    'MINER_NOT_INSTALLED': 'minerErrorNotInstalled',
  };

  if (code && code in minerErrorMap) {
    const key = minerErrorMap[code as MinerErrorCode];
    const template = strings[key];
    return interpolate(template, params);
  }

  if (!error) return strings.error;
  if (error instanceof Error) return error.message || strings.error;
  if (typeof error === 'string') return error;
  return strings.error;
};

export const isPasswordRequiredError = (error: unknown, locale: LocaleKey): boolean => {
  const message = describeError(error, locale).toLowerCase();
  return message.includes('password required') || message.includes('unlock storage');
};

export const isWrongPasswordError = (error: unknown, locale: LocaleKey): boolean => {
  const message = describeError(error, locale).toLowerCase();
  return message.includes('incorrect') || message.includes('decryption failed');
};

