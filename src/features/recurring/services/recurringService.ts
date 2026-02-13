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

// ─── Ejecutar transacciones recurrentes vencidas ───────────────────────────

export async function executeOverdueRecurring(): Promise<{
  executed: number;
  errors: string[];
}> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const errors: string[] = [];
  let executed = 0;

  // Obtener recurrentes activas con next_execution <= hoy
  const { data: overdue, error: fetchError } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .lte('next_execution', today);

  if (fetchError || !overdue || overdue.length === 0) {
    return { executed: 0, errors: fetchError ? [fetchError.message] : [] };
  }

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { executed: 0, errors: ['Usuario no autenticado'] };
  }

  for (const rec of overdue as RecurringTransaction[]) {
    try {
      // Crear la transaccion correspondiente
      const { data: insertedTx, error: insertError } = await supabase
        .from('transactions')
        .insert({
          type: rec.type,
          amount: rec.amount,
          currency: rec.currency,
          description: rec.description,
          notes: rec.notes,
          payment_method: rec.payment_method,
          category_id: rec.category_id,
          transfer_to_category_id: rec.transfer_to_category_id,
          transaction_date: rec.next_execution,
          created_by: user.id,
          status: 'pending',
          season_id: null,
        })
        .select('id')
        .single();

      if (insertError) {
        errors.push(`${rec.description}: ${insertError.message}`);
        continue;
      }

      // Calcular proxima ejecucion y actualizar
      const nextExecution = calculateNextExecution(rec.next_execution, rec.frequency);
      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({
          next_execution: nextExecution,
          last_executed_at: new Date().toISOString(),
        })
        .eq('id', rec.id);

      if (updateError) {
        // Rollback: eliminar la transaccion recien creada para evitar
        // que se duplique en la proxima ejecucion
        if (insertedTx?.id) {
          await supabase.from('transactions').delete().eq('id', insertedTx.id);
        }
        errors.push(`Actualizar ${rec.description}: ${updateError.message}`);
        continue;
      }

      executed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      errors.push(`${rec.description}: ${msg}`);
    }
  }

  return { executed, errors };
}
