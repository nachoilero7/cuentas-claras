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
import { useOfflineAware } from '@/src/sync';
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
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async (input: CreateTransactionData & { status?: TransactionStatus }) => {
      const { status, ...data } = input;

      const { result, queued } = await executeOrQueue(
        'create_transaction',
        { ...data, status } as unknown as Record<string, unknown>,
        async () => {
          const { data: transaction, error } = await createTransaction(data, status);
          if (error) throw error;
          return transaction;
        },
      );

      if (queued) return null;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Actualizar transaccion ─────────────────────────────────────────────────

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateTransactionData) => {
      const { result, queued } = await executeOrQueue(
        'update_transaction',
        { id, ...updates } as unknown as Record<string, unknown>,
        async () => {
          const { data, error } = await updateTransaction(id, updates);
          if (error) throw error;
          return data;
        },
      );

      if (queued) return null;
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.id] });
    },
  });
}

// ─── Eliminar transaccion ───────────────────────────────────────────────────

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async (id: string) => {
      const { result, queued } = await executeOrQueue(
        'delete_transaction',
        { id },
        async () => {
          const { data, error } = await deleteTransaction(id);
          if (error) throw error;
          return data;
        },
      );

      if (queued) return null;
      return result;
    },
    onMutate: async (id: string) => {
      // Cancelar queries en curso para evitar sobreescribir la actualizacion optimista
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      // Snapshot del estado previo de todas las queries de transacciones
      const previousTransactions = queryClient.getQueriesData<TransactionWithCategory[]>({
        queryKey: ['transactions'],
      });

      // Remover optimistamente la transaccion de todas las listas cacheadas
      queryClient.setQueriesData<TransactionWithCategory[]>(
        { queryKey: ['transactions'] },
        (old) => old?.filter((t) => t.id !== id),
      );

      return { previousTransactions };
    },
    onError: (_err, _id, context) => {
      // Rollback: restaurar el estado previo de todas las queries
      if (context?.previousTransactions) {
        for (const [queryKey, data] of context.previousTransactions) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
