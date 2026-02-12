// ─── Informacion de la aplicacion ────────────────────────────────────────────

export const APP_NAME = 'Cuentas Claras';
export const APP_VERSION = '0.3.0-rc';

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
