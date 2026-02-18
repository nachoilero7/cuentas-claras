import { supabase } from '@/src/core/config/supabase';
import type { Category } from '@/src/core/types/database';

// ─── Tipos para crear y actualizar categorias ───────────────────────────────

export type CreateCategoryData = {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  budget_limit_ars?: number | null;
  budget_limit_usd?: number | null;
  season_id?: string | null;
  parent_category_id?: string | null;
  sort_order?: number;
};

export type UpdateCategoryData = Partial<CreateCategoryData> & {
  is_active?: boolean;
};

// ─── Listar categorias activas ──────────────────────────────────────────────

export async function getCategories(seasonId?: string) {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  // Filtrar por temporada si se proporciona
  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  return { data: (data as Category[] | null) ?? [], error };
}

// ─── Obtener categoria por ID ───────────────────────────────────────────────

export async function getCategoryById(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  return { data: data as Category | null, error };
}

// ─── Crear nueva categoria ──────────────────────────────────────────────────

export async function createCategory(categoryData: CreateCategoryData) {
  // Obtener el usuario autenticado para asignar created_by
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...categoryData,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single();

  return { data: data as Category | null, error };
}

// ─── Actualizar categoria existente ─────────────────────────────────────────

export async function updateCategory(id: string, updates: UpdateCategoryData) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data: data as Category | null, error };
}

// ─── Eliminar categoria (soft delete: desactivar) ───────────────────────────

export async function deleteCategory(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  return { data: data as Category | null, error };
}

// ─── Marcar rubro como favorito (atomico: desactiva el anterior) ─────────────

export async function setFavoriteCategory(categoryId: string) {
  const { error } = await supabase.rpc('set_favorite_category', {
    p_category_id: categoryId,
  });
  return { error };
}

// ─── Quitar rubro favorito ──────────────────────────────────────────────────

export async function unsetFavoriteCategory(categoryId: string) {
  const { error } = await supabase.rpc('unset_favorite_category', {
    p_category_id: categoryId,
  });
  return { error };
}

// ─── Eliminar categoria permanentemente ─────────────────────────────────────

export async function hardDeleteCategory(id: string) {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as Category | null, error };
}
