import { useQuery } from '@tanstack/react-query';
import {
  getReportSummary,
  getCategoryReport,
  getTransactionsForExport,
} from '../services/reportService';
import type { ReportFilters, ReportSummary, CategoryReportItem } from '../services/reportService';

const DOS_MINUTOS = 1000 * 60 * 2;

// ── Resumen general de ingresos, egresos y balance ──────────────────────────

export function useReportSummary(filters?: ReportFilters) {
  return useQuery<ReportSummary | null>({
    queryKey: ['report-summary', filters],
    queryFn: async () => {
      const { data, error } = await getReportSummary(filters);
      if (error) throw error;
      return data;
    },
    staleTime: DOS_MINUTOS,
  });
}

// ── Reporte agrupado por categoria ──────────────────────────────────────────

export function useCategoryReport(filters?: ReportFilters) {
  return useQuery<CategoryReportItem[]>({
    queryKey: ['category-report', filters],
    queryFn: async () => {
      const { data, error } = await getCategoryReport(filters);
      if (error) throw error;
      return data;
    },
    staleTime: DOS_MINUTOS,
  });
}

// ── Transacciones para exportacion (solo se ejecuta con refetch manual) ─────

export function useTransactionsForExport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['transactions-export', filters],
    queryFn: async () => {
      const { data, error } = await getTransactionsForExport(filters);
      if (error) throw error;
      return data;
    },
    staleTime: DOS_MINUTOS,
    enabled: false,
  });
}
