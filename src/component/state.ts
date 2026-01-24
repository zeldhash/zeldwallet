import type { NetworkType, AddressInfo } from '../types';
import { DEFAULT_PROVIDER } from './constants';
import type { SupportedWalletId, WalletOptionState } from './wallets';

export type ComponentStatus = 'loading' | 'generating' | 'recovering' | 'locked' | 'ready' | 'error';

export type BalanceState = {
  btcSats: number;
  zeldBalance: number;
  /** BTC balance in sats for payment address only */
  btcPaymentSats?: number;
  loading: boolean;
  error?: string;
};

/** Mining progress stats */
export type MiningStats = {
  hashRate: number;
  hashesProcessed: bigint;
  elapsedMs: number;
};

/** Mining result after successful hunt */
export type MiningResult = {
  txid: string;
  psbt: string;
  nonce: bigint;
  attempts: bigint;
  duration: number;
};

/** Parsed transaction input for confirmation dialog */
export type ParsedTxInput = {
  txid: string;
  vout: number;
  address: string;
  value: number; // in satoshis
  /** ZELD balance for this input (in minimal units, 8 decimals) */
  zeldBalance?: number;
};

/** Type of OP_RETURN data */
export type OpReturnType = 'nonce' | 'zeld';

/** OP_RETURN data parsed from script */
export type OpReturnData = {
  type: OpReturnType;
  /** Raw nonce value for simple nonce OP_RETURN */
  nonce?: bigint;
  /** ZELD distribution amounts for CBOR array OP_RETURN (including nonce as last element) */
  distribution?: bigint[];
};

/** Parsed transaction output for confirmation dialog */
export type ParsedTxOutput = {
  address: string;
  value: number; // in satoshis
  isChange?: boolean;
  /** OP_RETURN data if this is an OP_RETURN output */
  opReturn?: OpReturnData;
};

/** Parsed transaction details for confirmation dialog */
export type ParsedTransaction = {
  inputs: ParsedTxInput[];
  outputs: ParsedTxOutput[];
  fee: number; // in satoshis
  totalInputValue: number;
  totalOutputValue: number;
};

/** Mining status */
export type MiningStatus = 'idle' | 'mining' | 'paused' | 'found' | 'signing' | 'broadcast' | 'error';

/** Fee mode selection */
export type FeeMode = 'slow' | 'medium' | 'fast' | 'custom';

/** Recommended fees from mempool.space */
export type RecommendedFees = {
  slow: number;
  medium: number;
  fast: number;
};

/** Hunting section state */
export type HuntingState = {
  sendBtcChecked: boolean;
  sendZeldChecked: boolean;
  sweepChecked: boolean;
  zeroCount: number;
  useGpu: boolean;
  recipientAddress: string;
  amount: string;
  addressError?: string;
  amountError?: string;
  // Fee selection state
  feeMode: FeeMode;
  customFeeRate: string;
  recommendedFees?: RecommendedFees;
  feeLoading?: boolean;
  feeError?: string;
  feeExpanded?: boolean;
  // Mining state
  miningStatus: MiningStatus;
  miningStats?: MiningStats;
  miningResult?: MiningResult;
  miningError?: string;
  broadcastTxid?: string;
  // Confirmation dialog state
  showConfirmDialog?: boolean;
  parsedTransaction?: ParsedTransaction;
  /** Map of "txid:vout" -> ZELD balance for inputs used in the current mining session */
  inputUtxoZeldBalances?: Record<string, number>;
};

/** Mobile tab selection for addresses/balances columns */
export type MobileActiveTab = 'balances' | 'addresses';

/** Restore mode selection */
export type RestoreMode = 'backup' | 'mnemonic';

/** Mnemonic restore form state */
export type MnemonicRestoreState = {
  mnemonic: string;
  paymentDerivationPath: string;
  ordinalsDerivationPath: string;
  password: string;
  confirmPassword: string;
  showAdvanced: boolean;
};

export const DEFAULT_PAYMENT_PATH = "m/84'/0'/0'/0/0";
export const DEFAULT_ORDINALS_PATH = "m/86'/0'/0'/0/0";

export const createInitialMnemonicRestoreState = (): MnemonicRestoreState => ({
  mnemonic: '',
  paymentDerivationPath: DEFAULT_PAYMENT_PATH,
  ordinalsDerivationPath: DEFAULT_ORDINALS_PATH,
  password: '',
  confirmPassword: '',
  showAdvanced: false,
});

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
  showRestoreForm?: boolean;
  restoreError?: string;
  restoreMode?: RestoreMode;
  mnemonicRestoreState?: MnemonicRestoreState;
  walletKind: 'zeld' | 'external';
  activeWalletId: SupportedWalletId;
  activeWalletName: string;
  walletPickerOpen: boolean;
  walletOptions: WalletOptionState[];
  externalNetwork?: NetworkType;
  balance?: BalanceState;
  hunting?: HuntingState;
  /** Active tab on mobile (balances shown by default) */
  mobileActiveTab: MobileActiveTab;
};

export const createInitialHuntingState = (): HuntingState => ({
  sendBtcChecked: false,
  sendZeldChecked: false,
  sweepChecked: false,
  zeroCount: 6,
  useGpu: true,
  recipientAddress: '',
  amount: '',
  feeMode: 'medium',
  customFeeRate: '',
  miningStatus: 'idle',
});

export const createInitialState = (walletOptions: WalletOptionState[] = []): ComponentState => ({
  status: 'loading',
  walletKind: 'zeld',
  activeWalletId: 'zeld',
  activeWalletName: DEFAULT_PROVIDER.name,
  walletPickerOpen: false,
  walletOptions,
  hunting: createInitialHuntingState(),
  mobileActiveTab: 'balances',
});

