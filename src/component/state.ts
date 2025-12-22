import type { NetworkType, AddressInfo } from '../types';
import { DEFAULT_PROVIDER } from './constants';
import type { SupportedWalletId, WalletOptionState } from './wallets';

export type ComponentStatus = 'loading' | 'generating' | 'recovering' | 'locked' | 'ready' | 'error';

export type BalanceState = {
  btcSats: number;
  zeldBalance: number;
  loading: boolean;
  error?: string;
};

export type ComponentState = {
  status: ComponentStatus;
  addresses?: AddressInfo[];
  message?: string;
  passwordError?: string;
  hasPassword?: boolean;
  showSetPasswordForm?: boolean;
  setPasswordError?: string;
  hasBackup?: boolean;
  showBackupForm?: boolean;
  backupError?: string;
  backupValue?: string;
  walletKind: 'zeld' | 'external';
  activeWalletId: SupportedWalletId;
  activeWalletName: string;
  walletPickerOpen: boolean;
  walletOptions: WalletOptionState[];
  externalNetwork?: NetworkType;
  balance?: BalanceState;
};

export const createInitialState = (walletOptions: WalletOptionState[] = []): ComponentState => ({
  status: 'loading',
  walletKind: 'zeld',
  activeWalletId: 'zeld',
  activeWalletName: DEFAULT_PROVIDER.name,
  walletPickerOpen: false,
  walletOptions,
});

