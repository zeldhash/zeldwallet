import {
  en, fr, zhCN, zhTW, es, hi, pt, vi, id, ar,
  tr, ru, ko, ja, th, tl, uk, de, pl, ur,
  fa, bn, nl, it, ms, sw, ro, cs, el, he,
} from './messages';

export type LocaleKey =
  | 'en' | 'zh-CN' | 'zh-TW' | 'es' | 'hi' | 'pt' | 'vi' | 'id' | 'ar' | 'tr'
  | 'ru' | 'ko' | 'ja' | 'th' | 'tl' | 'uk' | 'de' | 'fr' | 'pl' | 'ur'
  | 'fa' | 'bn' | 'nl' | 'it' | 'ms' | 'sw' | 'ro' | 'cs' | 'el' | 'he';

export type LocaleStrings = {
  title: string;
  securityActionsLabel: string;
  changePassword: string;
  changePasswordHint: string;
  newBackup: string;
  newBackupHint: string;
  noPasswordTitle: string;
  setPassword: string;
  setPasswordHint: string;
  setPasswordPlaceholder: string;
  setPasswordConfirmPlaceholder: string;
  setPasswordSubmit: string;
  setPasswordCancel: string;
  passwordMismatch: string;
  noBackupTitle: string;
  createBackup: string;
  backupHint: string;
  backupPasswordPlaceholder: string;
  backupSubmit: string;
  backupCancel: string;
  backupGenerated: string;
  backupCopyHelp: string;
  loading: string;
  generatingAddress: string;
  recoveringWallet: string;
  locked: string;
  lockedHint: string;
  connect: string;
  passwordPlaceholder: string;
  wrongPassword: string;
  showPassword: string;
  hidePassword: string;
  ready: string;
  readyHint: string;
  balancesHint: string;
  error: string;
  wrongNetwork: string;
  paymentLabel: string;
  paymentTooltip: string;
  ordinalsLabel: string;
  ordinalsTooltip: string;
  networkLabel: string;
  copy: string;
  copied: string;
  download: string;
  noAddresses: string;
  walletToggleLabel: string;
  walletInstalled: string;
  walletInstall: string;
  walletConnect: string;
  walletRequestAddresses: string;
  walletDescriptionZeld: string;
  walletDescriptionXverse: string;
  walletDescriptionLeather: string;
  walletDescriptionMagicEden: string;
  networkMainnet: string;
  networkTestnet: string;
  networkFallback: string;
  walletNotInstalled: string;
  walletBuiltIn: string;
  walletNoProviderResponse: string;
  walletUserCancelled: string;
  walletUserCancelledSigning: string;
  backupFilename: string;
  // Hunting section
  huntingSendBtc: string;
  huntingSendZeld: string;
  huntingSweep: string;
  huntingSweepAddressPlaceholder: string;
  huntingZeroCount: string;
  huntingUseGpu: string;
  huntingHunt: string;
  huntingAddressPlaceholder: string;
  huntingAmountPlaceholder: string;
  huntingAmountPlaceholderZeld: string;
  huntingDisabledNoBtc: string;
  huntingDisabledNoZeld: string;
  huntingDisabledInvalidAddress: string;
  huntingDisabledInvalidAmount: string;
  huntingDisabledInsufficientBtc: string;
  huntingDisabledInsufficientZeld: string;
  // Fee selection
  feeLabel: string;
  feeUnitLabel: string;
  feeModeSlow: string;
  feeModeMedium: string;
  feeModeFast: string;
  feeModeCustom: string;
  feeCustomPlaceholder: string;
  // Mining progress
  miningHashRate: string;
  miningAttempts: string;
  miningElapsed: string;
  miningStop: string;
  miningResume: string;
  miningStatusMining: string;
  miningStatusPaused: string;
  miningStatusFound: string;
  miningStatusSigning: string;
  miningStatusBroadcast: string;
  miningStatusError: string;
  miningCongrats: string;
  miningTxidLabel: string;
  miningSignAndBroadcast: string;
  miningViewOnMempool: string;
  miningCopyPsbt: string;
  miningRetry: string;
  miningCancel: string;
  // Confirmation dialog
  confirmDialogTitle: string;
  confirmDialogInputsLabel: string;
  confirmDialogOutputsLabel: string;
  confirmDialogFeeLabel: string;
  confirmDialogTotalLabel: string;
  confirmDialogConfirm: string;
  confirmDialogCancel: string;
  confirmDialogClose: string;
  confirmDialogChangeLabel: string;
  // Restore wallet
  restoreWallet: string;
  restoreWalletHint: string;
  restoreBackupPlaceholder: string;
  restorePasswordPlaceholder: string;
  restoreSubmit: string;
  restoreCancel: string;
  // Mnemonic restore
  restoreModeBackup: string;
  restoreModeMnemonic: string;
  restoreMnemonicPlaceholder: string;
  restoreNewPasswordPlaceholder: string;
  restoreConfirmPasswordPlaceholder: string;
  restoreAdvancedOptions: string;
  restorePaymentPathLabel: string;
  restoreOrdinalsPathLabel: string;
  restorePaymentPathPlaceholder: string;
  restoreOrdinalsPathPlaceholder: string;
  restoreMnemonicInvalid: string;
  restorePasswordMismatch: string;
  restorePasswordRequired: string;
  restoreDerivationPathInvalid: string;
  // Miner errors
  minerErrorNoUtxo: string;
  minerErrorInsufficientBtc: string;
  minerErrorInsufficientZeld: string;
  minerErrorInsufficientBtcForZeld: string;
  minerErrorInvalidTargetZeros: string;
  minerErrorNotInstalled: string;
};

export type LocaleStringsInput = Partial<LocaleStrings>;

const STRINGS: Record<LocaleKey, LocaleStringsInput> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'es': es,
  'hi': hi,
  'pt': pt,
  'vi': vi,
  'id': id,
  'ar': ar,
  'tr': tr,
  'ru': ru,
  'ko': ko,
  'ja': ja,
  'th': th,
  'tl': tl,
  'uk': uk,
  'de': de,
  'fr': fr,
  'pl': pl,
  'ur': ur,
  'fa': fa,
  'bn': bn,
  'nl': nl,
  'it': it,
  'ms': ms,
  'sw': sw,
  'ro': ro,
  'cs': cs,
  'el': el,
  'he': he,
};

/**
 * Mapping from base language codes to their default regional variant.
 * Used when a user provides just "zh" instead of "zh-CN" or "zh-TW".
 */
const BASE_TO_DEFAULT: Record<string, LocaleKey> = {
  'zh': 'zh-CN',
};

export function resolveLocale(input?: string): LocaleKey {
  const fallback: LocaleKey = 'en';
  if (!input) return fallback;

  const normalized = input.trim().toLowerCase();
  if (!normalized) return fallback;

  // Check exact match first (handles zh-cn, zh-tw, etc.)
  const exactKey = normalized as LocaleKey;
  if (exactKey in STRINGS) return exactKey;

  // Handle case variations like "zh-CN" vs "zh-cn"
  for (const key of Object.keys(STRINGS) as LocaleKey[]) {
    if (key.toLowerCase() === normalized) return key;
  }

  // Extract base language code
  const base = normalized.split('-')[0];

  // Check if base has a default regional variant
  if (base in BASE_TO_DEFAULT) {
    return BASE_TO_DEFAULT[base];
  }

  // Check if base is a valid locale key
  const baseKey = base as LocaleKey;
  if (baseKey in STRINGS) return baseKey;

  return fallback;
}

export function getStrings(lang?: string): LocaleStrings {
  const locale = resolveLocale(lang);
  const strings = STRINGS[locale];
  return { ...en, ...strings } as LocaleStrings;
}

export type TextDirection = 'ltr' | 'rtl';

const RTL_LOCALES: Set<LocaleKey> = new Set(['ar', 'he', 'fa', 'ur']);

export function getDirection(lang?: string): TextDirection {
  const locale = resolveLocale(lang);
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/**
 * Language metadata for UI display purposes.
 */
export interface LanguageInfo {
  code: LocaleKey;
  name: string;
  native: string;
  dir: 'ltr' | 'rtl';
}

export const languages: LanguageInfo[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文', dir: 'ltr' },
  { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr' },
  { code: 'ko', name: 'Korean', native: '한국어', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', native: '日本語', dir: 'ltr' },
  { code: 'th', name: 'Thai', native: 'ไทย', dir: 'ltr' },
  { code: 'tl', name: 'Filipino', native: 'Tagalog', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
  { code: 'pl', name: 'Polish', native: 'Polski', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'fa', name: 'Persian', native: 'فارسی', dir: 'rtl' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', dir: 'ltr' },
  { code: 'it', name: 'Italian', native: 'Italiano', dir: 'ltr' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', dir: 'ltr' },
  { code: 'ro', name: 'Romanian', native: 'Română', dir: 'ltr' },
  { code: 'cs', name: 'Czech', native: 'Čeština', dir: 'ltr' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', native: 'עברית', dir: 'rtl' },
];
