import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
} from '../services';
import type { CreateRecurringInput } from '../services';

const RECURRING_KEY = ['recurring-transactions'];

export function useRecurringTransactions() {
  return useQuery({
    queryKey: RECURRING_KEY,
    queryFn: async () => {
      const { data, error } = await getRecurringTransactions();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const { data, error } = await createRecurringTransaction(input);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateRecurringInput & { is_active: boolean }>;
    }) => {
      const { data, error } = await updateRecurringTransaction(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteRecurringTransaction(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}

export function useToggleRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await toggleRecurringTransaction(id, isActive);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
    },
  });
}
