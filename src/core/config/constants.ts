// ─── Informacion de la aplicacion ────────────────────────────────────────────

export const APP_NAME = 'Cuentas Claras';
export const APP_VERSION = '1.0.0';

// ─── Monedas soportadas ─────────────────────────────────────────────────────

export const CurrencyCodes = {
  ARS: 'ARS',
  USD: 'USD',
} as const;

export type CurrencyCode = (typeof CurrencyCodes)[keyof typeof CurrencyCodes];

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  ARS: 'Peso argentino',
  USD: 'Dolar estadounidense',
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  ARS: '$',
  USD: 'US$',
};

// ─── Roles de usuario ───────────────────────────────────────────────────────

export const UserRoles = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  viewer: 'Visualizador',
};

// ─── Tipos de transaccion ───────────────────────────────────────────────────

export const TransactionTypes = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export type TransactionType =
  (typeof TransactionTypes)[keyof typeof TransactionTypes];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
  transfer: 'Transferencia',
};

// ─── Estados de transaccion ─────────────────────────────────────────────────

export const TransactionStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type TransactionStatus =
  (typeof TransactionStatuses)[keyof typeof TransactionStatuses];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

// ─── Metodos de pago ───────────────────────────────────────────────────────

export const PaymentMethods = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet',
  CHECK: 'check',
} as const;

export type PaymentMethod =
  (typeof PaymentMethods)[keyof typeof PaymentMethods];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
  digital_wallet: 'Billetera virtual',
  check: 'Cheque',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: 'cash',
  bank_transfer: 'bank-transfer',
  digital_wallet: 'cellphone',
  check: 'checkbook',
};

// ─── Cache durations (ms) ────────────────────────────────────────────────────
export const CACHE_DURATION = {
  ONE_MINUTE: 1000 * 60,
  TWO_MINUTES: 1000 * 60 * 2,
  FIVE_MINUTES: 1000 * 60 * 5,
} as const;
