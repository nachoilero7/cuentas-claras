import { File as ExpoFile } from 'expo-file-system';

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

// ─── Subir avatar del usuario ────────────────────────────────────────────────

export async function uploadAvatar(
  userId: string,
  imageUri: string,
): Promise<{ url: string | null; error: any }> {
  // Leer el archivo como ArrayBuffer usando la API de expo-file-system v19
  const file = new ExpoFile(imageUri);
  const arrayBuffer = await file.arrayBuffer();

  // Ruta dentro del bucket: {userId}/avatar.jpg
  const filePath = `${userId}/avatar.jpg`;

  // Subir al bucket publico 'avatars' (upsert para sobreescribir)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  // Obtener URL publica del avatar
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Agregar parametro cache-busting para forzar recarga de imagen
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Actualizar el perfil con la nueva URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (updateError) {
    return { url: null, error: updateError };
  }

  return { url: avatarUrl, error: null };
}

// ─── Activar/desactivar usuario (solo admin) ────────────────────────────────

export async function updateUserStatus(userId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
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
