import { COPY_ICON, COPIED_ICON } from './render';
import type { MobileActiveTab } from './state';

type Strings = Record<string, string> & { backupFilename?: string };

type PasswordHandlers = {
  onShowForm: () => void;
  onSubmit: (value: string, confirmValue: string) => void;
  onCancel: () => void;
};

type BackupHandlers = {
  onShowForm: () => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onCloseResult: () => void;
};

type WalletSwitcherHandlers = {
  onToggle: () => void;
  onConnect: (walletId: string) => void;
};

export const bindPasswordForm = (shadowRoot: ShadowRoot, onConnect: (password?: string) => void): void => {
  const form = shadowRoot.querySelector('.zeldwallet-password-form') as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('.zeldwallet-password-input') as HTMLInputElement | null;
    const value = input?.value?.trim() ?? '';
    onConnect(value || undefined);
  });
};

export const bindCopyButtons = (shadowRoot: ShadowRoot, strings: Strings): void => {
  const buttons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('[data-copy]'));
  if (!buttons.length) return;

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy');
      if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
      try {
        await navigator.clipboard.writeText(value);
        const isIconButton = button.classList.contains('zeldwallet-copy-icon');
        const originalHtml = button.innerHTML;
        const originalTooltip = button.getAttribute('data-tooltip');
        if (isIconButton) {
          button.innerHTML = COPIED_ICON;
          button.classList.add('zeldwallet-copied');
          button.setAttribute('data-tooltip', strings.copied);
        } else {
          // For buttons with icon + text, replace the text content but keep structure
          button.innerHTML = `${COPIED_ICON} ${strings.copied}`;
        }
        button.disabled = true;
        setTimeout(() => {
          if (isIconButton) {
            button.innerHTML = originalHtml || COPY_ICON;
            button.classList.remove('zeldwallet-copied');
            if (originalTooltip) {
              button.setAttribute('data-tooltip', originalTooltip);
            }
          } else {
            button.innerHTML = originalHtml;
          }
          button.disabled = false;
        }, 1000);
      } catch {
        // Ignore copy failures silently to keep UX minimal.
      }
    });
  }
};

export const bindSetPasswordActions = (shadowRoot: ShadowRoot, handlers: PasswordHandlers): void => {
  const toggleButtons = Array.from(
    shadowRoot.querySelectorAll<HTMLButtonElement>('.zeldwallet-set-password-button, .zeldwallet-change-password-button')
  );

  for (const toggleButton of toggleButtons) {
    toggleButton.addEventListener('click', () => {
      handlers.onShowForm();
    });
  }

  const form = shadowRoot.querySelector<HTMLFormElement>('.zeldwallet-change-password-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('.zeldwallet-set-password-input');
      const confirm = form.querySelector<HTMLInputElement>('.zeldwallet-set-password-confirm-input');
      const value = input?.value?.trim() ?? '';
      const confirmValue = confirm?.value?.trim() ?? '';
      if (!value || !confirmValue) return;
      handlers.onSubmit(value, confirmValue);
    });

    const cancel = form.querySelector<HTMLButtonElement>('.zeldwallet-set-password-cancel');
    if (cancel) {
      cancel.addEventListener('click', (event) => {
        event.preventDefault();
        handlers.onCancel();
      });
    }
  }
};

export const bindPasswordVisibility = (shadowRoot: ShadowRoot, strings: Strings): void => {
  const fields = Array.from(shadowRoot.querySelectorAll<HTMLElement>('[data-password-field]'));

  for (const field of fields) {
    const input = field.querySelector<HTMLInputElement>('input');
    const toggle = field.querySelector<HTMLButtonElement>('.zeldwallet-toggle-visibility');
    if (!input || !toggle) continue;

    const update = (): void => {
      const showing = input.type === 'text';
      toggle.setAttribute('aria-label', showing ? strings.hidePassword : strings.showPassword);
      toggle.textContent = showing ? '🙈' : '🐵';
    };

    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      update();
    });

    update();
  }
};

export const bindBackupActions = (shadowRoot: ShadowRoot, handlers: BackupHandlers, strings?: Strings): void => {
  const toggleButtons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('.zeldwallet-backup-button'));
  for (const toggleButton of toggleButtons) {
    toggleButton.addEventListener('click', () => {
      handlers.onShowForm();
    });
  }

  const form = shadowRoot.querySelector<HTMLFormElement>('.zeldwallet-backup-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('.zeldwallet-backup-input');
      const value = input?.value?.trim() ?? '';
      if (!value) return;
      handlers.onSubmit(value);
    });

    const cancel = form.querySelector<HTMLButtonElement>('.zeldwallet-backup-cancel');
    if (cancel) {
      cancel.addEventListener('click', (event) => {
        event.preventDefault();
        handlers.onCancel();
      });
    }
  }

  const closeButton = shadowRoot.querySelector<HTMLButtonElement>('.zeldwallet-backup-close');
  if (closeButton) {
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onCloseResult();
    });
  }

  const downloadButton = shadowRoot.querySelector<HTMLButtonElement>('.zeldwallet-backup-download');
  if (downloadButton) {
    downloadButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof window === 'undefined' || typeof URL === 'undefined') return;
      const backupText =
        shadowRoot.querySelector<HTMLTextAreaElement>('.zeldwallet-backup-textarea')?.value ||
        downloadButton.getAttribute('data-backup') ||
        '';
      if (!backupText) return;

      const blob = new Blob([backupText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = strings?.backupFilename ?? 'zeldwallet-backup.txt';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });
  }
};

export const bindWalletSwitcher = (shadowRoot: ShadowRoot, handlers: WalletSwitcherHandlers): void => {
  const toggle = shadowRoot.querySelector<HTMLButtonElement>('[data-wallet-toggle]');
  if (toggle) {
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onToggle();
    });
  }

  const connectButtons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('[data-wallet-connect]'));
  for (const button of connectButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const id = button.getAttribute('data-wallet-connect');
      if (!id) return;
      handlers.onConnect(id);
    });
  }
};

export type RestoreMode = 'backup' | 'mnemonic';

export type MnemonicRestoreData = {
  mnemonic: string;
  password: string;
  confirmPassword: string;
  paymentPath: string;
  ordinalsPath: string;
};

export type MnemonicFormValues = {
  mnemonic: string;
  password: string;
  confirmPassword: string;
  paymentPath: string;
  ordinalsPath: string;
};

type RestoreHandlers = {
  onShowForm: () => void;
  onSubmitBackup: (backupString: string, password: string) => void;
  onSubmitMnemonic: (data: MnemonicRestoreData) => void;
  onCancel: () => void;
  onModeChange: (mode: RestoreMode) => void;
  onToggleAdvanced: (currentValues: MnemonicFormValues) => void;
  onInputChange: (values: Partial<MnemonicFormValues>) => void;
};

export const bindRestoreActions = (shadowRoot: ShadowRoot, handlers: RestoreHandlers): void => {
  // Restore button in header
  const restoreButtons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('.zeldwallet-restore-button'));
  for (const button of restoreButtons) {
    button.addEventListener('click', () => {
      handlers.onShowForm();
    });
  }

  // Restore form
  const form = shadowRoot.querySelector<HTMLFormElement>('.zeldwallet-restore-form');
  if (!form) return;

  // Mode toggle buttons
  const modeButtons = form.querySelectorAll<HTMLButtonElement>('[data-restore-mode]');
  for (const button of modeButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const mode = button.getAttribute('data-restore-mode') as RestoreMode;
      if (mode) {
        handlers.onModeChange(mode);
      }
    });
  }

  // Helper to capture current mnemonic form values
  const captureMnemonicFormValues = (): MnemonicFormValues => {
    const mnemonicInput = form.querySelector<HTMLTextAreaElement>('.zeldwallet-restore-mnemonic-input');
    const newPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-new-password-input');
    const confirmPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-confirm-password-input');
    const paymentPathInput = form.querySelector<HTMLInputElement>('[name="restore-payment-path"]');
    const ordinalsPathInput = form.querySelector<HTMLInputElement>('[name="restore-ordinals-path"]');

    return {
      mnemonic: mnemonicInput?.value ?? '',
      password: newPasswordInput?.value ?? '',
      confirmPassword: confirmPasswordInput?.value ?? '',
      paymentPath: paymentPathInput?.value ?? '',
      ordinalsPath: ordinalsPathInput?.value ?? '',
    };
  };

  // Advanced options toggle
  const advancedToggle = form.querySelector<HTMLButtonElement>('[data-toggle-advanced]');
  if (advancedToggle) {
    advancedToggle.addEventListener('click', (event) => {
      event.preventDefault();
      // Capture current form values before triggering re-render
      const currentValues = captureMnemonicFormValues();
      handlers.onToggleAdvanced(currentValues);
    });
  }

  // Input change handlers to preserve form values during re-renders
  const mnemonicInput = form.querySelector<HTMLTextAreaElement>('.zeldwallet-restore-mnemonic-input');
  if (mnemonicInput) {
    mnemonicInput.addEventListener('input', () => {
      handlers.onInputChange({ mnemonic: mnemonicInput.value });
    });
  }

  const newPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-new-password-input');
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', () => {
      handlers.onInputChange({ password: newPasswordInput.value });
    });
  }

  const confirmPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-confirm-password-input');
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => {
      handlers.onInputChange({ confirmPassword: confirmPasswordInput.value });
    });
  }

  const paymentPathInput = form.querySelector<HTMLInputElement>('[name="restore-payment-path"]');
  if (paymentPathInput) {
    paymentPathInput.addEventListener('input', () => {
      handlers.onInputChange({ paymentPath: paymentPathInput.value });
    });
  }

  const ordinalsPathInput = form.querySelector<HTMLInputElement>('[name="restore-ordinals-path"]');
  if (ordinalsPathInput) {
    ordinalsPathInput.addEventListener('input', () => {
      handlers.onInputChange({ ordinalsPath: ordinalsPathInput.value });
    });
  }

  // Form submission
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const currentMode = form.getAttribute('data-restore-mode') as RestoreMode;

    if (currentMode === 'mnemonic') {
      // Mnemonic mode submission
      const mnemonicInput = form.querySelector<HTMLTextAreaElement>('.zeldwallet-restore-mnemonic-input');
      const newPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-new-password-input');
      const confirmPasswordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-confirm-password-input');
      const paymentPathInput = form.querySelector<HTMLInputElement>('[name="restore-payment-path"]');
      const ordinalsPathInput = form.querySelector<HTMLInputElement>('[name="restore-ordinals-path"]');

      const mnemonic = mnemonicInput?.value?.trim() ?? '';
      const password = newPasswordInput?.value ?? '';
      const confirmPassword = confirmPasswordInput?.value ?? '';
      const paymentPath = paymentPathInput?.value?.trim() ?? '';
      const ordinalsPath = ordinalsPathInput?.value?.trim() ?? '';

      if (!mnemonic || !password) return;

      handlers.onSubmitMnemonic({
        mnemonic,
        password,
        confirmPassword,
        paymentPath,
        ordinalsPath,
      });
    } else {
      // Backup mode submission
      const textarea = form.querySelector<HTMLTextAreaElement>('.zeldwallet-restore-textarea:not(.zeldwallet-restore-mnemonic-input)');
      const passwordInput = form.querySelector<HTMLInputElement>('.zeldwallet-restore-password-input');
      const backupString = textarea?.value?.trim() ?? '';
      const password = passwordInput?.value ?? '';
      if (!backupString || !password) return;
      handlers.onSubmitBackup(backupString, password);
    }
  });

  // Cancel button
  const cancel = form.querySelector<HTMLButtonElement>('.zeldwallet-restore-cancel');
  if (cancel) {
    cancel.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onCancel();
    });
  }
};

type HuntingHandlers = {
  onSendBtcChange: (checked: boolean) => void;
  onSendZeldChange: (checked: boolean) => void;
  onSweepChange: (checked: boolean) => void;
  onZeroCountChange: (value: number) => void;
  onUseGpuChange: (checked: boolean) => void;
  onFeeModeChange: (mode: string) => void;
  onCustomFeeRateChange: (value: string) => void;
  onFeeToggle: () => void;
  onAddressChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onHunt: () => void;
  onMiningStop: () => void;
  onMiningResume: () => void;
  onMiningSign: () => void;
  onMiningCancel: () => void;
  onMiningRetry: () => void;
  onConfirmTransaction: () => void;
  onCancelConfirmation: () => void;
};

export const bindHunting = (shadowRoot: ShadowRoot, handlers: HuntingHandlers): void => {
  // Send BTC checkbox
  const sendBtcCheckbox = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-send-btc]');
  if (sendBtcCheckbox) {
    sendBtcCheckbox.addEventListener('change', () => {
      handlers.onSendBtcChange(sendBtcCheckbox.checked);
    });
  }

  // Send Zeld checkbox
  const sendZeldCheckbox = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-send-zeld]');
  if (sendZeldCheckbox) {
    sendZeldCheckbox.addEventListener('change', () => {
      handlers.onSendZeldChange(sendZeldCheckbox.checked);
    });
  }

  // Sweep checkbox
  const sweepCheckbox = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-sweep]');
  if (sweepCheckbox) {
    sweepCheckbox.addEventListener('change', () => {
      handlers.onSweepChange(sweepCheckbox.checked);
    });
  }

  // Zero count slider
  const zeroCountSlider = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-zero-count]');
  if (zeroCountSlider) {
    zeroCountSlider.addEventListener('input', () => {
      handlers.onZeroCountChange(parseInt(zeroCountSlider.value, 10));
    });
  }

  // Use GPU checkbox
  const useGpuCheckbox = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-use-gpu]');
  if (useGpuCheckbox) {
    useGpuCheckbox.addEventListener('change', () => {
      handlers.onUseGpuChange(useGpuCheckbox.checked);
    });
  }

  // Fee mode buttons
  const feeModeButtons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('[data-fee-mode]'));
  for (const button of feeModeButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const mode = button.getAttribute('data-fee-mode');
      if (mode) {
        handlers.onFeeModeChange(mode);
      }
    });
  }

  // Custom fee rate input
  const customFeeInput = shadowRoot.querySelector<HTMLInputElement>('[data-fee-custom-rate]');
  if (customFeeInput) {
    customFeeInput.addEventListener('input', () => {
      handlers.onCustomFeeRateChange(customFeeInput.value);
    });
  }

  // Fee toggle button
  const feeToggle = shadowRoot.querySelector<HTMLButtonElement>('[data-fee-toggle]');
  if (feeToggle) {
    feeToggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation(); // Prevent the click-outside handler from firing
      handlers.onFeeToggle();
    });
  }

  // Close fee selector when clicking outside
  const feeSelector = shadowRoot.querySelector<HTMLElement>('.zeldwallet-fee-selector');
  if (feeSelector && !(shadowRoot as ShadowRoot & { _zeldFeeClickOutsideBound?: boolean })._zeldFeeClickOutsideBound) {
    const handleClickOutside = (event: Event): void => {
      const currentFeeSelector = shadowRoot.querySelector<HTMLElement>('.zeldwallet-fee-selector');
      if (!currentFeeSelector) return;
      
      // Check if the selector is expanded
      const isExpanded = currentFeeSelector.classList.contains('expanded');
      if (!isExpanded) return;
      
      // Use composedPath to check if click was inside the fee selector
      // This works even after DOM re-renders since the path is captured at click time
      const path = event.composedPath();
      const clickedInsideFeeSelector = path.some(
        (el) => el instanceof HTMLElement && el.classList?.contains('zeldwallet-fee-selector')
      );
      
      if (clickedInsideFeeSelector) return;
      
      // Click was outside, close the selector
      handlers.onFeeToggle();
    };
    
    shadowRoot.addEventListener('click', handleClickOutside as EventListener);
    (shadowRoot as ShadowRoot & { _zeldFeeClickOutsideBound?: boolean })._zeldFeeClickOutsideBound = true;
  }

  // Address input
  const addressInput = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-address]');
  if (addressInput) {
    addressInput.addEventListener('input', () => {
      handlers.onAddressChange(addressInput.value);
    });
  }

  // Amount input
  const amountInput = shadowRoot.querySelector<HTMLInputElement>('[data-hunting-amount]');
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      handlers.onAmountChange(amountInput.value);
    });
  }

  // Hunt button
  const huntButton = shadowRoot.querySelector<HTMLButtonElement>('[data-hunting-hunt]');
  if (huntButton) {
    huntButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onHunt();
    });
  }

  // Mining stop button
  const stopButton = shadowRoot.querySelector<HTMLButtonElement>('[data-mining-stop]');
  if (stopButton) {
    console.log('[ZeldWalletUI] binding stop button');
    stopButton.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('[ZeldWalletUI] stop button clicked');
      handlers.onMiningStop();
    });
  }

  // Delegated click fallback (covers re-renders where specific listeners might be lost)
  if (!(shadowRoot as ShadowRoot & { _zeldHuntingDelegatedBound?: boolean })._zeldHuntingDelegatedBound) {
    shadowRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-mining-stop]')) {
        event.preventDefault();
        console.log('[ZeldWalletUI] delegated stop click');
        handlers.onMiningStop();
        return;
      }
    });
    (shadowRoot as ShadowRoot & { _zeldHuntingDelegatedBound?: boolean })._zeldHuntingDelegatedBound = true;
  }

  // Mining resume button
  const resumeButton = shadowRoot.querySelector<HTMLButtonElement>('[data-mining-resume]');
  if (resumeButton) {
    resumeButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onMiningResume();
    });
  }

  // Mining sign & broadcast button
  const signButton = shadowRoot.querySelector<HTMLButtonElement>('[data-mining-sign]');
  if (signButton) {
    signButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onMiningSign();
    });
  }

  // Mining cancel button
  const cancelButton = shadowRoot.querySelector<HTMLButtonElement>('[data-mining-cancel]');
  if (cancelButton) {
    cancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onMiningCancel();
    });
  }

  // Mining retry button
  const retryButton = shadowRoot.querySelector<HTMLButtonElement>('[data-mining-retry]');
  if (retryButton) {
    retryButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onMiningRetry();
    });
  }

  // Confirmation dialog confirm button
  const confirmButton = shadowRoot.querySelector<HTMLButtonElement>('[data-confirm-confirm]');
  if (confirmButton) {
    confirmButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onConfirmTransaction();
    });
  }

  // Confirmation dialog cancel button
  const confirmCancelButton = shadowRoot.querySelector<HTMLButtonElement>('[data-confirm-cancel]');
  if (confirmCancelButton) {
    confirmCancelButton.addEventListener('click', (event) => {
      event.preventDefault();
      handlers.onCancelConfirmation();
    });
  }

  // Also allow clicking on the overlay background to cancel
  const confirmOverlay = shadowRoot.querySelector<HTMLElement>('[data-confirm-overlay]');
  if (confirmOverlay) {
    confirmOverlay.addEventListener('click', (event) => {
      // Only cancel if clicking directly on the overlay (not on the dialog)
      if (event.target === confirmOverlay) {
        event.preventDefault();
        handlers.onCancelConfirmation();
      }
    });
  }
};

type MobileTabHandlers = {
  onTabChange: (tab: MobileActiveTab) => void;
};

export const bindMobileTabs = (shadowRoot: ShadowRoot, handlers: MobileTabHandlers): void => {
  const tabButtons = Array.from(shadowRoot.querySelectorAll<HTMLButtonElement>('[data-mobile-tab-select]'));
  for (const button of tabButtons) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const tab = button.getAttribute('data-mobile-tab-select') as MobileActiveTab | null;
      if (tab && (tab === 'addresses' || tab === 'balances')) {
        handlers.onTabChange(tab);
      }
    });
  }
};

