import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBudgetAlerts,
  upsertBudgetAlert,
  deleteBudgetAlert,
  checkAllBudgets,
} from '../services/budgetAlertService';
import type { BudgetAlertWithCategory, BudgetStatus } from '../services/budgetAlertService';
import type { BalanceAlertType } from '@/src/core/types/database';

// ─── Obtener todas las alertas de presupuesto con datos de categoria ────────

export function useBudgetAlerts() {
  return useQuery<BudgetAlertWithCategory[]>({
    queryKey: ['budget-alerts'],
    queryFn: async () => {
      const { data, error } = await getBudgetAlerts();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Crear o actualizar una alerta de balance ───────────────────────────────

export function useUpsertBudgetAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      alert_type: BalanceAlertType;
      threshold_amount: number;
      is_active: boolean;
    }) => {
      const { data: alert, error } = await upsertBudgetAlert(data);
      if (error) throw error;
      return alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

// ─── Eliminar una alerta de presupuesto ────────────────────────────────────

export function useDeleteBudgetAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteBudgetAlert(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-status'] });
    },
  });
}

// ─── Verificar el estado de todos los presupuestos con alertas activas ─────

export function useBudgetStatus(seasonId?: string) {
  return useQuery<BudgetStatus[]>({
    queryKey: ['budget-status', seasonId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await checkAllBudgets(seasonId);
      if (error) throw error;
      return data;
    },
  });
}
