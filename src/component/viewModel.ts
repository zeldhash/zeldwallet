import type { NetworkType } from '../types';
import { formatBtc, formatZeld, truncateAddress } from './balance';
import { BITCOIN_ICON, ORDINALS_ICON } from './constants';
import type { LocaleStrings, TextDirection } from './i18n';
import type { ComponentState, FeeMode } from './state';
import { FALLBACK_ICON, type SupportedWalletId } from './wallets';

export type RenderTemplateProps = {
  state: ComponentState;
  network: NetworkType;
  dir: TextDirection;
  strings: LocaleStrings;
  locale: string;
  showPasswordWarning: boolean;
  showBackupWarning: boolean;
  readyWithSecurity: boolean;
};

export type ActionKind = 'new-backup' | 'change-password' | 'restore';

export type ActionView = {
  kind: ActionKind;
  label: string;
  icon: string;
  className: string;
};

export type InlineWarningView = {
  type: 'password' | 'backup';
  tooltip: string;
  ariaLabel: string;
  actions: ActionView[];
};

export type StatusView = { variant: 'loading' | 'error'; message: string };

export type LockedView = {
  lockedLabel: string;
  lockedHint: string;
  passwordPlaceholder: string;
  submitLabel: string;
  error?: string;
};

export type SetPasswordFormView = {
  passwordPlaceholder: string;
  confirmPlaceholder: string;
  submitLabel: string;
  cancelLabel: string;
  error?: string;
};

export type BackupFormView = {
  passwordPlaceholder: string;
  submitLabel: string;
  cancelLabel: string;
  error?: string;
};

export type RestoreMode = 'backup' | 'mnemonic';

export type RestoreFormView = {
  // Mode toggle
  mode: RestoreMode;
  modeBackupLabel: string;
  modeMnemonicLabel: string;
  // Backup mode fields
  backupPlaceholder: string;
  passwordPlaceholder: string;
  // Mnemonic mode fields
  mnemonicPlaceholder: string;
  mnemonic: string;
  newPasswordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  password: string;
  confirmPassword: string;
  // Advanced options (derivation paths)
  advancedOptionsLabel: string;
  showAdvanced: boolean;
  paymentPathLabel: string;
  paymentPathPlaceholder: string;
  paymentPath: string;
  ordinalsPathLabel: string;
  ordinalsPathPlaceholder: string;
  ordinalsPath: string;
  // Common
  submitLabel: string;
  cancelLabel: string;
  error?: string;
};

export type BackupResultView = {
  value: string;
  title: string;
  hint: string;
  copyLabel: string;
  downloadLabel: string;
  cancelLabel: string;
};

export type BalanceType = 'btc' | 'zeld';

export type ReadyRowView = {
  label: string;
  icon?: string;
  tooltip?: string;
  value?: string;
  truncatedValue?: string;
  copyValue?: string;
  copyLabel: string;
  balanceType: BalanceType;
};

export type BalanceView = {
  btcFormatted: string;
  zeldFormatted: string;
  loading: boolean;
  error?: string;
};

export type ReadyView = {
  readyLabel: string;
  readyHint: string;
  balancesHint: string;
  rows: ReadyRowView[];
  networkLabel: string;
  network: NetworkType;
  balance?: BalanceView;
};

export type WalletOptionView = {
  id: SupportedWalletId;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  installUrl?: string;
  connectDisabled: boolean;
  connectLabel: string;
  installLabel: string;
  installedLabel: string;
};

export type WalletSwitcherView = {
  networkLabel: string;
  networkName: string;
  network: NetworkType;
  toggleLabel: string;
  open: boolean;
  options: WalletOptionView[];
};

/** Mining progress view */
export type MiningProgressView = {
  hashRateLabel: string;
  hashRateFormatted: string;
  attemptsLabel: string;
  attemptsFormatted: string;
  elapsedLabel: string;
  elapsedFormatted: string;
  stopLabel: string;
  resumeLabel: string;
  isPaused: boolean;
};

/** Mining result view */
export type MiningResultView = {
  congratsMessage: string;
  txidLabel: string;
  txid: string;
  psbt?: string;
  copyPsbtLabel: string;
  signAndBroadcastLabel: string;
  mempoolUrl?: string;
  viewOnMempoolLabel: string;
  retryLabel: string;
  cancelLabel: string;
  showSignButton: boolean;
  showMempoolLink: boolean;
};

/** Input row for confirmation dialog */
export type ConfirmDialogInputView = {
  txid: string;
  vout: number;
  address: string;
  addressTruncated: string;
  valueFormatted: string;
  valueSats: number;
  /** ZELD amount for this input (in minimal units, 8 decimals) */
  zeldAmount?: bigint;
};

/** Output row for confirmation dialog */
export type ConfirmDialogOutputView = {
  address: string;
  addressTruncated: string;
  valueFormatted: string;
  valueSats: number;
  isChange: boolean;
  /** Whether this is an OP_RETURN output */
  isOpReturn: boolean;
  /** Formatted OP_RETURN display string (e.g., "OP_RETURN: 12345" or "OP_RETURN: ZELD") */
  opReturnDisplay?: string;
  /** ZELD amount for this output (from distribution) */
  zeldAmount?: bigint;
};

/** Confirmation dialog view */
export type ConfirmDialogView = {
  visible: boolean;
  title: string;
  inputsLabel: string;
  outputsLabel: string;
  feeLabel: string;
  totalLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  changeLabel: string;
  inputs: ConfirmDialogInputView[];
  outputs: ConfirmDialogOutputView[];
  feeFormatted: string;
  feeSats: number;
  totalInputFormatted: string;
  totalOutputFormatted: string;
  /** True when the transaction has been successfully broadcast */
  isBroadcast: boolean;
  /** Mempool URL for viewing the broadcast transaction */
  mempoolUrl?: string;
  /** Label for the mempool link */
  viewOnMempoolLabel?: string;
};

/** Fee option for the selector */
export type FeeOptionView = {
  mode: FeeMode;
  label: string;
  rate: number;
  rateFormatted: string;
  selected: boolean;
};

export type HuntingView = {
  visible: boolean;
  sendBtcLabel: string;
  sendBtcChecked: boolean;
  sendBtcEnabled: boolean;
  sendZeldLabel: string;
  sendZeldChecked: boolean;
  sendZeldEnabled: boolean;
  sweepLabel: string;
  sweepChecked: boolean;
  sweepEnabled: boolean;
  zeroCountLabel: string;
  zeroCount: number;
  useGpuLabel: string;
  useGpu: boolean;
  huntLabel: string;
  huntEnabled: boolean;
  huntDisabledReason?: string;
  showSendFields: boolean;
  showSweepField: boolean;
  sendType: 'btc' | 'zeld' | 'sweep' | null;
  sweepAddressPlaceholder: string;
  addressPlaceholder: string;
  amountPlaceholder: string;
  recipientAddress: string;
  amount: string;
  addressError?: string;
  amountError?: string;
  // Fee selection
  feeLabel: string;
  feeUnitLabel: string;
  feeMode: FeeMode;
  feeOptions: FeeOptionView[];
  customFeeRate: string;
  customFeePlaceholder: string;
  showCustomFeeInput: boolean;
  feeLoading: boolean;
  feeError?: string;
  feeExpanded: boolean;
  currentFeeDisplay: string;
  // Mining state
  isMining: boolean;
  miningProgress?: MiningProgressView;
  miningResult?: MiningResultView;
  miningError?: string;
  miningStatusMessage?: string;
  // Labels for error state
  retryLabel: string;
  cancelLabel: string;
  // Confirmation dialog
  confirmDialog?: ConfirmDialogView;
};

export type WalletViewModel = {
  title: string;
  titleIcon: string;
  header: {
    actions: ActionView[];
    warnings: InlineWarningView[];
  };
  labels: {
    showPassword: string;
    hidePassword: string;
  };
  status?: StatusView;
  locked?: LockedView;
  setPasswordForm?: SetPasswordFormView;
  backupForm?: BackupFormView;
  backupResult?: BackupResultView;
  restoreForm?: RestoreFormView;
  ready?: ReadyView;
  hunting?: HuntingView;
  walletSwitcher: WalletSwitcherView;
};

const sanitizeWalletIcon = (icon?: string): string => {
  if (!icon) return FALLBACK_ICON;
  const trimmed = icon.trim();
  const isDataUrl = /^data:image\//i.test(trimmed);
  const isHttpUrl = /^https?:\/\//i.test(trimmed);
  const isInlineSvg = /^<svg[\s\S]*<\/svg>$/i.test(trimmed);

  if (isInlineSvg) return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;

  if (isDataUrl) {
    const [prefix, rawBody] = trimmed.split(/,(.+)/);
    if (!rawBody) return FALLBACK_ICON;
    const alreadyEncoded = /%3Csvg/i.test(rawBody);
    const hasUnsafeChars = /[<">\s]/.test(rawBody);
    if (alreadyEncoded || !hasUnsafeChars) return trimmed;
    return `${prefix},${encodeURIComponent(rawBody)}`;
  }

  if (isHttpUrl) return trimmed;

  return FALLBACK_ICON;
};

const makeAction = (kind: ActionKind, strings: LocaleStrings): ActionView => {
  switch (kind) {
    case 'new-backup':
      return {
        kind,
        label: strings.newBackupHint,
        icon: '🛟',
        className: 'zeldwallet-icon-button zeldwallet-backup-button zeldwallet-new-backup-button',
      };
    case 'change-password':
      return {
        kind,
        label: strings.changePasswordHint,
        icon: '🔑',
        className: 'zeldwallet-icon-button zeldwallet-change-password-button',
      };
    case 'restore':
      return {
        kind,
        label: strings.restoreWalletHint,
        icon: '📥',
        className: 'zeldwallet-icon-button zeldwallet-restore-button',
      };
  }
};

export const buildViewModel = ({
  state,
  network,
  strings,
  locale,
  showBackupWarning,
  showPasswordWarning,
  readyWithSecurity,
}: RenderTemplateProps): WalletViewModel => {
  const isExternal = state.walletKind === 'external';
  const warnings: InlineWarningView[] = [];
  
  // Build restore action (always available for ZeldWallet)
  const restoreAction = !isExternal ? makeAction('restore', strings) : null;
  
  if (showPasswordWarning && !isExternal) {
    // Show password warning with change-password action + restore button
    const warningActions = [makeAction('change-password', strings)];
    if (restoreAction) warningActions.push(restoreAction);
    warnings.push({
      type: 'password',
      tooltip: strings.setPasswordHint,
      ariaLabel: strings.noPasswordTitle,
      actions: warningActions,
    });
  } else if (showBackupWarning && !isExternal) {
    // Show backup warning with backup + change-password actions + restore button
    const warningActions = [makeAction('new-backup', strings), makeAction('change-password', strings)];
    if (restoreAction) warningActions.push(restoreAction);
    warnings.push({
      type: 'backup',
      tooltip: strings.backupHint,
      ariaLabel: strings.noBackupTitle,
      actions: warningActions,
    });
  }

  // Build header actions:
  // - Backup and change password only show when ready with security
  // - Restore button is always visible when ZeldWallet is selected (even if not connected/no wallet)
  // - Restore appears on the right side of other buttons
  const actions: ActionView[] = [];
  if (readyWithSecurity && !isExternal) {
    actions.push(makeAction('new-backup', strings), makeAction('change-password', strings));
  }
  if (restoreAction) {
    // Restore is always available for ZeldWallet
    actions.push(restoreAction);
  }

  const status: StatusView | undefined =
    state.status === 'loading'
      ? { variant: 'loading', message: strings.loading }
      : state.status === 'generating'
        ? { variant: 'loading', message: strings.generatingAddress }
        : state.status === 'recovering'
          ? { variant: 'loading', message: strings.recoveringWallet }
          : state.status === 'error'
            ? { variant: 'error', message: state.message ?? strings.error }
            : undefined;

  const locked: LockedView | undefined =
    state.status === 'locked' && !isExternal
      ? {
          lockedLabel: strings.locked,
          lockedHint: strings.lockedHint,
          passwordPlaceholder: strings.passwordPlaceholder,
          submitLabel: strings.connect,
          error: state.passwordError,
        }
      : undefined;

  const setPasswordForm: SetPasswordFormView | undefined = state.showSetPasswordForm
    ? {
        passwordPlaceholder: strings.setPasswordPlaceholder,
        confirmPlaceholder: strings.setPasswordConfirmPlaceholder,
        submitLabel: strings.setPasswordSubmit,
        cancelLabel: strings.setPasswordCancel,
        error: state.setPasswordError,
      }
    : undefined;

  const backupForm: BackupFormView | undefined = state.showBackupForm && !isExternal
    ? {
        passwordPlaceholder: strings.backupPasswordPlaceholder,
        submitLabel: strings.backupSubmit,
        cancelLabel: strings.backupCancel,
        error: state.backupError,
      }
    : undefined;

  const backupResult: BackupResultView | undefined =
    state.status === 'ready' && state.backupValue && !isExternal
      ? {
          value: state.backupValue,
          title: strings.backupGenerated,
          hint: strings.backupCopyHelp,
          copyLabel: strings.copy,
          downloadLabel: strings.download,
          cancelLabel: strings.backupCancel,
        }
      : undefined;

  const mnemonicState = state.mnemonicRestoreState;
  const restoreForm: RestoreFormView | undefined = state.showRestoreForm && !isExternal
    ? {
        // Mode toggle
        mode: state.restoreMode ?? 'backup',
        modeBackupLabel: strings.restoreModeBackup,
        modeMnemonicLabel: strings.restoreModeMnemonic,
        // Backup mode fields
        backupPlaceholder: strings.restoreBackupPlaceholder,
        passwordPlaceholder: strings.restorePasswordPlaceholder,
        // Mnemonic mode fields
        mnemonicPlaceholder: strings.restoreMnemonicPlaceholder,
        mnemonic: mnemonicState?.mnemonic ?? '',
        newPasswordPlaceholder: strings.restoreNewPasswordPlaceholder,
        confirmPasswordPlaceholder: strings.restoreConfirmPasswordPlaceholder,
        password: mnemonicState?.password ?? '',
        confirmPassword: mnemonicState?.confirmPassword ?? '',
        // Advanced options
        advancedOptionsLabel: strings.restoreAdvancedOptions,
        showAdvanced: mnemonicState?.showAdvanced ?? false,
        paymentPathLabel: strings.restorePaymentPathLabel,
        paymentPathPlaceholder: strings.restorePaymentPathPlaceholder,
        paymentPath: mnemonicState?.paymentDerivationPath ?? strings.restorePaymentPathPlaceholder,
        ordinalsPathLabel: strings.restoreOrdinalsPathLabel,
        ordinalsPathPlaceholder: strings.restoreOrdinalsPathPlaceholder,
        ordinalsPath: mnemonicState?.ordinalsDerivationPath ?? strings.restoreOrdinalsPathPlaceholder,
        // Common
        submitLabel: strings.restoreSubmit,
        cancelLabel: strings.restoreCancel,
        error: state.restoreError,
      }
    : undefined;

  const addresses = state.addresses ?? [];
  const payment = addresses.find((a) => a.purpose === 'payment');
  const ordinals = addresses.find((a) => a.purpose === 'ordinals');

  // Format balance for display
  const balanceView: BalanceView | undefined = state.balance
    ? {
        btcFormatted: formatBtc(state.balance.btcSats, locale),
        zeldFormatted: formatZeld(state.balance.zeldBalance, locale),
        loading: state.balance.loading,
        error: state.balance.error,
      }
    : undefined;

  const walletDescriptions: Record<SupportedWalletId, string> = {
    zeld: strings.walletDescriptionZeld,
    xverse: strings.walletDescriptionXverse,
    leather: strings.walletDescriptionLeather,
    magicEden: strings.walletDescriptionMagicEden,
  };

  const networkName = network === 'testnet' ? strings.networkTestnet : strings.networkMainnet;

  const ready: ReadyView | undefined =
    state.status === 'ready'
      ? {
          readyLabel: strings.ready,
          readyHint: strings.readyHint,
          balancesHint: strings.balancesHint,
          rows: [
            {
              label: strings.paymentLabel,
              icon: BITCOIN_ICON,
              tooltip: strings.paymentTooltip,
              value: payment?.address ?? strings.noAddresses,
              truncatedValue: payment?.address ? truncateAddress(payment.address) : strings.noAddresses,
              copyValue: payment?.address,
              copyLabel: strings.copy,
              balanceType: 'btc',
            },
            {
              label: strings.ordinalsLabel,
              icon: ORDINALS_ICON,
              tooltip: strings.ordinalsTooltip,
              value: ordinals?.address ?? strings.noAddresses,
              truncatedValue: ordinals?.address ? truncateAddress(ordinals.address) : strings.noAddresses,
              copyValue: ordinals?.address,
              copyLabel: strings.copy,
              balanceType: 'zeld',
            },
          ],
          networkLabel: strings.networkLabel,
          network,
          balance: balanceView,
        }
      : undefined;

  const options = (state.walletOptions ?? []).map((opt) => ({
    ...opt,
    description: walletDescriptions[opt.id] ?? opt.description,
    icon: sanitizeWalletIcon(opt.icon),
  }));

  const filteredOptions = options.filter((opt) => opt.id !== state.activeWalletId);

  const walletSwitcher: WalletSwitcherView = {
    networkLabel: strings.networkLabel,
    networkName,
    network,
    toggleLabel: strings.walletToggleLabel,
    open: state.walletPickerOpen,
    options: filteredOptions.map((opt) => ({
      ...opt,
      connectDisabled: !opt.installed,
      connectLabel: strings.walletConnect.replace('{wallet}', opt.name),
      installLabel: strings.walletInstall,
      installedLabel: strings.walletInstalled,
    })),
  };

  const activeOption = options.find((opt) => opt.id === state.activeWalletId);
  const titleIcon = sanitizeWalletIcon(activeOption?.icon);

  // Build hunting view
  const hunting = buildHuntingView(state, strings, locale);

  return {
    title: state.activeWalletName || strings.title,
    titleIcon,
    header: { actions, warnings },
    labels: { showPassword: strings.showPassword, hidePassword: strings.hidePassword },
    status,
    locked,
    setPasswordForm,
    backupForm,
    backupResult,
    restoreForm,
    ready,
    hunting,
    walletSwitcher,
  };
};

/**
 * Gets the display string for the current fee selection.
 */
function getCurrentFeeDisplay(
  hunting: NonNullable<ComponentState['hunting']>,
  feeModeLabels: Record<FeeMode, string>
): string {
  const recommendedFees = hunting.recommendedFees ?? { slow: 6, medium: 12, fast: 24 };
  const mode = hunting.feeMode;
  const label = feeModeLabels[mode];
  
  if (mode === 'custom') {
    const rate = parseFloat(hunting.customFeeRate.trim()) || 0;
    return rate > 0 ? `${label} (${rate})` : label;
  }
  
  const rate = recommendedFees[mode];
  return `${label} (${rate})`;
}

/**
 * Builds the hunting section view model.
 */
function buildHuntingView(state: ComponentState, strings: LocaleStrings, locale: string): HuntingView | undefined {
  // Only show hunting section when wallet is ready
  if (state.status !== 'ready') {
    return undefined;
  }

  const hunting = state.hunting;
  if (!hunting) {
    return undefined;
  }

  const btcSats = state.balance?.btcSats ?? 0;
  const zeldBalance = state.balance?.zeldBalance ?? 0;

  // Simplified enable conditions - let zeldhash-miner handle insufficient balance errors
  const sendBtcEnabled = btcSats > 0;
  const sendZeldEnabled = btcSats > 0 && zeldBalance > 0;
  const sweepEnabled = btcSats > 0;

  // Determine which send fields to show
  const showSendFields = hunting.sendBtcChecked || hunting.sendZeldChecked;
  const showSweepField = hunting.sweepChecked;
  const sendType = hunting.sendBtcChecked ? 'btc' : hunting.sendZeldChecked ? 'zeld' : hunting.sweepChecked ? 'sweep' : null;

  // Calculate hunt button enabled state and reason
  const { huntEnabled, huntDisabledReason } = computeHuntEnabled(
    hunting,
    btcSats,
    zeldBalance,
    strings
  );

  // Build mining state views
  // Note: 'error' status is NOT mining - we want to show the error UI, not mining UI
  const isMining = hunting.miningStatus === 'mining' || hunting.miningStatus === 'paused';
  const miningProgress = buildMiningProgressView(hunting, strings);
  const miningResult = buildMiningResultView(hunting, strings);
  
  // Status message
  let miningStatusMessage: string | undefined;
  switch (hunting.miningStatus) {
    case 'mining':
      miningStatusMessage = strings.miningStatusMining;
      break;
    case 'paused':
      miningStatusMessage = strings.miningStatusPaused;
      break;
    case 'found':
      miningStatusMessage = strings.miningStatusFound;
      break;
    case 'signing':
      miningStatusMessage = strings.miningStatusSigning;
      break;
    case 'broadcast':
      miningStatusMessage = strings.miningStatusBroadcast;
      break;
    case 'error':
      miningStatusMessage = strings.miningStatusError;
      break;
  }

  // Build fee options
  const recommendedFees = hunting.recommendedFees ?? { slow: 6, medium: 12, fast: 24 };
  const feeModeLabels: Record<FeeMode, string> = {
    slow: strings.feeModeSlow,
    medium: strings.feeModeMedium,
    fast: strings.feeModeFast,
    custom: strings.feeModeCustom,
  };

  const feeOptions: FeeOptionView[] = (['slow', 'medium', 'fast', 'custom'] as FeeMode[]).map((mode) => {
    const rate = mode === 'custom'
      ? (parseFloat(hunting.customFeeRate.trim()) || 0)
      : recommendedFees[mode];
    return {
      mode,
      label: feeModeLabels[mode],
      rate,
      rateFormatted: mode === 'custom' && !hunting.customFeeRate.trim() ? '—' : `${rate}`,
      selected: hunting.feeMode === mode,
    };
  });

  return {
    visible: true,
    sendBtcLabel: strings.huntingSendBtc,
    sendBtcChecked: hunting.sendBtcChecked,
    sendBtcEnabled,
    sendZeldLabel: strings.huntingSendZeld,
    sendZeldChecked: hunting.sendZeldChecked,
    sendZeldEnabled,
    sweepLabel: strings.huntingSweep,
    sweepChecked: hunting.sweepChecked,
    sweepEnabled,
    zeroCountLabel: strings.huntingZeroCount,
    zeroCount: hunting.zeroCount,
    useGpuLabel: strings.huntingUseGpu,
    useGpu: hunting.useGpu,
    huntLabel: strings.huntingHunt,
    huntEnabled: huntEnabled && !isMining,
    huntDisabledReason: isMining ? strings.miningStatusMining : huntDisabledReason,
    showSendFields,
    showSweepField,
    sendType,
    sweepAddressPlaceholder: strings.huntingSweepAddressPlaceholder,
    addressPlaceholder: strings.huntingAddressPlaceholder,
    amountPlaceholder: sendType === 'zeld' ? strings.huntingAmountPlaceholderZeld : strings.huntingAmountPlaceholder,
    recipientAddress: hunting.recipientAddress,
    amount: hunting.amount,
    addressError: hunting.addressError,
    amountError: hunting.amountError,
    // Fee selection
    feeLabel: strings.feeLabel,
    feeUnitLabel: strings.feeUnitLabel,
    feeMode: hunting.feeMode,
    feeOptions,
    customFeeRate: hunting.customFeeRate,
    customFeePlaceholder: strings.feeCustomPlaceholder,
    showCustomFeeInput: hunting.feeMode === 'custom',
    feeLoading: hunting.feeLoading ?? false,
    feeError: hunting.feeError,
    feeExpanded: hunting.feeExpanded ?? false,
    currentFeeDisplay: getCurrentFeeDisplay(hunting, feeModeLabels),
    isMining,
    miningProgress,
    miningResult,
    miningError: hunting.miningError,
    miningStatusMessage,
    retryLabel: strings.miningRetry,
    cancelLabel: strings.miningCancel,
    confirmDialog: buildConfirmDialogView(hunting, strings, locale),
  };
}

/**
 * Builds the confirmation dialog view model.
 */
function buildConfirmDialogView(
  hunting: NonNullable<ComponentState['hunting']>,
  strings: LocaleStrings,
  locale: string
): ConfirmDialogView | undefined {
  if (!hunting.showConfirmDialog || !hunting.parsedTransaction) {
    return undefined;
  }

  const tx = hunting.parsedTransaction;

  const inputs: ConfirmDialogInputView[] = tx.inputs.map((input) => ({
    txid: input.txid,
    vout: input.vout,
    address: input.address,
    addressTruncated: truncateAddress(input.address),
    valueFormatted: formatBtc(input.value, locale),
    valueSats: input.value,
    zeldAmount: input.zeldBalance !== undefined && input.zeldBalance > 0 
      ? BigInt(input.zeldBalance) 
      : undefined,
  }));

  // Find ZELD distribution from OP_RETURN output (if any)
  const opReturnOutput = tx.outputs.find((o) => o.opReturn?.type === 'zeld');
  const zeldDistribution = opReturnOutput?.opReturn?.distribution;
  
  // Count non-OP_RETURN outputs to match distribution
  const nonOpReturnOutputs = tx.outputs.filter((o) => !o.opReturn);
  const nonOpReturnCount = nonOpReturnOutputs.length;
  
  // Find the index of the last non-OP_RETURN output
  let lastNonOpReturnIndex = -1;
  for (let i = tx.outputs.length - 1; i >= 0; i--) {
    if (!tx.outputs[i].opReturn) {
      lastNonOpReturnIndex = i;
      break;
    }
  }

  // Track non-OP_RETURN output index for distribution mapping
  let nonOpReturnIdx = 0;

  const outputs: ConfirmDialogOutputView[] = tx.outputs.map((output, idx) => {
    const isOpReturn = !!output.opReturn;
    let opReturnDisplay: string | undefined;
    let zeldAmount: bigint | undefined;
    
    if (output.opReturn) {
      if (output.opReturn.type === 'zeld' && output.opReturn.distribution) {
        // ZELD distribution OP_RETURN - show full array including nonce
        opReturnDisplay = `OP_RETURN: ZELD [${output.opReturn.distribution.join(', ')}]`;
      } else if (output.opReturn.type === 'nonce' && output.opReturn.nonce !== undefined) {
        // Simple nonce
        opReturnDisplay = `OP_RETURN: ${output.opReturn.nonce.toString()}`;
      } else {
        opReturnDisplay = 'OP_RETURN';
      }
    } else {
      // For non-OP_RETURN outputs, get the ZELD amount from distribution
      // The distribution array has distribution amounts + nonce as last element
      // We need to take only the first N elements where N = number of non-OP_RETURN outputs
      if (zeldDistribution && nonOpReturnIdx < nonOpReturnCount && nonOpReturnIdx < zeldDistribution.length) {
        zeldAmount = zeldDistribution[nonOpReturnIdx];
      }
      nonOpReturnIdx++;
    }
    
    // Only mark the last non-OP_RETURN output as change
    const isChange = idx === lastNonOpReturnIndex;
    
    return {
      address: output.address,
      addressTruncated: isOpReturn ? (opReturnDisplay ?? 'OP_RETURN') : truncateAddress(output.address),
      valueFormatted: formatBtc(output.value, locale),
      valueSats: output.value,
      isChange,
      isOpReturn,
      opReturnDisplay,
      zeldAmount,
    };
  });

  const isBroadcast = hunting.miningStatus === 'broadcast';
  const broadcastTxid = hunting.broadcastTxid;

  return {
    visible: true,
    title: strings.confirmDialogTitle,
    inputsLabel: strings.confirmDialogInputsLabel,
    outputsLabel: strings.confirmDialogOutputsLabel,
    feeLabel: strings.confirmDialogFeeLabel,
    totalLabel: strings.confirmDialogTotalLabel,
    confirmLabel: strings.confirmDialogConfirm,
    cancelLabel: strings.confirmDialogCancel,
    closeLabel: strings.confirmDialogClose,
    changeLabel: strings.confirmDialogChangeLabel,
    inputs,
    outputs,
    feeFormatted: formatBtc(tx.fee, locale),
    feeSats: tx.fee,
    totalInputFormatted: formatBtc(tx.totalInputValue, locale),
    totalOutputFormatted: formatBtc(tx.totalOutputValue, locale),
    isBroadcast,
    mempoolUrl: broadcastTxid ? `https://mempool.space/tx/${broadcastTxid}` : undefined,
    viewOnMempoolLabel: strings.miningViewOnMempool,
  };
}

/**
 * Computes whether the Hunt button should be enabled and the reason if disabled.
 * Simplified: only basic checks here, let zeldhash-miner handle insufficient balance errors.
 */
function computeHuntEnabled(
  hunting: NonNullable<ComponentState['hunting']>,
  btcSats: number,
  zeldBalance: number,
  strings: LocaleStrings
): { huntEnabled: boolean; huntDisabledReason?: string } {
  // Case 1: Simple hunt (no checkboxes checked) - just need some BTC
  if (!hunting.sendBtcChecked && !hunting.sendZeldChecked && !hunting.sweepChecked) {
    if (btcSats <= 0) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledNoBtc };
    }
    return { huntEnabled: true };
  }

  // Case 2: Send BTC checked - need BTC > 0 and valid address/amount
  if (hunting.sendBtcChecked) {
    if (btcSats <= 0) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledNoBtc };
    }
    // Need valid address
    if (!hunting.recipientAddress.trim() || hunting.addressError) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInvalidAddress };
    }
    // Need valid amount format (actual balance check done by miner)
    const amountSats = parseBtcAmount(hunting.amount);
    if (amountSats <= 0 || hunting.amountError) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInvalidAmount };
    }
    return { huntEnabled: true };
  }

  // Case 3: Send ZELD checked - need BTC > 0, ZELD > 0, and valid address/amount
  if (hunting.sendZeldChecked) {
    if (btcSats <= 0) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledNoBtc };
    }
    if (zeldBalance <= 0) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInsufficientZeld };
    }
    // Need valid address
    if (!hunting.recipientAddress.trim() || hunting.addressError) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInvalidAddress };
    }
    // Need valid amount format (actual balance check done by miner)
    const amountZeld = parseZeldAmount(hunting.amount);
    if (amountZeld <= 0 || hunting.amountError) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInvalidAmount };
    }
    return { huntEnabled: true };
  }

  // Case 4: Sweep checked - need BTC > 0 and valid destination address
  if (hunting.sweepChecked) {
    if (btcSats <= 0) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledNoBtc };
    }
    // Need valid destination address
    if (!hunting.recipientAddress.trim() || hunting.addressError) {
      return { huntEnabled: false, huntDisabledReason: strings.huntingDisabledInvalidAddress };
    }
    return { huntEnabled: true };
  }

  return { huntEnabled: true };
}

/**
 * Parses a BTC amount string to satoshis.
 */
function parseBtcAmount(amount: string): number {
  const trimmed = amount.trim();
  if (!trimmed) return 0;
  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100_000_000);
}

/**
 * Parses a ZELD amount string to minimal units (8 decimals like BTC).
 */
function parseZeldAmount(amount: string): number {
  const trimmed = amount.trim();
  if (!trimmed) return 0;
  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100_000_000);
}

/**
 * Formats hash rate to human-readable string.
 */
function formatHashRate(rate: number): string {
  if (rate >= 1_000_000_000) return `${(rate / 1_000_000_000).toFixed(2)} GH/s`;
  if (rate >= 1_000_000) return `${(rate / 1_000_000).toFixed(2)} MH/s`;
  if (rate >= 1_000) return `${(rate / 1_000).toFixed(2)} kH/s`;
  return `${rate.toFixed(0)} H/s`;
}

/**
 * Formats attempts count to human-readable string.
 */
function formatAttempts(attempts: bigint): string {
  if (attempts >= 1_000_000_000n) return `${(Number(attempts) / 1_000_000_000).toFixed(2)}B`;
  if (attempts >= 1_000_000n) return `${(Number(attempts) / 1_000_000).toFixed(2)}M`;
  if (attempts >= 1_000n) return `${(Number(attempts) / 1_000).toFixed(2)}K`;
  return attempts.toString();
}

/**
 * Formats elapsed time in ms to human-readable string.
 */
function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Builds the mining progress view model.
 * Shows stats during mining/paused states, and also when result is found (to display final stats).
 */
function buildMiningProgressView(
  hunting: NonNullable<ComponentState['hunting']>,
  strings: LocaleStrings
): MiningProgressView | undefined {
  // Show progress during active mining or paused
  if (hunting.miningStatus === 'mining' || hunting.miningStatus === 'paused') {
    const stats = hunting.miningStats;
    return {
      hashRateLabel: strings.miningHashRate,
      hashRateFormatted: stats ? formatHashRate(stats.hashRate) : '0 H/s',
      attemptsLabel: strings.miningAttempts,
      attemptsFormatted: stats ? formatAttempts(stats.hashesProcessed) : '0',
      elapsedLabel: strings.miningElapsed,
      elapsedFormatted: stats ? formatElapsed(stats.elapsedMs) : '0s',
      stopLabel: strings.miningStop,
      resumeLabel: strings.miningResume,
      isPaused: hunting.miningStatus === 'paused',
    };
  }

  // Also show final stats when hash is found, signing, or broadcast
  // Use miningResult for attempts/duration, and miningStats for hashRate
  if (hunting.miningStatus === 'found' || hunting.miningStatus === 'signing' || hunting.miningStatus === 'broadcast') {
    const result = hunting.miningResult;
    const stats = hunting.miningStats;
    
    // Use result data if available (more accurate final values), fallback to stats
    const attempts = result?.attempts ?? stats?.hashesProcessed ?? 0n;
    const elapsedMs = result?.duration ?? stats?.elapsedMs ?? 0;
    const hashRate = stats?.hashRate ?? (elapsedMs > 0 ? Number(attempts) / (elapsedMs / 1000) : 0);
    
    return {
      hashRateLabel: strings.miningHashRate,
      hashRateFormatted: formatHashRate(hashRate),
      attemptsLabel: strings.miningAttempts,
      attemptsFormatted: formatAttempts(typeof attempts === 'bigint' ? attempts : BigInt(attempts)),
      elapsedLabel: strings.miningElapsed,
      elapsedFormatted: formatElapsed(elapsedMs),
      stopLabel: strings.miningStop,
      resumeLabel: strings.miningResume,
      isPaused: false,
    };
  }

  return undefined;
}

/**
 * Builds the mining result view model.
 */
function buildMiningResultView(
  hunting: NonNullable<ComponentState['hunting']>,
  strings: LocaleStrings
): MiningResultView | undefined {
  if (hunting.miningStatus !== 'found' && hunting.miningStatus !== 'signing' && hunting.miningStatus !== 'broadcast') {
    return undefined;
  }

  const result = hunting.miningResult;
  const txid = result?.txid ?? '';
  const psbt = result?.psbt;
  const broadcastTxid = hunting.broadcastTxid;
  const showMempoolLink = !!broadcastTxid;
  const mempoolUrl = broadcastTxid ? `https://mempool.space/tx/${broadcastTxid}` : undefined;

  return {
    congratsMessage: strings.miningCongrats,
    txidLabel: strings.miningTxidLabel,
    txid,
    psbt,
    copyPsbtLabel: strings.miningCopyPsbt,
    signAndBroadcastLabel: strings.miningSignAndBroadcast,
    mempoolUrl,
    viewOnMempoolLabel: strings.miningViewOnMempool,
    retryLabel: strings.miningRetry,
    cancelLabel: showMempoolLink ? strings.confirmDialogClose : strings.miningCancel,
    showSignButton: hunting.miningStatus === 'found',
    showMempoolLink,
  };
}

