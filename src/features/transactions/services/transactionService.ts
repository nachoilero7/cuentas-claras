import { supabase } from '@/src/core/config/supabase';
import type {
  Transaction,
  Category,
  TransactionType,
  TransactionStatus,
  CurrencyCode,
  PaymentMethod,
} from '@/src/core/types/database';

/** Escape special ILIKE characters to prevent pattern injection */
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// ─── Tipos para transacciones con datos de categoria ────────────────────────

export interface TransactionWithCategory extends Transaction {
  category: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  transfer_to_category: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  creator: { display_name: string | null; full_name: string } | null;
}

export type CreateTransactionData = {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  exchange_rate?: number | null;
  description: string;
  notes?: string | null;
  payment_method?: PaymentMethod | null;
  destination_alias?: string | null;
  category_id: string;
  transfer_to_category_id?: string | null;
  transaction_date: string;
  season_id?: string | null;
};

export type UpdateTransactionData = Partial<CreateTransactionData> & {
  status?: TransactionStatus;
};

export interface TransactionFilters {
  seasonId?: string;
  categoryId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Select con join de categorias (origen y destino) y perfil del creador
const TRANSACTION_SELECT = `
  *,
  category:categories!category_id(id, name, color, icon),
  transfer_to_category:categories!transfer_to_category_id(id, name, color, icon),
  creator:profiles!created_by(display_name, full_name)
`;

const DEFAULT_LIMIT = 50;

// ─── Listar transacciones con filtros opcionales ────────────────────────────

export async function getTransactions(filters?: TransactionFilters) {
  let query = supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  // Aplicar filtros si se proporcionan
  if (filters?.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }
  if (filters?.categoryId) {
    query = query.or(
      `category_id.eq.${filters.categoryId},transfer_to_category_id.eq.${filters.categoryId}`,
    );
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.createdBy) {
    query = query.eq('created_by', filters.createdBy);
  }
  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate);
  }

  // Busqueda por descripcion o notas
  if (filters?.search) {
    const trimmed = filters.search.slice(0, 100);
    const escaped = escapeIlike(trimmed);
    query = query.or(`description.ilike.%${escaped}%,notes.ilike.%${escaped}%`);
  }

  // Paginacion
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  return { data: (data as TransactionWithCategory[] | null) ?? [], error };
}

// ─── Obtener transaccion por ID ─────────────────────────────────────────────

export async function getTransactionById(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', id)
    .single();

  return { data: data as TransactionWithCategory | null, error };
}

// ─── Crear nueva transaccion ────────────────────────────────────────────────
// Todas las transacciones se crean como 'pending' por defecto y requieren
// aprobacion de un administrador. Los admins pueden crear con 'approved'.

export async function createTransaction(
  transactionData: CreateTransactionData,
  status: TransactionStatus = 'pending',
) {
  // Obtener el usuario autenticado para asignar created_by
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...transactionData,
      created_by: user.id,
      status,
    })
    .select(TRANSACTION_SELECT)
    .single();

  return { data: data as TransactionWithCategory | null, error };
}

// ─── Actualizar transaccion existente ───────────────────────────────────────

export async function updateTransaction(id: string, updates: UpdateTransactionData) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select(TRANSACTION_SELECT)
    .single();

  return { data: data as TransactionWithCategory | null, error };
}

// ─── Eliminar transaccion (hard delete, RLS controla el acceso) ─────────────

export async function deleteTransaction(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as Transaction | null, error };
}
