import { supabase } from '@/src/core/config/supabase';
import type { Profile, UserRole } from '@/src/core/types/database';

// Campos editables por el propio usuario
type ProfileUpdateData = Pick<Profile, 'display_name' | 'phone' | 'avatar_url' | 'payment_alias'>;

// ─── Obtener perfil del usuario autenticado ─────────────────────────────────

export async function getMyProfile() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data: data as Profile | null, error };
}

// ─── Obtener perfil por ID ──────────────────────────────────────────────────

export async function getProfileById(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data: data as Profile | null, error };
}

// ─── Actualizar perfil ──────────────────────────────────────────────────────

export async function updateProfile(userId: string, updates: Partial<ProfileUpdateData>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}

// ─── Obtener todos los perfiles (solo admin) ────────────────────────────────

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  return { data: (data as Profile[] | null) ?? [], error };
}

// ─── Actualizar rol de usuario (solo admin) ─────────────────────────────────

export async function updateUserRole(userId: string, role: UserRole) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}
