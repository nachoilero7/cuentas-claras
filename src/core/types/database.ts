// ─── Tipos base reutilizables ────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'viewer';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type CurrencyCode = 'ARS' | 'USD';
export type SeasonStatus = 'active' | 'closed' | 'planning';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'digital_wallet' | 'check';
export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'approve' | 'reject'
  | 'login' | 'logout'
  | 'role_change' | 'permission_change'
  | 'export';

// ─── Perfil de usuario ──────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  payment_alias: string | null;
  push_token: string | null;
  is_active: boolean;
  has_completed_onboarding: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Temporada ──────────────────────────────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: SeasonStatus;
  description: string | null;
  is_current: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Categoria (rubro) ─────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  budget_limit_ars: number | null;
  budget_limit_usd: number | null;
  is_active: boolean;
  sort_order: number;
  season_id: string | null;
  parent_category_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Permisos por categoria ─────────────────────────────────────────────────

export interface UserCategoryPermission {
  id: string;
  user_id: string;
  category_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  granted_by: string;
  created_at: string;
}

// ─── Transaccion ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: CurrencyCode;
  exchange_rate: number | null;
  amount_in_ars: number | null;
  description: string;
  notes: string | null;
  payment_method: PaymentMethod | null;
  destination_alias: string | null;
  category_id: string;
  transfer_to_category_id: string | null;
  transaction_date: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  season_id: string | null;
  client_id: string | null;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Adjunto / Comprobante ──────────────────────────────────────────────────

export interface Attachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

// ─── Solicitud de aprobacion ────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  transaction_id: string;
  requested_by: string;
  reviewed_by: string | null;
  status: ApprovalStatus;
  threshold_amount: number | null;
  comment: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Cotizacion de moneda ───────────────────────────────────────────────────

export interface CurrencyRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  effective_date: string;
  source: string | null;
  created_by: string;
  created_at: string;
}

// ─── Alerta de balance ──────────────────────────────────────────────────────

export type BalanceAlertType = 'below' | 'above';

export interface BudgetAlert {
  id: string;
  category_id: string;
  alert_type: BalanceAlertType;
  threshold_amount: number;
  is_active: boolean;
  created_at: string;
}

// ─── Notificacion ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// ─── Transaccion recurrente ──────────────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  description: string;
  notes: string | null;
  payment_method: PaymentMethod | null;
  category_id: string;
  transfer_to_category_id: string | null;
  frequency: RecurrenceFrequency;
  next_execution: string;
  last_executed_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Registro de auditoria ──────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
