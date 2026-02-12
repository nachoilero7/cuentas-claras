import { supabase } from '@/src/core/config/supabase';
import type { Season } from '@/src/core/types/database';

// ── Tipos para crear y actualizar temporadas ────────────────────────────────

export type CreateSeasonData = {
  name: string;
  start_date: string;
  end_date?: string | null;
  status?: 'active' | 'closed' | 'planning';
  description?: string | null;
};

export type UpdateSeasonData = Partial<CreateSeasonData> & {
  is_current?: boolean;
};

// ── Listar todas las temporadas ─────────────────────────────────────────────

export async function getSeasons() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false });

  return { data: (data as Season[] | null) ?? [], error };
}

// ── Obtener temporada por ID ────────────────────────────────────────────────

export async function getSeasonById(id: string) {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('id', id)
    .single();

  return { data: data as Season | null, error };
}

// ── Obtener la temporada actual ─────────────────────────────────────────────

export async function getCurrentSeason() {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_current', true)
    .single();

  return { data: data as Season | null, error };
}

// ── Crear nueva temporada ───────────────────────────────────────────────────

export async function createSeason(seasonData: CreateSeasonData) {
  // Obtener el usuario autenticado para asignar created_by
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('seasons')
    .insert({
      ...seasonData,
      created_by: user.id,
    })
    .select()
    .single();

  return { data: data as Season | null, error };
}

// ── Actualizar temporada existente ──────────────────────────────────────────

export async function updateSeason(id: string, updates: UpdateSeasonData) {
  const { data, error } = await supabase
    .from('seasons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data: data as Season | null, error };
}

// ── Establecer temporada actual ─────────────────────────────────────────────

export async function setCurrentSeason(id: string) {
  // Primero desmarcar todas las temporadas como no actuales
  const { error: resetError } = await supabase
    .from('seasons')
    .update({ is_current: false })
    .neq('id', '');

  if (resetError) {
    return { data: null, error: resetError };
  }

  // Luego marcar la temporada indicada como actual
  const { data, error } = await supabase
    .from('seasons')
    .update({ is_current: true })
    .eq('id', id)
    .select()
    .single();

  return { data: data as Season | null, error };
}

// ── Eliminar temporada ──────────────────────────────────────────────────────

export async function deleteSeason(id: string) {
  const { data, error } = await supabase
    .from('seasons')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as Season | null, error };
}
