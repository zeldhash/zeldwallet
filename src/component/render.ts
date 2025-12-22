import { componentStyles } from './styles';
import {
  buildViewModel,
  type ActionView,
  type BalanceType,
  type BalanceView,
  type InlineWarningView,
  type RenderTemplateProps,
  type WalletViewModel,
  type WalletSwitcherView,
} from './viewModel';

// SVG icons for buttons
const COPY_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const COPIED_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const DOWNLOAD_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const CANCEL_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
// Unlock icon for Connect button
const UNLOCK_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
// Checkmark icon for Save Password button
const CHECK_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ZAP_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
const CHEVRON_ICON = `<svg class="zeldwallet-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
export { COPY_ICON, COPIED_ICON, DOWNLOAD_ICON, CANCEL_ICON, UNLOCK_ICON, CHECK_ICON };

const buildStatusBlock = (status?: WalletViewModel['status'], isGenerating?: boolean): string => {
  if (!status) return '';
  if (isGenerating) {
    return `<div class="zeldwallet-status zeldwallet-status--generating">
      <div class="zeldwallet-spinner" aria-hidden="true"></div>
      <span>${status.message}</span>
    </div>`;
  }
  const variantClass = status.variant === 'loading' ? 'zeldwallet-status--loading' : 'zeldwallet-status--error';
  return `<div class="zeldwallet-status ${variantClass}">${status.message}</div>`;
};

const buildWarningIcon = (): string => `
      <svg class="zeldwallet-warning-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#ef4444"
          d="M10.29 3.86 1.82 18.02A1.5 1.5 0 0 0 3.12 20.25h17.76a1.5 1.5 0 0 0 1.3-2.23L13.7 3.86a1.5 1.5 0 0 0-2.61 0Z"
        />
        <path fill="#fff" d="M11 9h2l-.35 5h-1.3L11 9Zm0 7h2v2h-2v-2Z" />
      </svg>
    `;

const buildInlineWarning = (warning: InlineWarningView): string => {
  const containerClass =
    warning.type === 'password' ? 'zeldwallet-inline-warning--password' : 'zeldwallet-inline-warning--backup';

  const [primaryAction, ...secondaryActions] = warning.actions;
  const primaryButton = primaryAction
    ? `
          <button
            class="${primaryAction.className} zeldwallet-warning-action"
            type="button"
            data-tooltip="${primaryAction.label}"
            aria-label="${primaryAction.label}"
          >
            ${primaryAction.icon}
          </button>
        `
    : '';

  const secondaryButtons = secondaryActions
    .map(
      (action) => `
        <button
          class="${action.className}"
          type="button"
          data-tooltip="${action.label}"
          aria-label="${action.label}"
        >
          ${action.icon}
        </button>
      `
    )
    .join('');

  return `
    <div class="zeldwallet-inline-warning-row">
      <div class="zeldwallet-inline-warning ${containerClass}" role="alert" aria-label="${warning.ariaLabel}">
        <div class="zeldwallet-inline-warning__badge" tabindex="0" aria-label="${warning.tooltip}">
          ${buildWarningIcon()}
          <div class="zeldwallet-inline-warning__tooltip">${warning.tooltip}</div>
        </div>
        ${primaryButton}
      </div>
      ${secondaryButtons}
    </div>
  `;
};

const buildSubtitle = (warnings: InlineWarningView[]): string => {
  if (!warnings.length) return '';
  return warnings.map(buildInlineWarning).join('');
};

const buildSetPasswordForm = (
  setPasswordForm: WalletViewModel['setPasswordForm'],
  labels: WalletViewModel['labels']
): string => {
  if (!setPasswordForm) return '';
  return `
      <form class="zeldwallet-set-password-form zeldwallet-change-password-form">
        <div class="zeldwallet-password-field" data-password-field>
          <input
            class="zeldwallet-set-password-input"
            type="password"
            name="set-wallet-password"
            placeholder="${setPasswordForm.passwordPlaceholder}"
            autocomplete="new-password"
            required
          />
          <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
        </div>
        <div class="zeldwallet-password-field" data-password-field>
          <input
            class="zeldwallet-set-password-input zeldwallet-set-password-confirm-input"
            type="password"
            name="confirm-wallet-password"
            placeholder="${setPasswordForm.confirmPlaceholder}"
            autocomplete="new-password"
            required
          />
          <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
        </div>
        <div class="zeldwallet-set-password-actions">
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-set-password-submit" type="submit" data-tooltip="${setPasswordForm.submitLabel}" aria-label="${setPasswordForm.submitLabel}">${CHECK_ICON}</button>
          <button class="zeldwallet-set-password-cancel zeldwallet-cancel-icon" type="button" data-tooltip="${setPasswordForm.cancelLabel}" aria-label="${setPasswordForm.cancelLabel}">${CANCEL_ICON}</button>
        </div>
        ${setPasswordForm.error ? `<div class="zeldwallet-password-error">${setPasswordForm.error}</div>` : ''}
      </form>
    `;
};

const buildLockedBlock = (locked: WalletViewModel['locked'], labels: WalletViewModel['labels']): string => {
  if (!locked) return '';
  return `
      <form class="zeldwallet-password-form">
        <div class="zeldwallet-status">${locked.lockedLabel} ${locked.lockedHint}</div>
        <div class="zeldwallet-password-fields">
          <div class="zeldwallet-password-field" data-password-field>
            <input
              class="zeldwallet-password-input"
              type="password"
              name="wallet-password"
              placeholder="${locked.passwordPlaceholder}"
              autocomplete="current-password"
              required
            />
            <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
          </div>
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-password-button" part="password-button" type="submit" data-tooltip="${locked.submitLabel}" aria-label="${locked.submitLabel}">${UNLOCK_ICON}</button>
        </div>
        ${locked.error ? `<div class="zeldwallet-password-error">${locked.error}</div>` : ''}
      </form>
    `;
};

const buildBalanceValue = (
  balance: BalanceView | undefined,
  type: BalanceType
): string => {
  if (!balance) {
    return `<span class="zeldwallet-balance-value zeldwallet-balance-loading">—</span>`;
  }
  if (balance.loading && balance.btcFormatted === '0' && balance.zeldFormatted === '0') {
    return `<span class="zeldwallet-balance-value zeldwallet-balance-loading">
      <span class="zeldwallet-balance-spinner" aria-hidden="true"></span>
    </span>`;
  }
  const value = type === 'btc' ? balance.btcFormatted : balance.zeldFormatted;
  const unit = type === 'btc' ? 'BTC' : 'ZELD';
  const className = type === 'btc' ? 'zeldwallet-balance-btc' : 'zeldwallet-balance-zeld';
  return `
    <span class="zeldwallet-balance-value ${className}${balance.loading ? ' zeldwallet-balance-updating' : ''}">
      <span class="zeldwallet-balance-amount">${value}</span>
      <span class="zeldwallet-balance-unit">${unit}</span>
    </span>
  `;
};

const buildReadyBlock = (ready: WalletViewModel['ready']): string => {
  if (!ready) return '';

  const rows = ready.rows
    .map(
      (row) => `
        <div class="zeldwallet-row" part="row">
          <div class="zeldwallet-row-left">
            ${
              row.icon && row.tooltip
                ? `<span class="zeldwallet-label zeldwallet-label-icon" data-tooltip="${row.tooltip}" aria-label="${row.label}">${row.icon}</span>`
                : `<span class="zeldwallet-label">${row.label}</span>`
            }
            <span class="zeldwallet-value" title="${row.value ?? ''}">${row.truncatedValue ?? row.value ?? ''}</span>
            ${
              row.copyValue
                ? `<button class="zeldwallet-copy zeldwallet-copy-icon" part="copy-button" type="button" data-copy="${row.copyValue}" data-tooltip="${row.copyLabel}" aria-label="${row.copyLabel}">${COPY_ICON}</button>`
                : ''
            }
          </div>
          <div class="zeldwallet-row-right">
            ${buildBalanceValue(ready.balance, row.balanceType)}
          </div>
        </div>
      `
    )
    .join('');

  return `
      <div class="zeldwallet-status">
        <div>${ready.readyHint}</div>
      </div>
      <div class="zeldwallet-rows">
        ${rows}
      </div>
    `;
};

const buildWalletSwitcher = (switcher: WalletSwitcherView): string => {
  const networkClass =
    switcher.network === 'testnet'
      ? ' zeldwallet-network--testnet'
      : switcher.network === 'mainnet'
        ? ' zeldwallet-network--mainnet'
        : '';

  const rows = switcher.options
    .map(
      (opt) => `
        <div class="zeldwallet-wallet-row" data-wallet-row="${opt.id}">
          <div class="zeldwallet-wallet-main">
            <span class="zeldwallet-wallet-icon" aria-hidden="true">
              <img src="${opt.icon}" alt="${opt.name}" />
            </span>
            <div class="zeldwallet-wallet-meta">
              <div class="zeldwallet-wallet-name">${opt.name}</div>
              <div class="zeldwallet-wallet-desc">${opt.description}</div>
            </div>
          </div>
          <div class="zeldwallet-wallet-actions">
            ${
              opt.installed
                ? `<span class="zeldwallet-badge zeldwallet-badge--installed">${opt.installedLabel}</span>`
                : opt.installUrl
                  ? `<a class="zeldwallet-install-link" href="${opt.installUrl}" target="_blank" rel="noreferrer">${opt.installLabel}</a>`
                  : `<span class="zeldwallet-badge">${opt.installLabel}</span>`
            }
            <button
              class="zeldwallet-icon-button zeldwallet-connect-wallet"
              type="button"
              data-wallet-connect="${opt.id}"
              ${opt.connectDisabled ? 'disabled' : ''}
              data-tooltip="${opt.connectLabel}"
              aria-label="${opt.connectLabel}"
            >
              ${ZAP_ICON}
            </button>
          </div>
        </div>
      `
    )
    .join('');

  return `
      <div class="zeldwallet-footer">
        <div class="zeldwallet-footer-left">
          <div class="zeldwallet-network${networkClass}" aria-label="${switcher.networkLabel}: ${switcher.networkName}">
            <span class="zeldwallet-network-dot" aria-hidden="true"></span>
            <span class="zeldwallet-network-name">${switcher.networkName}</span>
          </div>
        </div>
        <button class="zeldwallet-wallet-toggle" type="button" data-wallet-toggle aria-expanded="${switcher.open}">
          <span>${switcher.toggleLabel}</span>
          <span class="zeldwallet-wallet-chevron${switcher.open ? ' zeldwallet-wallet-chevron--open' : ''}">${CHEVRON_ICON}</span>
        </button>
      </div>
      ${
        switcher.open
          ? `
        <div class="zeldwallet-wallet-picker">
          ${rows}
        </div>
      `
          : ''
      }
    `;
};

const buildBackupForm = (backupForm: WalletViewModel['backupForm'], labels: WalletViewModel['labels']): string => {
  if (!backupForm) return '';
  return `
      <form class="zeldwallet-set-password-form zeldwallet-backup-form">
        <div class="zeldwallet-password-field" data-password-field>
          <input
            class="zeldwallet-set-password-input zeldwallet-backup-input"
            type="password"
            name="wallet-password"
            placeholder="${backupForm.passwordPlaceholder}"
            autocomplete="new-password"
            required
          />
          <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
        </div>
        <div class="zeldwallet-set-password-actions">
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-backup-submit" type="submit" data-tooltip="${backupForm.submitLabel}" aria-label="${backupForm.submitLabel}">${CHECK_ICON}</button>
          <button class="zeldwallet-set-password-cancel zeldwallet-backup-cancel zeldwallet-cancel-icon" type="button" data-tooltip="${backupForm.cancelLabel}" aria-label="${backupForm.cancelLabel}">${CANCEL_ICON}</button>
        </div>
        ${backupForm.error ? `<div class="zeldwallet-password-error">${backupForm.error}</div>` : ''}
      </form>
    `;
};

const buildBackupResult = (backupResult: WalletViewModel['backupResult']): string => {
  if (!backupResult) return '';
  return `
      <div class="zeldwallet-backup-result">
        <div class="zeldwallet-backup-result-title">${backupResult.title}</div>
        <p class="zeldwallet-backup-result-hint">${backupResult.hint}</p>
        <textarea class="zeldwallet-backup-textarea" readonly>${backupResult.value}</textarea>
        <div class="zeldwallet-backup-actions">
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-backup-copy" type="button" data-copy="${backupResult.value}" data-tooltip="${backupResult.copyLabel}" aria-label="${backupResult.copyLabel}">${COPY_ICON}</button>
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-backup-download" type="button" data-backup="${backupResult.value}" data-tooltip="${backupResult.downloadLabel}" aria-label="${backupResult.downloadLabel}">${DOWNLOAD_ICON}</button>
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-backup-close" type="button" data-tooltip="${backupResult.cancelLabel}" aria-label="${backupResult.cancelLabel}">${CANCEL_ICON}</button>
        </div>
      </div>
    `;
};

const buildActionsBlock = (actions: ActionView[], title: string): string => {
  if (!actions.length) return '';
  const buttons = actions
    .map(
      (action) => `
        <button
          class="${action.className}"
          type="button"
          data-tooltip="${action.label}"
          aria-label="${action.label}"
        >
          ${action.icon}
        </button>
      `
    )
    .join('');

  return `
        <div class="zeldwallet-actions" role="group" aria-label="${title}">
          ${buttons}
        </div>
      `;
};

export const buildTemplate = (props: RenderTemplateProps): string => {
  const view = buildViewModel(props);
  const { dir, state } = props;

  const warningsBlock = buildSubtitle(view.header.warnings);
  const setPasswordForm = buildSetPasswordForm(view.setPasswordForm, view.labels);
  const lockedBlock = buildLockedBlock(view.locked, view.labels);
  const readyBlock = buildReadyBlock(view.ready);
  const backupForm = buildBackupForm(view.backupForm, view.labels);
  const backupResultBlock = buildBackupResult(view.backupResult);
  const statusBlock = buildStatusBlock(view.status, state.status === 'generating' || state.status === 'recovering');
  const actionsBlock = buildActionsBlock(view.header.actions, props.strings.securityActionsLabel);
  const walletSwitcherBlock = buildWalletSwitcher(view.walletSwitcher);

  const headerContent = view.header.actions.length ? actionsBlock : warningsBlock;
  const rtlClass = dir === 'rtl' ? ' zeldwallet-rtl' : '';

  return `
      <style>${componentStyles}</style>
      <div class="zeldwallet-card${rtlClass}" part="container" dir="${dir}">
        <div class="zeldwallet-header">
          <div class="zeldwallet-title-row">
            <img class="zeldwallet-title-icon" src="${view.titleIcon}" alt="" aria-hidden="true" />
            <div class="zeldwallet-title">${view.title}</div>
          </div>
          ${headerContent}
        </div>
        ${setPasswordForm}
        ${backupForm}
        ${backupResultBlock}
        ${statusBlock}
        ${lockedBlock}
        ${readyBlock}
        ${walletSwitcherBlock}
      </div>
    `;
};

