import { COPY_ICON, COPIED_ICON } from './render';

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
        const original = button.innerHTML;
        const originalTooltip = button.getAttribute('data-tooltip');
        if (isIconButton) {
          button.innerHTML = COPIED_ICON;
          button.classList.add('zeldwallet-copied');
          button.setAttribute('data-tooltip', strings.copied);
        } else {
          button.textContent = strings.copied;
        }
        button.disabled = true;
        setTimeout(() => {
          if (isIconButton) {
            button.innerHTML = original || COPY_ICON;
            button.classList.remove('zeldwallet-copied');
            if (originalTooltip) {
              button.setAttribute('data-tooltip', originalTooltip);
            }
          } else {
            button.textContent = original || strings.copy;
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

