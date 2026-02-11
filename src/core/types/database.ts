// ─── Tipos base reutilizables ────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'viewer';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';
export type CurrencyCode = 'ARS' | 'USD';

// ─── Perfil de usuario ──────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Temporada contable ─────────────────────────────────────────────────────

export interface Season {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Categoria ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  season_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Transaccion ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: CurrencyCode;
  description: string;
  notes: string | null;
  category_id: string;
  season_id: string;
  created_by: string;
  approved_by: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

// ─── Adjunto / Comprobante ──────────────────────────────────────────────────

export interface Attachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

// ─── Registro de auditoria ──────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  performed_by: string;
  performed_at: string;
}

// ─── Permisos por categoria ─────────────────────────────────────────────────

export interface UserCategoryPermission {
  id: string;
  user_id: string;
  category_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  granted_by: string;
  created_at: string;
  updated_at: string;
}
