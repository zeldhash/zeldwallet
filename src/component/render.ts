import { componentStyles } from './styles';
import type { MobileActiveTab } from './state';
import {
  buildViewModel,
  type ActionView,
  type BalanceType,
  type BalanceView,
  type ConfirmDialogView,
  type FeeOptionView,
  type HuntingView,
  type InlineWarningView,
  type MiningProgressView,
  type MiningResultView,
  type RenderTemplateProps,
  type RestoreFormView,
  type WalletViewModel,
  type WalletSwitcherView,
} from './viewModel';

// SVG icons for buttons
const COPY_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>`;

const COPIED_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const DOWNLOAD_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const UPLOAD_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
const CANCEL_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
// Unlock icon for Connect button
const UNLOCK_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;
// Checkmark icon for Save Password button
const CHECK_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ZAP_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
const CHEVRON_ICON = `<svg class="zeldwallet-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const TARGET_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
const STOP_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
const PLAY_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const BROADCAST_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>`;
const EXTERNAL_LINK_ICON = `<svg class="zeldwallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
export { COPY_ICON, COPIED_ICON, DOWNLOAD_ICON, CANCEL_ICON, UNLOCK_ICON, CHECK_ICON, TARGET_ICON };

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

const buildReadyBlock = (ready: WalletViewModel['ready'], mobileActiveTab: MobileActiveTab): string => {
  if (!ready) return '';

  const isAddressesActive = mobileActiveTab === 'addresses';
  const isBalancesActive = mobileActiveTab === 'balances';

  const rows = ready.rows
    .map(
      (row) => `
        <div class="zeldwallet-row" part="row">
          <div class="zeldwallet-row-left zeldwallet-mobile-col-addresses">
            ${
              row.icon && row.tooltip
                ? `<span class="zeldwallet-label zeldwallet-label-icon" data-tooltip="${row.tooltip}" aria-label="${row.label}">${row.icon}</span>`
                : `<span class="zeldwallet-label">${row.label}</span>`
            }
            <div class="zeldwallet-value-with-copy">
              <span class="zeldwallet-value" title="${row.value ?? ''}">${row.truncatedValue ?? row.value ?? ''}</span>
              ${
                row.copyValue
                  ? `<button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-address-copy" part="copy-button" type="button" data-copy="${row.copyValue}" data-tooltip="${row.copyLabel}" aria-label="${row.copyLabel}">${COPY_ICON}</button>`
                  : ''
              }
            </div>
          </div>
          <div class="zeldwallet-row-right zeldwallet-mobile-col-balances">
            ${buildBalanceValue(ready.balance, row.balanceType)}
          </div>
        </div>
      `
    )
    .join('');

  return `
      <div class="zeldwallet-ready-block" data-mobile-tab="${mobileActiveTab}">
        <div class="zeldwallet-status-row zeldwallet-mobile-tabs">
          <button 
            class="zeldwallet-status zeldwallet-mobile-tab${isAddressesActive ? ' zeldwallet-mobile-tab--active' : ''}" 
            type="button"
            data-mobile-tab-select="addresses"
            aria-pressed="${isAddressesActive}"
          >${ready.readyHint}</button>
          <button 
            class="zeldwallet-status zeldwallet-status-right zeldwallet-mobile-tab${isBalancesActive ? ' zeldwallet-mobile-tab--active' : ''}" 
            type="button"
            data-mobile-tab-select="balances"
            aria-pressed="${isBalancesActive}"
          >${ready.balancesHint}</button>
        </div>
        <div class="zeldwallet-rows">
          ${rows}
        </div>
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

const buildRestoreForm = (
  restoreForm: RestoreFormView | undefined,
  labels: WalletViewModel['labels']
): string => {
  if (!restoreForm) return '';
  
  const isBackupMode = restoreForm.mode === 'backup';
  const isMnemonicMode = restoreForm.mode === 'mnemonic';
  
  // Mode toggle tabs
  const modeToggle = `
    <div class="zeldwallet-restore-mode-toggle">
      <button type="button" class="zeldwallet-restore-mode-btn${isBackupMode ? ' zeldwallet-restore-mode-btn--active' : ''}" data-restore-mode="backup">
        ${restoreForm.modeBackupLabel}
      </button>
      <button type="button" class="zeldwallet-restore-mode-btn${isMnemonicMode ? ' zeldwallet-restore-mode-btn--active' : ''}" data-restore-mode="mnemonic">
        ${restoreForm.modeMnemonicLabel}
      </button>
    </div>
  `;
  
  // Backup mode form fields
  const backupFields = `
    <div class="zeldwallet-restore-backup-fields${isBackupMode ? '' : ' zeldwallet-hidden'}">
      <textarea
        class="zeldwallet-restore-textarea"
        name="restore-backup"
        placeholder="${restoreForm.backupPlaceholder}"
        ${isBackupMode ? 'required' : ''}
      ></textarea>
      <div class="zeldwallet-password-field" data-password-field>
        <input
          class="zeldwallet-restore-password-input"
          type="password"
          name="restore-password"
          placeholder="${restoreForm.passwordPlaceholder}"
          autocomplete="current-password"
          ${isBackupMode ? 'required' : ''}
        />
        <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
      </div>
    </div>
  `;
  
  // Mnemonic mode form fields
  const advancedClass = restoreForm.showAdvanced ? 'zeldwallet-restore-advanced--open' : '';
  const mnemonicFields = `
    <div class="zeldwallet-restore-mnemonic-fields${isMnemonicMode ? '' : ' zeldwallet-hidden'}">
      <textarea
        class="zeldwallet-restore-textarea zeldwallet-restore-mnemonic-input"
        name="restore-mnemonic"
        placeholder="${restoreForm.mnemonicPlaceholder}"
        ${isMnemonicMode ? 'required' : ''}
      >${escapeHtml(restoreForm.mnemonic)}</textarea>
      <div class="zeldwallet-password-field" data-password-field>
        <input
          class="zeldwallet-restore-new-password-input"
          type="password"
          name="restore-new-password"
          placeholder="${restoreForm.newPasswordPlaceholder}"
          autocomplete="new-password"
          value="${escapeHtml(restoreForm.password)}"
          ${isMnemonicMode ? 'required' : ''}
        />
        <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
      </div>
      <div class="zeldwallet-password-field" data-password-field>
        <input
          class="zeldwallet-restore-confirm-password-input"
          type="password"
          name="restore-confirm-password"
          placeholder="${restoreForm.confirmPasswordPlaceholder}"
          autocomplete="new-password"
          value="${escapeHtml(restoreForm.confirmPassword)}"
          ${isMnemonicMode ? 'required' : ''}
        />
        <button class="zeldwallet-toggle-visibility" type="button" aria-label="${labels.showPassword}">🐵</button>
      </div>
      <div class="zeldwallet-restore-advanced ${advancedClass}">
        <button type="button" class="zeldwallet-restore-advanced-toggle" data-toggle-advanced>
          ${CHEVRON_ICON} ${restoreForm.advancedOptionsLabel}
        </button>
        <div class="zeldwallet-restore-advanced-content">
          <div class="zeldwallet-restore-path-field">
            <label class="zeldwallet-restore-path-label">${restoreForm.paymentPathLabel}</label>
            <input
              class="zeldwallet-restore-path-input"
              type="text"
              name="restore-payment-path"
              placeholder="${restoreForm.paymentPathPlaceholder}"
              value="${escapeHtml(restoreForm.paymentPath)}"
            />
          </div>
          <div class="zeldwallet-restore-path-field">
            <label class="zeldwallet-restore-path-label">${restoreForm.ordinalsPathLabel}</label>
            <input
              class="zeldwallet-restore-path-input"
              type="text"
              name="restore-ordinals-path"
              placeholder="${restoreForm.ordinalsPathPlaceholder}"
              value="${escapeHtml(restoreForm.ordinalsPath)}"
            />
          </div>
        </div>
      </div>
    </div>
  `;
  
  return `
      <form class="zeldwallet-restore-form" data-restore-mode="${restoreForm.mode}">
        ${modeToggle}
        ${backupFields}
        ${mnemonicFields}
        <div class="zeldwallet-set-password-actions">
          <button class="zeldwallet-copy zeldwallet-copy-icon zeldwallet-restore-submit" type="submit" data-tooltip="${restoreForm.submitLabel}" aria-label="${restoreForm.submitLabel}">${UPLOAD_ICON}</button>
          <button class="zeldwallet-set-password-cancel zeldwallet-restore-cancel zeldwallet-cancel-icon" type="button" data-tooltip="${restoreForm.cancelLabel}" aria-label="${restoreForm.cancelLabel}">${CANCEL_ICON}</button>
        </div>
        ${restoreForm.error ? `<div class="zeldwallet-password-error">${escapeHtml(restoreForm.error)}</div>` : ''}
      </form>
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

const buildMiningProgress = (progress: MiningProgressView): string => {
  const pauseResumeButton = progress.isPaused
    ? `<button class="zeldwallet-mining-control" type="button" data-mining-resume>${PLAY_ICON} ${progress.resumeLabel}</button>`
    : `<button class="zeldwallet-mining-control" type="button" data-mining-stop>${STOP_ICON} ${progress.stopLabel}</button>`;

  return `
    <div class="zeldwallet-mining-progress">
      <div class="zeldwallet-mining-stats">
        <div class="zeldwallet-mining-stat">
          <span class="zeldwallet-mining-stat-label">${progress.hashRateLabel}</span>
          <span class="zeldwallet-mining-stat-value">${progress.hashRateFormatted}</span>
        </div>
        <div class="zeldwallet-mining-stat">
          <span class="zeldwallet-mining-stat-label">${progress.attemptsLabel}</span>
          <span class="zeldwallet-mining-stat-value">${progress.attemptsFormatted}</span>
        </div>
        <div class="zeldwallet-mining-stat">
          <span class="zeldwallet-mining-stat-label">${progress.elapsedLabel}</span>
          <span class="zeldwallet-mining-stat-value">${progress.elapsedFormatted}</span>
        </div>
      </div>
      <div class="zeldwallet-mining-actions">
        ${pauseResumeButton}
      </div>
    </div>
  `;
};

/**
 * Formats a txid by wrapping leading zeros in a gold-colored span.
 */
const formatTxidWithGoldZeros = (txid: string): string => {
  const match = txid.match(/^(0+)/);
  if (!match) return escapeHtml(txid);
  const zeros = match[1];
  const rest = txid.slice(zeros.length);
  return `<span class="zeldwallet-txid-zeros">${zeros}</span>${escapeHtml(rest)}`;
};

const buildMiningResult = (result: MiningResultView): string => {
  const signButton = result.showSignButton
    ? `<button class="zeldwallet-mining-broadcast" type="button" data-mining-sign>${BROADCAST_ICON} ${result.signAndBroadcastLabel}</button>`
    : '';

  const mempoolLink = result.showMempoolLink && result.mempoolUrl
    ? `<a class="zeldwallet-mining-mempool-link" href="${result.mempoolUrl}" target="_blank" rel="noopener noreferrer">${EXTERNAL_LINK_ICON} ${result.viewOnMempoolLabel}</a>`
    : '';

  // Hide copy PSBT button when transaction is broadcast (mempool link is shown)
  const copyPsbtButton = result.psbt && !result.showMempoolLink
    ? `<button class="zeldwallet-mining-copy-psbt zeldwallet-copy-icon" type="button" data-copy="${escapeHtml(result.psbt)}" data-tooltip="${result.copyPsbtLabel}">${COPY_ICON}</button>`
    : '';

  return `
    <div class="zeldwallet-mining-result">
      <div class="zeldwallet-mining-congrats">${result.congratsMessage}</div>
      <div class="zeldwallet-mining-txid">
        <span class="zeldwallet-mining-txid-value">${formatTxidWithGoldZeros(result.txid)}</span>
      </div>
      <div class="zeldwallet-mining-result-actions">
        ${signButton}
        ${mempoolLink}
        <button class="zeldwallet-mining-cancel" type="button" data-mining-cancel>${result.showMempoolLink ? '' : CANCEL_ICON + ' '}${result.cancelLabel}</button>
        ${copyPsbtButton}
      </div>
    </div>
  `;
};

const buildMiningError = (error: string, closeLabel: string): string => `
  <div class="zeldwallet-mining-error">
    <span class="zeldwallet-mining-error-message">${escapeHtml(error)}</span>
    <button class="zeldwallet-mining-cancel" type="button" data-mining-cancel>${CANCEL_ICON} ${closeLabel}</button>
  </div>
`;

const buildConfirmDialog = (dialog: ConfirmDialogView, locale?: string): string => {
  // Helper to format ZELD amounts (divide by 10^8) with locale-aware thousand separators
  const formatZeldAmount = (amount: bigint): string => {
    const divisor = 100_000_000n;
    const integerPart = amount / divisor;
    const remainder = amount % divisor;
    const decimalStr = remainder.toString().padStart(8, '0');
    // Remove trailing zeros but keep at least 2 decimals
    const trimmed = decimalStr.replace(/0+$/, '') || '0';
    const decimals = trimmed.length < 2 ? trimmed.padEnd(2, '0') : trimmed;
    
    // Format integer part with thousand separators
    try {
      const formattedInteger = new Intl.NumberFormat(locale || 'en').format(Number(integerPart));
      // Get the decimal separator for this locale
      const parts = new Intl.NumberFormat(locale || 'en').formatToParts(1.1);
      const decimalSeparator = parts.find(p => p.type === 'decimal')?.value || '.';
      return `${formattedInteger}${decimalSeparator}${decimals}`;
    } catch {
      return `${integerPart}.${decimals}`;
    }
  };

  const inputRows = dialog.inputs
    .map(
      (input) => {
        // Format ZELD amount if present
        const zeldDisplay = input.zeldAmount !== undefined && input.zeldAmount > 0n
          ? `<span class="zeldwallet-confirm-zeld">${formatZeldAmount(input.zeldAmount)} ZELD</span>`
          : '';
        
        return `
          <div class="zeldwallet-confirm-row">
            <span class="zeldwallet-confirm-address" title="${escapeHtml(input.address)}">${escapeHtml(input.addressTruncated)}</span>
            <span class="zeldwallet-confirm-value">
              ${input.valueFormatted} BTC
              ${zeldDisplay}
            </span>
          </div>
        `;
      }
    )
    .join('');

  const outputRows = dialog.outputs
    .map(
      (output) => {
        // Format ZELD amount if present (normalized by 10^8)
        const zeldDisplay = output.zeldAmount !== undefined && output.zeldAmount > 0n
          ? `<span class="zeldwallet-confirm-zeld">${formatZeldAmount(output.zeldAmount)} ZELD</span>`
          : '';
        
        return `
          <div class="zeldwallet-confirm-row${output.isOpReturn ? ' zeldwallet-confirm-row-opreturn' : ''}">
            <span class="zeldwallet-confirm-address" title="${escapeHtml(output.address)}">
              ${escapeHtml(output.addressTruncated)}
              ${output.isChange ? `<span class="zeldwallet-confirm-change">${dialog.changeLabel}</span>` : ''}
            </span>
            <span class="zeldwallet-confirm-value">
              ${output.isOpReturn ? '' : `${output.valueFormatted} BTC`}
              ${zeldDisplay}
            </span>
          </div>
        `;
      }
    )
    .join('');

  return `
    <div class="zeldwallet-confirm-overlay" data-confirm-overlay>
      <div class="zeldwallet-confirm-dialog" role="dialog" aria-labelledby="confirm-title">
        <h3 class="zeldwallet-confirm-title" id="confirm-title">${escapeHtml(dialog.title)}</h3>
        
        <div class="zeldwallet-confirm-section">
          <div class="zeldwallet-confirm-section-header">${escapeHtml(dialog.inputsLabel)}</div>
          <div class="zeldwallet-confirm-rows">
            ${inputRows}
          </div>
        </div>
        
        <div class="zeldwallet-confirm-section">
          <div class="zeldwallet-confirm-section-header">${escapeHtml(dialog.outputsLabel)}</div>
          <div class="zeldwallet-confirm-rows">
            ${outputRows}
          </div>
        </div>
        
        <div class="zeldwallet-confirm-summary">
          <div class="zeldwallet-confirm-summary-row">
            <span class="zeldwallet-confirm-summary-label">${escapeHtml(dialog.feeLabel)}</span>
            <span class="zeldwallet-confirm-summary-value zeldwallet-confirm-fee">${dialog.feeFormatted} BTC</span>
          </div>
        </div>
        
        ${dialog.isBroadcast && dialog.mempoolUrl ? `
          <a class="zeldwallet-confirm-mempool-link" href="${dialog.mempoolUrl}" target="_blank" rel="noopener noreferrer">
            ${EXTERNAL_LINK_ICON} ${escapeHtml(dialog.viewOnMempoolLabel ?? 'View on mempool.space')}
          </a>
        ` : ''}
        
        <div class="zeldwallet-confirm-actions">
          ${!dialog.isBroadcast ? `
            <button class="zeldwallet-confirm-btn zeldwallet-confirm-btn-confirm" type="button" data-confirm-confirm>
              ${CHECK_ICON} ${escapeHtml(dialog.confirmLabel)}
            </button>
          ` : ''}
          <button class="zeldwallet-confirm-btn zeldwallet-confirm-btn-cancel" type="button" data-confirm-cancel>
            ${dialog.isBroadcast ? escapeHtml(dialog.closeLabel) : `${CANCEL_ICON} ${escapeHtml(dialog.cancelLabel)}`}
          </button>
        </div>
      </div>
    </div>
  `;
};

/**
 * Builds the final stats display (read-only, no controls) for showing with the result.
 */
const buildMiningFinalStats = (progress: MiningProgressView): string => {
  return `
    <div class="zeldwallet-mining-final-stats">
      <div class="zeldwallet-mining-stat">
        <span class="zeldwallet-mining-stat-label">${progress.hashRateLabel}</span>
        <span class="zeldwallet-mining-stat-value">${progress.hashRateFormatted}</span>
      </div>
      <div class="zeldwallet-mining-stat">
        <span class="zeldwallet-mining-stat-label">${progress.attemptsLabel}</span>
        <span class="zeldwallet-mining-stat-value">${progress.attemptsFormatted}</span>
      </div>
      <div class="zeldwallet-mining-stat">
        <span class="zeldwallet-mining-stat-label">${progress.elapsedLabel}</span>
        <span class="zeldwallet-mining-stat-value">${progress.elapsedFormatted}</span>
      </div>
    </div>
  `;
};

const buildFeeSelector = (hunting: HuntingView): string => {
  const feeButtons = hunting.feeOptions
    .map((opt: FeeOptionView) => `
      <button
        class="zeldwallet-fee-option${opt.selected ? ' selected' : ''}"
        type="button"
        data-fee-mode="${opt.mode}"
        ${hunting.isMining ? 'disabled' : ''}
      >
        <span class="zeldwallet-fee-option-label">${opt.label}</span>
        ${opt.mode !== 'custom' || opt.rateFormatted !== '—' 
          ? `<span class="zeldwallet-fee-option-rate">${opt.rateFormatted}<span class="zeldwallet-fee-option-unit"> s/vb</span></span>`
          : ''
        }
      </button>
    `)
    .join('');

  const customInput = hunting.showCustomFeeInput && hunting.feeExpanded
    ? `
      <input
        type="text"
        class="zeldwallet-hunting-input zeldwallet-fee-custom-field"
        placeholder="${hunting.customFeePlaceholder}"
        value="${escapeHtml(hunting.customFeeRate)}"
        data-fee-custom-rate
        ${hunting.isMining ? 'disabled' : ''}
      />
    `
    : '';

  const expandedContent = hunting.feeExpanded
    ? `
      <div class="zeldwallet-fee-dropdown">
        <div class="zeldwallet-fee-options">
          ${feeButtons}
        </div>
        ${customInput}
      </div>
    `
    : '';

  return `
    <div class="zeldwallet-fee-selector${hunting.feeExpanded ? ' expanded' : ''}">
      <button class="zeldwallet-fee-toggle" type="button" data-fee-toggle ${hunting.isMining ? 'disabled' : ''}>
        <span class="zeldwallet-fee-label">${hunting.feeLabel}</span>
        <span class="zeldwallet-fee-chevron${hunting.feeExpanded ? ' open' : ''}">${CHEVRON_ICON}</span>
      </button>
      ${expandedContent}
    </div>
  `;
};

const buildHuntingBlock = (hunting: HuntingView | undefined, locale?: string): string => {
  if (!hunting || !hunting.visible) return '';

  // Show confirmation dialog if visible
  const confirmDialogBlock = hunting.confirmDialog ? buildConfirmDialog(hunting.confirmDialog, locale) : '';

  // Show mining result if we have one (with final stats)
  if (hunting.miningResult) {
    const finalStatsBlock = hunting.miningProgress ? buildMiningFinalStats(hunting.miningProgress) : '';
    return `
      <div class="zeldwallet-hunting">
        ${finalStatsBlock}
        ${buildMiningResult(hunting.miningResult)}
        ${confirmDialogBlock}
      </div>
    `;
  }

  // Show error if mining failed
  if (hunting.miningError && !hunting.isMining) {
    return `
      <div class="zeldwallet-hunting">
        ${buildMiningError(hunting.miningError, hunting.cancelLabel)}
      </div>
    `;
  }

  // Show mining progress if mining
  if (hunting.miningProgress) {
    return `
      <div class="zeldwallet-hunting">
        ${buildMiningProgress(hunting.miningProgress)}
      </div>
    `;
  }

  // Normal hunting controls
  const sendFieldsBlock = hunting.showSendFields
    ? `
      <div class="zeldwallet-hunting-send-fields">
        <input
          type="text"
          class="zeldwallet-hunting-input zeldwallet-hunting-address${hunting.addressError ? ' error' : ''}"
          placeholder="${hunting.addressPlaceholder}"
          value="${escapeHtml(hunting.recipientAddress)}"
          data-hunting-address
        />
        <input
          type="text"
          class="zeldwallet-hunting-input zeldwallet-hunting-amount${hunting.amountError ? ' error' : ''}"
          placeholder="${hunting.amountPlaceholder}"
          value="${escapeHtml(hunting.amount)}"
          data-hunting-amount
        />
      </div>
    `
    : '';

  // Sweep mode: only show destination address field (no amount)
  const sweepFieldsBlock = hunting.showSweepField
    ? `
      <div class="zeldwallet-hunting-send-fields">
        <input
          type="text"
          class="zeldwallet-hunting-input zeldwallet-hunting-address${hunting.addressError ? ' error' : ''}"
          placeholder="${hunting.sweepAddressPlaceholder}"
          value="${escapeHtml(hunting.recipientAddress)}"
          data-hunting-address
        />
      </div>
    `
    : '';

  // Wrap disabled button in a span to enable hover tooltip (disabled buttons don't receive pointer events)
  const huntButton = hunting.huntEnabled
    ? `
        <button
          class="zeldwallet-hunt-button"
          type="button"
          data-hunting-hunt
        >
          ${TARGET_ICON}
          ${hunting.huntLabel}
        </button>
      `
    : `
        <span class="zeldwallet-hunt-button-wrapper" data-tooltip="${escapeHtml(hunting.huntDisabledReason ?? '')}">
          <button
            class="zeldwallet-hunt-button"
            type="button"
            disabled
            data-hunting-hunt
          >
            ${TARGET_ICON}
            ${hunting.huntLabel}
          </button>
        </span>
      `;

  return `
    <div class="zeldwallet-hunting">
      ${sendFieldsBlock}
      ${sweepFieldsBlock}
      <div class="zeldwallet-hunting-controls">
        <label class="zeldwallet-hunting-checkbox${!hunting.sendBtcEnabled ? ' disabled' : ''}">
          <input
            type="checkbox"
            data-hunting-send-btc
            ${hunting.sendBtcChecked ? 'checked' : ''}
            ${!hunting.sendBtcEnabled || hunting.sendZeldChecked || hunting.sweepChecked || hunting.isMining ? 'disabled' : ''}
          />
          ${hunting.sendBtcLabel}
        </label>
        <label class="zeldwallet-hunting-checkbox${!hunting.sendZeldEnabled ? ' disabled' : ''}">
          <input
            type="checkbox"
            data-hunting-send-zeld
            ${hunting.sendZeldChecked ? 'checked' : ''}
            ${!hunting.sendZeldEnabled || hunting.sendBtcChecked || hunting.sweepChecked || hunting.isMining ? 'disabled' : ''}
          />
          ${hunting.sendZeldLabel}
        </label>
        <label class="zeldwallet-hunting-checkbox${!hunting.sweepEnabled ? ' disabled' : ''}">
          <input
            type="checkbox"
            data-hunting-sweep
            ${hunting.sweepChecked ? 'checked' : ''}
            ${!hunting.sweepEnabled || hunting.sendBtcChecked || hunting.sendZeldChecked || hunting.isMining ? 'disabled' : ''}
          />
          ${hunting.sweepLabel}
        </label>
        ${buildFeeSelector(hunting)}
        <div class="zeldwallet-hunting-slider">
          <span>${hunting.zeroCountLabel}</span>
          <input
            type="range"
            min="6"
            max="10"
            value="${hunting.zeroCount}"
            data-hunting-zero-count
            ${hunting.isMining ? 'disabled' : ''}
          />
          <span class="zeldwallet-hunting-slider-value">${hunting.zeroCount}</span>
        </div>
        <label class="zeldwallet-hunting-checkbox">
          <input
            type="checkbox"
            data-hunting-use-gpu
            ${hunting.useGpu ? 'checked' : ''}
            ${hunting.isMining ? 'disabled' : ''}
          />
          ${hunting.useGpuLabel}
        </label>
        <div class="zeldwallet-hunt-button-row">
          ${huntButton}
        </div>
      </div>
    </div>
  `;
};

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const buildTemplate = (props: RenderTemplateProps): string => {
  const view = buildViewModel(props);
  const { dir, state } = props;

  const warningsBlock = buildSubtitle(view.header.warnings);
  const setPasswordForm = buildSetPasswordForm(view.setPasswordForm, view.labels);
  const lockedBlock = buildLockedBlock(view.locked, view.labels);
  const readyBlock = buildReadyBlock(view.ready, state.mobileActiveTab);
  const backupForm = buildBackupForm(view.backupForm, view.labels);
  const backupResultBlock = buildBackupResult(view.backupResult);
  const restoreFormBlock = buildRestoreForm(view.restoreForm, view.labels);
  const statusBlock = buildStatusBlock(view.status, state.status === 'generating' || state.status === 'recovering');
  const actionsBlock = buildActionsBlock(view.header.actions, props.strings.securityActionsLabel);
  const huntingBlock = buildHuntingBlock(view.hunting, props.locale);
  const walletSwitcherBlock = buildWalletSwitcher(view.walletSwitcher);

  // Show warnings (with flashing icon) when there are warnings, otherwise show regular actions
  // Warnings already include the restore button when applicable
  const headerContent = view.header.warnings.length ? warningsBlock : actionsBlock;
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
        ${restoreFormBlock}
        ${statusBlock}
        ${lockedBlock}
        ${readyBlock}
        ${huntingBlock}
        ${walletSwitcherBlock}
      </div>
    `;
};

