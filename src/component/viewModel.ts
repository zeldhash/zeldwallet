import type { NetworkType } from '../types';
import { formatBtc, formatZeld, truncateAddress } from './balance';
import { BITCOIN_ICON, ORDINALS_ICON } from './constants';
import type { LocaleStrings, TextDirection } from './i18n';
import type { ComponentState } from './state';
import { FALLBACK_ICON, type SupportedWalletId } from './wallets';

export type RenderTemplateProps = {
  state: ComponentState;
  network: NetworkType;
  dir: TextDirection;
  strings: LocaleStrings;
  showPasswordWarning: boolean;
  showBackupWarning: boolean;
  readyWithSecurity: boolean;
};

export type ActionKind = 'new-backup' | 'change-password';

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
  ready?: ReadyView;
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

const makeAction = (kind: ActionKind, strings: LocaleStrings): ActionView =>
  kind === 'new-backup'
    ? {
        kind,
        label: strings.newBackupHint,
        icon: '🛟',
        className: 'zeldwallet-icon-button zeldwallet-backup-button zeldwallet-new-backup-button',
      }
    : {
        kind,
        label: strings.changePasswordHint,
        icon: '🔑',
        className: 'zeldwallet-icon-button zeldwallet-change-password-button',
      };

export const buildViewModel = ({
  state,
  network,
  strings,
  showBackupWarning,
  showPasswordWarning,
  readyWithSecurity,
}: RenderTemplateProps): WalletViewModel => {
  const isExternal = state.walletKind === 'external';
  const warnings: InlineWarningView[] = [];
  if (showPasswordWarning && !isExternal) {
    warnings.push({
      type: 'password',
      tooltip: strings.setPasswordHint,
      ariaLabel: strings.noPasswordTitle,
      actions: [makeAction('change-password', strings)],
    });
  } else if (showBackupWarning && !isExternal) {
    warnings.push({
      type: 'backup',
      tooltip: strings.backupHint,
      ariaLabel: strings.noBackupTitle,
      actions: [makeAction('new-backup', strings), makeAction('change-password', strings)],
    });
  }

  const actions =
    readyWithSecurity && !isExternal ? [makeAction('new-backup', strings), makeAction('change-password', strings)] : [];

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

  const addresses = state.addresses ?? [];
  const payment = addresses.find((a) => a.purpose === 'payment');
  const ordinals = addresses.find((a) => a.purpose === 'ordinals');

  // Format balance for display
  const balanceView: BalanceView | undefined = state.balance
    ? {
        btcFormatted: formatBtc(state.balance.btcSats),
        zeldFormatted: formatZeld(state.balance.zeldBalance),
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
    ready,
    walletSwitcher,
  };
};

