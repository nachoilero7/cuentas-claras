import { supabase } from '@/src/core/config/supabase';
import type { TransactionType, CurrencyCode } from '@/src/core/types/database';

// ── Tipos de filtros para reportes ──────────────────────────────────────────

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: TransactionType;
  currency?: CurrencyCode;
  seasonId?: string;
}

// ── Resumen general de reporte ──────────────────────────────────────────────

export interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  netBalance: number;
  transactionCount: number;
  currency: CurrencyCode;
}

// ── Item de reporte agrupado por categoria ──────────────────────────────────

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
}

// ── Select con join de categorias (misma estructura que transactionService) ─

const REPORT_SELECT = `
  *,
  category:categories!category_id(id, name, color, icon),
  transfer_to_category:categories!transfer_to_category_id(id, name, color, icon),
  creator:profiles!created_by(display_name, full_name)
`;

// ── Aplicar filtros comunes a una query de transacciones ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters?: ReportFilters) {
  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.currency) {
    query = query.eq('currency', filters.currency);
  }
  if (filters?.seasonId) {
    query = query.eq('season_id', filters.seasonId);
  }

  return query;
}

// ── Obtener resumen general de transacciones ────────────────────────────────

export async function getReportSummary(
  filters?: ReportFilters,
): Promise<{ data: ReportSummary | null; error: Error | null }> {
  try {
    let query = supabase
      .from('transactions')
      .select('type, amount, currency')
      .eq('status', 'approved');

    query = applyFilters(query, filters);

    const { data, error } = await query;

    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: null, error: null };

    // Agregar totales en JS para simplicidad
    const transactions = data as Array<{ type: string; amount: number; currency: string }>;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfers = 0;

    for (const t of transactions) {
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'expense') totalExpenses += t.amount;
      else if (t.type === 'transfer') totalTransfers += t.amount;
    }

    // Determinar la moneda predominante o usar la del filtro
    const currency: CurrencyCode = filters?.currency ?? 'ARS';

    const summary: ReportSummary = {
      totalIncome,
      totalExpenses,
      totalTransfers,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      currency,
    };

    return { data: summary, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ── Obtener reporte agrupado por categoria ──────────────────────────────────

export async function getCategoryReport(
  filters?: ReportFilters,
): Promise<{ data: CategoryReportItem[]; error: Error | null }> {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        type, amount, category_id,
        category:categories!category_id(id, name, color, icon)
      `)
      .eq('status', 'approved');

    query = applyFilters(query, filters);

    const { data, error } = await query;

    if (error) return { data: [], error };
    if (!data || data.length === 0) return { data: [], error: null };

    // Agrupar transacciones por categoria en JS
    const categoryMap = new Map<string, CategoryReportItem>();

    for (const row of (data as unknown as Array<{
      type: string;
      amount: number;
      category_id: string;
      category: { id: string; name: string; color: string | null; icon: string | null } | null;
    }>)) {
      const catId = row.category_id;
      let item = categoryMap.get(catId);

      if (!item) {
        item = {
          categoryId: catId,
          categoryName: row.category?.name ?? 'Sin categoria',
          categoryColor: row.category?.color ?? null,
          categoryIcon: row.category?.icon ?? null,
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          transactionCount: 0,
        };
        categoryMap.set(catId, item);
      }

      if (row.type === 'income') item.totalIncome += row.amount;
      else if (row.type === 'expense') item.totalExpenses += row.amount;

      item.transactionCount += 1;
    }

    // Calcular balance neto para cada categoria
    for (const item of categoryMap.values()) {
      item.netBalance = item.totalIncome - item.totalExpenses;
    }

    return { data: Array.from(categoryMap.values()), error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

// ── Obtener transacciones para exportacion (sin limite de paginacion) ───────

export async function getTransactionsForExport(filters?: ReportFilters) {
  try {
    let query = supabase
      .from('transactions')
      .select(REPORT_SELECT)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10000);

    query = applyFilters(query, filters);

    const { data, error } = await query;

    return { data: data ?? [], error };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}
