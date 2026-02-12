import { supabase } from '@/src/core/config/supabase';

// ─── Tipos del resumen general del dashboard ─────────────────────────────────

export interface DashboardSummary {
  total_income_ars: number;
  total_expenses_ars: number;
  net_balance_ars: number;
  transaction_count: number;
  pending_approvals: number;
}

// ─── Tipos del desglose mensual ──────────────────────────────────────────────

export interface MonthlyBreakdown {
  month: string;
  label: string;
  income: number;
  expenses: number;
}

// ─── Tipos del desglose por categoria ────────────────────────────────────────

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  color: string | null;
  icon: string | null;
  total_ars: number;
  count: number;
}

// ─── Tipos de la vista de balances por categoria ─────────────────────────────

export interface CategoryBalance {
  category_id: string;
  category_name: string;
  color: string | null;
  icon: string | null;
  season_id: string | null;
  budget_limit_ars: number | null;
  budget_limit_usd: number | null;
  is_active: boolean;
  total_income_ars: number;
  total_expenses_ars: number;
  net_transfers_ars: number;
  balance_ars: number;
  transaction_count: number;
}

// ─── Parametros para el desglose por categoria ──────────────────────────────

export interface CategoryBreakdownParams {
  seasonId?: string;
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
}

// ─── Obtener resumen general del dashboard ───────────────────────────────────

export async function getDashboardSummary(seasonId?: string) {
  const { data, error } = await supabase.rpc('get_dashboard_summary', {
    p_season_id: seasonId ?? null,
  });

  return { data: data as DashboardSummary | null, error };
}

// ─── Obtener desglose mensual de ingresos y gastos ───────────────────────────

export async function getMonthlyBreakdown(seasonId?: string, months?: number) {
  const { data, error } = await supabase.rpc('get_monthly_breakdown', {
    p_season_id: seasonId ?? null,
    p_months: months ?? 6,
  });

  return { data: (data as MonthlyBreakdown[] | null) ?? [], error };
}

// ─── Obtener desglose por categoria (ingresos o gastos) ─────────────────────

export async function getCategoryBreakdown(params?: CategoryBreakdownParams) {
  const { data, error } = await supabase.rpc('get_category_breakdown', {
    p_season_id: params?.seasonId ?? null,
    p_type: params?.type ?? 'expense',
    p_start_date: params?.startDate ?? null,
    p_end_date: params?.endDate ?? null,
  });

  return { data: (data as CategoryBreakdown[] | null) ?? [], error };
}

// ─── Obtener balances por categoria desde la vista ───────────────────────────

export async function getCategoryBalances(seasonId?: string) {
  let query = supabase.from('category_balances').select('*');

  // Filtrar por temporada si se proporciona
  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  return { data: (data as CategoryBalance[] | null) ?? [], error };
}
