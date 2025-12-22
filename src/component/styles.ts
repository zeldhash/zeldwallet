export const componentStyles = `
  :host {
    display: block;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #0f172a;
  }
  .zeldwallet-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  }
  .zeldwallet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }
  .zeldwallet-title-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .zeldwallet-title-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .zeldwallet-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
  }
  .zeldwallet-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .zeldwallet-inline-warning {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border-radius: 10px;
    background: transparent;
    border: none;
    box-shadow: none;
    color: #9f1239;
  }
  .zeldwallet-inline-warning-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .zeldwallet-inline-warning__badge {
    position: relative;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #b91c1c;
    cursor: help;
    animation: zeldwallet-soft-pulse 3s ease-in-out infinite;
  }
  .zeldwallet-inline-warning__badge:focus-visible {
    outline: 2px solid #ef4444;
    outline-offset: 2px;
  }
  .zeldwallet-inline-warning__tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #b91c1c;
    color: #fff;
    padding: 6px 8px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.2;
    min-width: 180px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(185, 28, 28, 0.2);
    z-index: 2;
  }
  .zeldwallet-inline-warning__badge:hover .zeldwallet-inline-warning__tooltip,
  .zeldwallet-inline-warning__badge:focus-visible .zeldwallet-inline-warning__tooltip {
    display: block;
  }
  .zeldwallet-warning-action {
    border-color: #cbd5e1;
    background: rgba(239, 68, 68, 0.22);
    color: #b91c1c;
    animation: zeldwallet-warning-button-pulse 2.4s ease-in-out infinite;
  }
  .zeldwallet-warning-icon {
    display: block;
  }
  .zeldwallet-warning-action:hover {
    border-color: #ef4444;
    background: #ffe4e6;
  }
  .zeldwallet-icon-button {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    border-radius: 8px;
    padding: 6px 8px;
    cursor: pointer;
    font-weight: 700;
    line-height: 1;
  }
  .zeldwallet-icon-button:hover {
    border-color: #2563eb;
    background: #eff6ff;
  }
  .zeldwallet-warning {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    align-items: center;
    background: #fff7ed;
    color: #9a3412;
    border: 1px solid #fdba74;
    border-radius: 10px;
    padding: 8px 10px;
  }
  .zeldwallet-warning-icon {
    font-size: 16px;
    line-height: 1;
  }
  .zeldwallet-warning-title {
    font-weight: 700;
    font-size: 13px;
  }
  .zeldwallet-set-password-button {
    border: 1px solid #2563eb;
    background: #2563eb;
    color: white;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 700;
  }
  .zeldwallet-set-password-form {
    display: grid;
    gap: 8px;
    margin: 8px 0 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 12px;
  }
  .zeldwallet-set-password-input {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
  }
  .zeldwallet-set-password-input,
  .zeldwallet-password-input,
  .zeldwallet-backup-input {
    padding-right: 42px;
  }
  .zeldwallet-password-field {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  .zeldwallet-password-field input {
    width: 100%;
    flex: 1;
  }
  .zeldwallet-password-field input:-webkit-autofill,
  .zeldwallet-password-field input:-webkit-autofill:hover,
  .zeldwallet-password-field input:-webkit-autofill:focus {
    box-shadow: 0 0 0 1000px #ffffff inset;
    -webkit-text-fill-color: #0f172a;
    caret-color: #0f172a;
    border: 1px solid #cbd5e1;
    outline: none;
    border-radius: 8px;
  }
  .zeldwallet-toggle-visibility {
    position: absolute;
    right: 10px;
    border: none;
    background: transparent;
    color: #475569;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 4px;
  }
  .zeldwallet-toggle-visibility:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
    border-radius: 6px;
  }
  .zeldwallet-set-password-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .zeldwallet-set-password-cancel {
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #0f172a;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 700;
  }
  .zeldwallet-cancel-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
  }
  .zeldwallet-cancel-icon:hover {
    border-color: #ef4444;
    background: #fef2f2;
    color: #dc2626;
  }
  .zeldwallet-status {
    margin: 6px 0;
    font-size: 13px;
    color: #334155;
  }
  .zeldwallet-status--loading {
    color: #2563eb;
  }
  .zeldwallet-status--generating {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 28px 16px;
    color: #0f172a;
    font-weight: 600;
    font-size: 1.2em;
  }
  .zeldwallet-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #22c55e;
    border-radius: 50%;
    animation: zeldwallet-spin 1s linear infinite;
  }
  :host(.dark-card) .zeldwallet-spinner {
    border-color: #2f2612;
    border-top-color: #d4af37;
  }
  :host(.dark-card) .zeldwallet-status--generating {
    color: #f4e4a6;
  }
  @keyframes zeldwallet-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .zeldwallet-status--error {
    color: #b91c1c;
  }
  .zeldwallet-rows {
    display: grid;
    gap: 10px;
    margin: 12px 0;
  }
  .zeldwallet-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
  }
  .zeldwallet-row-left {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .zeldwallet-row-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 1;
  }
  .zeldwallet-balance-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 8px;
  }
  .zeldwallet-balance-btc {
    font-size: 24px;
    font-weight: 700;
    color: #f7931a;
  }
  .zeldwallet-balance-zeld {
    font-size: 24px;
    font-weight: 700;
    color: #8b5cf6;
  }
  .zeldwallet-balance-unit {
    font-size: 14px;
    font-weight: 600;
    opacity: 0.7;
    text-transform: uppercase;
    min-width: 36px;
    text-align: left;
  }
  .zeldwallet-balance-amount {
    text-align: right;
  }
  .zeldwallet-balance-loading {
    color: #94a3b8;
    font-size: 20px;
  }
  .zeldwallet-balance-updating {
    opacity: 0.6;
  }
  .zeldwallet-balance-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #e5e7eb;
    border-top-color: #f7931a;
    border-radius: 50%;
    animation: zeldwallet-spin 1s linear infinite;
  }
  .zeldwallet-footer {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .zeldwallet-footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .zeldwallet-wallet-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    color: #0f172a;
    padding: 4px 0;
    cursor: pointer;
    font-weight: 600;
  }
  .zeldwallet-wallet-toggle:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
    border-radius: 6px;
  }
  .zeldwallet-wallet-chevron {
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: #94a3b8;
    transition: transform 0.15s ease, color 0.15s ease;
  }
  .zeldwallet-wallet-chevron svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .zeldwallet-wallet-chevron--open {
    transform: rotate(180deg);
  }
  .zeldwallet-wallet-toggle:hover .zeldwallet-wallet-chevron {
    color: #1d4ed8;
  }
  .zeldwallet-wallet-picker {
    display: grid;
    gap: 8px;
    margin-top: 10px;
  }
  .zeldwallet-wallet-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
  }
  .zeldwallet-wallet-main {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .zeldwallet-wallet-icon img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: cover;
    background: #ffffff;
  }
  .zeldwallet-wallet-meta {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .zeldwallet-wallet-name {
    font-weight: 700;
    color: #0f172a;
  }
  .zeldwallet-wallet-desc {
    color: #475569;
    font-size: 12px;
    line-height: 1.4;
  }
  .zeldwallet-wallet-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .zeldwallet-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    background: #e2e8f0;
    color: #0f172a;
  }
  .zeldwallet-badge--installed {
    background: #dcfce7;
    color: #15803d;
  }
  .zeldwallet-install-link {
    border: 1px solid #2563eb;
    background: #eff6ff;
    color: #1d4ed8;
    text-decoration: none;
    padding: 7px 12px;
    border-radius: 8px;
    font-weight: 700;
  }
  .zeldwallet-install-link:hover {
    background: #dbeafe;
  }
  .zeldwallet-connect-wallet {
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .zeldwallet-connect-wallet .zeldwallet-btn-icon {
    width: 18px;
    height: 18px;
  }
  .zeldwallet-connect-wallet:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .zeldwallet-label {
    font-weight: 600;
    color: #0f172a;
  }
  .zeldwallet-label-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: help;
  }
  .zeldwallet-address-icon {
    display: block;
    color: #f7931a;
  }
  .zeldwallet-row:last-child .zeldwallet-address-icon {
    color: #8b5cf6;
  }
  .zeldwallet-value {
    font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .zeldwallet-copy {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    color: #0f172a;
    border-radius: 8px;
    padding: 6px 8px;
    cursor: pointer;
    font-weight: 700;
    line-height: 1;
  }
  .zeldwallet-copy:hover:not(:disabled) {
    border-color: #2563eb;
    background: #eff6ff;
  }
  .zeldwallet-copy-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .zeldwallet-copied {
    background: #dcfce7;
    border-color: #22c55e;
    color: #16a34a;
  }
  .zeldwallet-copied:hover:not(:disabled) {
    background: #bbf7d0;
    border-color: #16a34a;
    color: #15803d;
  }
  .zeldwallet-btn-icon {
    display: block;
    flex-shrink: 0;
  }
  .zeldwallet-copy:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .zeldwallet-password-form {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }
  .zeldwallet-password-fields {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
  }
  .zeldwallet-password-input {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 14px;
  }
  .zeldwallet-password-button {
    flex-shrink: 0;
  }
  .zeldwallet-password-error {
    color: #b91c1c;
    font-size: 13px;
  }
  .zeldwallet-backup-form {
    margin: 8px 0 0;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 12px;
  }
  .zeldwallet-backup-result {
    border: none;
    background: transparent;
    color: #0f172a;
    padding: 0;
    margin-top: 12px;
    display: grid;
    gap: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 12px;
  }
  :host(.dark-card) .zeldwallet-backup-result {
    border-bottom-color: #1e1e28;
  }
  .zeldwallet-backup-result-title {
    font-weight: 700;
  }
  .zeldwallet-backup-result-hint {
    margin: 0;
    font-size: 13px;
    color: #475569;
  }
  .zeldwallet-backup-textarea {
    width: 100%;
    max-width: 100%;
    min-height: 120px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 13px;
    color: #0f172a;
    resize: vertical;
    box-sizing: border-box;
    overflow-wrap: anywhere;
  }
  .zeldwallet-backup-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-start;
  }
  :host(.dark-card) {
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-card {
    background: linear-gradient(135deg, #0f0f16 0%, #0a0a0f 70%, #0c0c12 100%);
    color: #e8e6e3;
    border-color: #1e1e28;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  }
  :host(.dark-card) .zeldwallet-footer {
    border-top-color: #1e1e28;
  }
  :host(.dark-card) .zeldwallet-status,
  :host(.dark-card) .zeldwallet-backup-result-hint {
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-label,
  :host(.dark-card) .zeldwallet-backup-result-title {
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-title,
  :host(.dark-card) .zeldwallet-wallet-name,
  :host(.dark-card) .zeldwallet-value {
    color: #d4af37;
  }
  :host(.dark-card) .zeldwallet-set-password-input,
  :host(.dark-card) .zeldwallet-password-input,
  :host(.dark-card) .zeldwallet-backup-input,
  :host(.dark-card) .zeldwallet-backup-textarea {
    background: #12121a;
    border-color: #1e1e28;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-password-field input:-webkit-autofill,
  :host(.dark-card) .zeldwallet-password-field input:-webkit-autofill:hover,
  :host(.dark-card) .zeldwallet-password-field input:-webkit-autofill:focus {
    box-shadow: 0 0 0 1000px #12121a inset;
    -webkit-text-fill-color: #e8e6e3;
    caret-color: #e8e6e3;
    border: 1px solid #1e1e28;
    outline: none;
    border-radius: 8px;
  }
  :host(.dark-card) .zeldwallet-wallet-row {
    background: transparent;
    border: 1px solid #1e1e28;
  }
  :host(.dark-card) .zeldwallet-balance-btc {
    color: #f7931a;
  }
  :host(.dark-card) .zeldwallet-balance-zeld {
    color: #a78bfa;
  }
  :host(.dark-card) .zeldwallet-balance-loading {
    color: #6b7280;
  }
  :host(.dark-card) .zeldwallet-balance-spinner {
    border-color: #2f2612;
    border-top-color: #d4af37;
  }
  :host(.dark-card) .zeldwallet-wallet-desc {
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-wallet-toggle {
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-wallet-icon img {
    background: #0f0f16;
    border: 1px solid #1e1e28;
  }
  :host(.dark-card) .zeldwallet-install-link,
  :host(.dark-card) .zeldwallet-copy,
  :host(.dark-card) .zeldwallet-set-password-button,
  :host(.dark-card) .zeldwallet-connect-wallet {
    background: #12121a;
    border: 1px solid #e8e6e3;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-install-link:hover,
  :host(.dark-card) .zeldwallet-copy:hover:not(:disabled),
  :host(.dark-card) .zeldwallet-set-password-button:hover,
  :host(.dark-card) .zeldwallet-connect-wallet:hover {
    background: rgba(232, 230, 227, 0.08);
    border-color: #ffffff;
    color: #ffffff;
  }
  :host(.dark-card) .zeldwallet-badge {
    background: #1e1e28;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-badge--installed {
    background: #1e1e28;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-copy:disabled {
    background: #12121a;
    color: #a6a6ad;
    border-color: #2b2b36;
  }
  :host(.dark-card) .zeldwallet-copied {
    background: #12121a;
    border-color: #e8e6e3;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-copied:hover:not(:disabled) {
    background: rgba(232, 230, 227, 0.08);
    border-color: #ffffff;
    color: #ffffff;
  }
  :host(.dark-card) .zeldwallet-set-password-cancel,
  :host(.dark-card) .zeldwallet-icon-button {
    border-color: #e8e6e3;
    background: #12121a;
    color: #e8e6e3;
  }
  :host(.dark-card) .zeldwallet-set-password-form,
  :host(.dark-card) .zeldwallet-backup-form {
    border-bottom-color: #1e1e28;
  }
  :host(.dark-card) .zeldwallet-cancel-icon:hover {
    border-color: #fca5a5;
    background: #2a0e0e;
    color: #fca5a5;
  }
  /* RTL support */
  .zeldwallet-rtl {
    direction: rtl;
    text-align: right;
  }
  .zeldwallet-rtl .zeldwallet-set-password-input,
  .zeldwallet-rtl .zeldwallet-password-input,
  .zeldwallet-rtl .zeldwallet-backup-input {
    padding-right: 12px;
    padding-left: 42px;
  }
  .zeldwallet-rtl .zeldwallet-toggle-visibility {
    right: auto;
    left: 10px;
  }
  .zeldwallet-rtl .zeldwallet-value {
    direction: ltr;
    text-align: left;
    unicode-bidi: embed;
  }
  .zeldwallet-rtl .zeldwallet-backup-textarea {
    direction: ltr;
    text-align: left;
  }
  .zeldwallet-rtl .zeldwallet-backup-actions {
    justify-content: flex-end;
  }
  .zeldwallet-network {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    text-transform: lowercase;
  }
  .zeldwallet-network-name {
    letter-spacing: 0.01em;
  }
  .zeldwallet-network-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 4px #dcfce7;
  }
  .zeldwallet-network--testnet .zeldwallet-network-dot {
    background: #f59e0b;
    box-shadow: 0 0 0 4px #fef3c7;
  }
  .zeldwallet-network--mainnet .zeldwallet-network-dot {
    background: #22c55e;
    box-shadow: 0 0 0 4px #dcfce7;
  }
  .zeldwallet-network--mainnet .zeldwallet-network-name,
  .zeldwallet-network--testnet .zeldwallet-network-name {
    color: #475569;
  }
  :host(.dark-card) .zeldwallet-network {
    color: #d7cbb1;
  }
  :host(.dark-card) .zeldwallet-network-dot {
    background: #d4af37;
    box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
  }
  :host(.dark-card) .zeldwallet-network--testnet .zeldwallet-network-dot {
    background: #b8960c;
    box-shadow: 0 0 0 4px rgba(184, 150, 12, 0.2);
  }
  :host(.dark-card) .zeldwallet-network--mainnet .zeldwallet-network-dot {
    background: #d4af37;
    box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.2);
  }
  :host(.dark-card) .zeldwallet-network-name {
    color: #f4e4a6;
  }
  @keyframes zeldwallet-soft-pulse {
    0% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    100% {
      opacity: 0.8;
      transform: scale(1);
    }
  }
  @keyframes zeldwallet-warning-button-pulse {
    0% {
      background: rgba(239, 68, 68, 0.22);
    }
    60% {
      background: #ffffff;
    }
    80% {
      background: #ffffff;
    }
    100% {
      background: rgba(239, 68, 68, 0.22);
    }
  }
  /* Tooltip system for icon buttons */
  [data-tooltip] {
    position: relative;
  }
  [data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #f8fafc;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.3;
    white-space: normal;
    max-width: 280px;
    width: max-content;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    z-index: 10;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
    pointer-events: none;
  }
  [data-tooltip]:hover::after,
  [data-tooltip]:focus-visible::after {
    opacity: 1;
    visibility: visible;
  }
  /* Tooltip arrow */
  [data-tooltip]::before {
    content: '';
    position: absolute;
    bottom: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #1e293b;
    z-index: 10;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.15s ease, visibility 0.15s ease;
    pointer-events: none;
  }
  [data-tooltip]:hover::before,
  [data-tooltip]:focus-visible::before {
    opacity: 1;
    visibility: visible;
  }
  /* Dark mode tooltips */
  :host(.dark-card) [data-tooltip]::after {
    background: #1b1710;
    color: #f4e4a6;
    border: 1px solid rgba(212, 175, 55, 0.35);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  }
  :host(.dark-card) [data-tooltip]::before {
    border-top-color: #1b1710;
  }
  /* RTL tooltip positioning */
  .zeldwallet-rtl [data-tooltip]::after,
  .zeldwallet-rtl [data-tooltip]::before {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
`;

