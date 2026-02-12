import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns';
import { supabase } from '@/src/core/config/supabase';
import type { RecurringTransaction, RecurrenceFrequency } from '@/src/core/types/database';

// ─── Tipos auxiliares ───────────────────────────────────────────────────────

export interface RecurringWithCategory extends RecurringTransaction {
  category?: { id: string; name: string; color: string | null; icon: string | null } | null;
}

export interface CreateRecurringInput {
  type: RecurringTransaction['type'];
  amount: number;
  currency: RecurringTransaction['currency'];
  description: string;
  notes?: string;
  payment_method?: RecurringTransaction['payment_method'];
  category_id: string;
  transfer_to_category_id?: string;
  frequency: RecurrenceFrequency;
  next_execution: string;
}

// ─── Listar recurrentes del usuario ─────────────────────────────────────────

export async function getRecurringTransactions() {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select(`
      *,
      category:categories!category_id(id, name, color, icon)
    `)
    .order('next_execution', { ascending: true });

  return { data: (data as RecurringWithCategory[] | null) ?? [], error };
}

// ─── Crear recurrente ───────────────────────────────────────────────────────

export async function createRecurringTransaction(input: CreateRecurringInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      ...input,
      notes: input.notes ?? null,
      payment_method: input.payment_method ?? null,
      transfer_to_category_id: input.transfer_to_category_id ?? null,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  return { data: data as RecurringTransaction | null, error };
}

// ─── Actualizar recurrente ──────────────────────────────────────────────────

export async function updateRecurringTransaction(
  id: string,
  updates: Partial<CreateRecurringInput & { is_active: boolean }>,
) {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data: data as RecurringTransaction | null, error };
}

// ─── Eliminar recurrente ────────────────────────────────────────────────────

export async function deleteRecurringTransaction(id: string) {
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id);

  return { error };
}

// ─── Pausar/reactivar ───────────────────────────────────────────────────────

export async function toggleRecurringTransaction(id: string, isActive: boolean) {
  return updateRecurringTransaction(id, { is_active: isActive });
}

// ─── Calcular proxima ejecucion ─────────────────────────────────────────────

export function calculateNextExecution(current: string, frequency: RecurrenceFrequency): string {
  const date = new Date(current);

  // Usamos date-fns para evitar drift en fin de mes
  // (ej: 31 ene → 28 feb → 28 mar con setMonth, pero date-fns maneja correctamente)
  let next: Date;

  switch (frequency) {
    case 'daily':
      next = addDays(date, 1);
      break;
    case 'weekly':
      next = addWeeks(date, 1);
      break;
    case 'biweekly':
      next = addWeeks(date, 2);
      break;
    case 'monthly':
      next = addMonths(date, 1);
      break;
    case 'quarterly':
      next = addMonths(date, 3);
      break;
    case 'yearly':
      next = addYears(date, 1);
      break;
    default:
      next = date;
  }

  return format(next, 'yyyy-MM-dd');
}
