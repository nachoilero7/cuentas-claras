import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transactionService';
import type {
  TransactionWithCategory,
  TransactionFilters,
  UpdateTransactionData,
  CreateTransactionData,
} from '../services/transactionService';
import type { TransactionStatus } from '@/src/core/types/database';

const ONE_MINUTE = 1000 * 60;

// ─── Listar transacciones con filtros opcionales ────────────────────────────

export function useTransactions(filters?: TransactionFilters) {
  return useQuery<TransactionWithCategory[]>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { data, error } = await getTransactions(filters);
      if (error) throw error;
      return data;
    },
    staleTime: ONE_MINUTE,
  });
}

// ─── Obtener una transaccion por ID ─────────────────────────────────────────

export function useTransaction(id: string) {
  return useQuery<TransactionWithCategory | null>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await getTransactionById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Crear nueva transaccion ────────────────────────────────────────────────

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionData & { status?: TransactionStatus }) => {
      const { status, ...data } = input;
      const { data: transaction, error } = await createTransaction(data, status);
      if (error) throw error;
      return transaction;
    },
    onSuccess: () => {
      // Invalidar transacciones, aprobaciones y dashboard para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Actualizar transaccion ─────────────────────────────────────────────────

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateTransactionData) => {
      const { data, error } = await updateTransaction(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar la lista y el detalle de la transaccion actualizada
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.id] });
    },
  });
}

// ─── Eliminar transaccion ───────────────────────────────────────────────────

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteTransaction(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar las listas de transacciones para reflejar la eliminacion
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
