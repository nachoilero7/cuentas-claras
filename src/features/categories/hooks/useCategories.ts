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

  return useMutation({
    mutationFn: async (data: Parameters<typeof createCategory>[0]) => {
      const { data: category, error } = await createCategory(data);
      if (error) throw error;
      return category;
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & UpdateCategoryData) => {
      const { data, error } = await updateCategory(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar la lista y el detalle de la categoria actualizada
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', variables.id] });
    },
  });
}

// ─── Eliminar categoria (soft delete) ───────────────────────────────────────

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteCategory(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar las listas de categorias para reflejar la eliminacion
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
