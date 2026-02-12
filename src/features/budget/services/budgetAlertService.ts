import { supabase } from '@/src/core/config/supabase';
import type { BudgetAlert } from '@/src/core/types/database';

// ─── Tipos extendidos para alertas con datos de categoria ───────────────────

export interface BudgetAlertWithCategory extends BudgetAlert {
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    budget_limit_ars: number | null;
  } | null;
}

export interface BudgetStatus {
  category_id: string;
  category_name: string;
  budget_limit: number;
  current_spending: number;
  percentage_used: number;
  threshold_percentage: number;
  is_over_threshold: boolean;
}

// ─── Select con join de categoria ───────────────────────────────────────────

const ALERT_SELECT = `
  *,
  category:categories!category_id(id, name, color, icon, budget_limit_ars)
`;

// ─── Obtener todas las alertas de presupuesto con info de categoria ─────────

export async function getBudgetAlerts() {
  const { data, error } = await supabase
    .from('budget_alerts')
    .select(ALERT_SELECT)
    .order('created_at', { ascending: false });

  return { data: (data as BudgetAlertWithCategory[] | null) ?? [], error };
}

// ─── Obtener la alerta configurada para una categoria especifica ────────────

export async function getBudgetAlertByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .select(ALERT_SELECT)
    .eq('category_id', categoryId)
    .single();

  return { data: data as BudgetAlertWithCategory | null, error };
}

// ─── Crear o actualizar una alerta de presupuesto (upsert on category_id) ──

export async function upsertBudgetAlert(alertData: {
  category_id: string;
  threshold_percentage: number;
  is_active: boolean;
}) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .upsert(alertData, { onConflict: 'category_id' })
    .select(ALERT_SELECT)
    .single();

  return { data: data as BudgetAlertWithCategory | null, error };
}

// ─── Eliminar una alerta de presupuesto ────────────────────────────────────

export async function deleteBudgetAlert(id: string) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as BudgetAlert | null, error };
}

// ─── Verificar el estado del presupuesto para una categoria ────────────────

export async function checkBudgetStatus(categoryId: string): Promise<{ data: BudgetStatus | null; error: Error | null }> {
  // Obtener la alerta configurada para la categoria
  const { data: alert, error: alertError } = await supabase
    .from('budget_alerts')
    .select('threshold_percentage')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .single();

  if (alertError) {
    return { data: null, error: alertError };
  }

  // Obtener el balance actual desde la vista category_balances
  const { data: balance, error: balanceError } = await supabase
    .from('category_balances')
    .select('category_name, budget_limit_ars, total_expenses_ars')
    .eq('category_id', categoryId)
    .single();

  if (balanceError) {
    return { data: null, error: balanceError };
  }

  const budgetLimit = balance.budget_limit_ars ?? 0;
  const currentSpending = balance.total_expenses_ars ?? 0;
  const thresholdPercentage = alert.threshold_percentage;
  const percentageUsed = budgetLimit > 0 ? (currentSpending / budgetLimit) * 100 : 0;

  return {
    data: {
      category_id: categoryId,
      category_name: balance.category_name,
      budget_limit: budgetLimit,
      current_spending: currentSpending,
      percentage_used: Math.round(percentageUsed * 100) / 100,
      threshold_percentage: thresholdPercentage,
      is_over_threshold: percentageUsed >= thresholdPercentage,
    },
    error: null,
  };
}

// ─── Verificar el presupuesto de todas las categorias con alertas activas ──

export async function checkAllBudgets(): Promise<{ data: BudgetStatus[]; error: Error | null }> {
  // Obtener todas las alertas activas
  const { data: alerts, error: alertsError } = await supabase
    .from('budget_alerts')
    .select('category_id, threshold_percentage')
    .eq('is_active', true);

  if (alertsError) {
    return { data: [], error: alertsError };
  }

  if (!alerts || alerts.length === 0) {
    return { data: [], error: null };
  }

  // Obtener los balances de todas las categorias con alertas activas
  const categoryIds = alerts.map((a) => a.category_id);
  const { data: balances, error: balancesError } = await supabase
    .from('category_balances')
    .select('category_id, category_name, budget_limit_ars, total_expenses_ars')
    .in('category_id', categoryIds);

  if (balancesError) {
    return { data: [], error: balancesError };
  }

  // Construir el mapa de balances por category_id
  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.category_id, b])
  );

  // Calcular el estado de cada alerta
  const statuses: BudgetStatus[] = alerts
    .map((alert) => {
      const balance = balanceMap.get(alert.category_id);
      if (!balance) return null;

      const budgetLimit = balance.budget_limit_ars ?? 0;
      const currentSpending = balance.total_expenses_ars ?? 0;
      const percentageUsed = budgetLimit > 0 ? (currentSpending / budgetLimit) * 100 : 0;

      return {
        category_id: alert.category_id,
        category_name: balance.category_name,
        budget_limit: budgetLimit,
        current_spending: currentSpending,
        percentage_used: Math.round(percentageUsed * 100) / 100,
        threshold_percentage: alert.threshold_percentage,
        is_over_threshold: percentageUsed >= alert.threshold_percentage,
      };
    })
    .filter((s): s is BudgetStatus => s !== null);

  return { data: statuses, error: null };
}
