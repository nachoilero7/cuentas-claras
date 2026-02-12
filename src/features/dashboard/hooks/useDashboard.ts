import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getMonthlyBreakdown,
  getCategoryBreakdown,
  getCategoryBalances,
} from '../services/dashboardService';
import type {
  DashboardSummary,
  MonthlyBreakdown,
  CategoryBreakdown,
  CategoryBalance,
  CategoryBreakdownParams,
} from '../services/dashboardService';

const TWO_MINUTES = 1000 * 60 * 2;
const FIVE_MINUTES = 1000 * 60 * 5;

// ─── Resumen general del dashboard ───────────────────────────────────────────

export function useDashboardSummary(seasonId?: string) {
  return useQuery<DashboardSummary | null>({
    queryKey: ['dashboard', 'summary', seasonId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await getDashboardSummary(seasonId);
      if (error) throw error;
      return data;
    },
    staleTime: TWO_MINUTES,
  });
}

// ─── Desglose mensual de ingresos y gastos ───────────────────────────────────

export function useMonthlyBreakdown(seasonId?: string, months?: number) {
  return useQuery<MonthlyBreakdown[]>({
    queryKey: ['dashboard', 'monthly', seasonId ?? 'all', months ?? 6],
    queryFn: async () => {
      const { data, error } = await getMonthlyBreakdown(seasonId, months);
      if (error) throw error;
      return data;
    },
    staleTime: FIVE_MINUTES,
  });
}

// ─── Desglose por categoria (ingresos o gastos) ─────────────────────────────

export function useCategoryBreakdown(params?: CategoryBreakdownParams) {
  return useQuery<CategoryBreakdown[]>({
    queryKey: [
      'dashboard',
      'category-breakdown',
      params?.seasonId ?? 'all',
      params?.type ?? 'expense',
      params?.startDate ?? 'none',
      params?.endDate ?? 'none',
    ],
    queryFn: async () => {
      const { data, error } = await getCategoryBreakdown(params);
      if (error) throw error;
      return data;
    },
    staleTime: FIVE_MINUTES,
  });
}

// ─── Balances por categoria desde la vista ───────────────────────────────────

export function useCategoryBalances(seasonId?: string) {
  return useQuery<CategoryBalance[]>({
    queryKey: ['dashboard', 'balances', seasonId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await getCategoryBalances(seasonId);
      if (error) throw error;
      return data;
    },
    staleTime: TWO_MINUTES,
  });
}
