import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import type { Category } from '@/src/core/types/database';
import type { UpdateCategoryData } from '../services/categoryService';
import { useOfflineAware } from '@/src/sync';
import { invalidateFinancialData } from '@/src/core/utils/queryInvalidation';

const TWO_MINUTES = 1000 * 60 * 2;

// ─── Listar categorias (opcionalmente por temporada) ────────────────────────

export function useCategories(seasonId?: string) {
  return useQuery<Category[]>({
    queryKey: ['categories', seasonId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await getCategories(seasonId);
      if (error) throw error;
      return data;
    },
    staleTime: TWO_MINUTES,
  });
}

// ─── Obtener una categoria por ID ───────────────────────────────────────────

export function useCategory(id: string) {
  return useQuery<Category | null>({
    queryKey: ['category', id],
    queryFn: async () => {
      const { data, error } = await getCategoryById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Crear nueva categoria ──────────────────────────────────────────────────

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async (data: Parameters<typeof createCategory>[0]) => {
      const { result, queued } = await executeOrQueue(
        'create_category',
        { ...data } as unknown as Record<string, unknown>,
        async () => {
          const { data: category, error } = await createCategory(data);
          if (error) throw error;
          return category;
        },
      );

      if (queued) return null;
      return result;
    },
    onSuccess: () => {
      // Invalidar todas las queries de categorias para refrescar las listas
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ─── Actualizar categoria ───────────────────────────────────────────────────

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateCategoryData) => {
      const { result, queued } = await executeOrQueue(
        'update_category',
        { id, ...updates } as unknown as Record<string, unknown>,
        async () => {
          const { data, error } = await updateCategory(id, updates);
          if (error) throw error;
          return data;
        },
      );

      if (queued) return null;
      return result;
    },
    onMutate: async (variables: { id: string } & UpdateCategoryData) => {
      const { id, ...updates } = variables;

      // Cancelar queries en curso para evitar sobreescribir la actualizacion optimista
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      await queryClient.cancelQueries({ queryKey: ['category', id] });

      // Snapshot del estado previo de las listas y del detalle
      const previousCategories = queryClient.getQueriesData<Category[]>({
        queryKey: ['categories'],
      });
      const previousCategory = queryClient.getQueryData<Category | null>(['category', id]);

      // Actualizar optimistamente en todas las listas cacheadas
      queryClient.setQueriesData<Category[]>(
        { queryKey: ['categories'] },
        (old) =>
          old?.map((c) =>
            c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c,
          ),
      );

      // Actualizar optimistamente el detalle individual
      if (previousCategory) {
        queryClient.setQueryData<Category | null>(['category', id], {
          ...previousCategory,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousCategories, previousCategory, id };
    },
    onError: (_err, _variables, context) => {
      // Rollback: restaurar el estado previo de las listas
      if (context?.previousCategories) {
        for (const [queryKey, data] of context.previousCategories) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      // Rollback: restaurar el detalle individual
      if (context?.id && context?.previousCategory !== undefined) {
        queryClient.setQueryData(['category', context.id], context.previousCategory);
      }
    },
    onSuccess: (_data, variables, context) => {
      // Invalidar la lista y el detalle de la categoria actualizada
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', variables.id] });

      // Solo invalidar datos financieros si cambio el presupuesto
      // (nombre/icono/color/descripcion no afectan saldos ni reportes)
      const prev = context?.previousCategory;
      const budgetChanged = !prev
        || prev.budget_limit_ars !== (variables.budget_limit_ars ?? null)
        || prev.budget_limit_usd !== (variables.budget_limit_usd ?? null);

      if (budgetChanged) {
        invalidateFinancialData(queryClient);
        queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
      }
    },
  });
}

// ─── Eliminar categoria (soft delete) ───────────────────────────────────────

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { executeOrQueue } = useOfflineAware();

  return useMutation({
    mutationFn: async (id: string) => {
      const { result, queued } = await executeOrQueue(
        'delete_category',
        { id },
        async () => {
          const { data, error } = await deleteCategory(id);
          if (error) throw error;
          return data;
        },
      );

      if (queued) return null;
      return result;
    },
    onMutate: async (id: string) => {
      // Cancelar queries en curso para evitar sobreescribir la actualizacion optimista
      await queryClient.cancelQueries({ queryKey: ['categories'] });

      // Snapshot del estado previo de todas las queries de categorias
      const previousCategories = queryClient.getQueriesData<Category[]>({
        queryKey: ['categories'],
      });

      // Remover optimistamente la categoria de todas las listas cacheadas
      queryClient.setQueriesData<Category[]>(
        { queryKey: ['categories'] },
        (old) => old?.filter((c) => c.id !== id),
      );

      return { previousCategories };
    },
    onError: (_err, _id, context) => {
      // Rollback: restaurar el estado previo de todas las queries
      if (context?.previousCategories) {
        for (const [queryKey, data] of context.previousCategories) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: () => {
      // Invalidar las listas de categorias para reflejar la eliminacion
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Invalidar todos los datos financieros que referencian categorias
      invalidateFinancialData(queryClient);
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
    },
  });
}
