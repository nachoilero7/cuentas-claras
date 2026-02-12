import { supabase } from '@/src/core/config/supabase';
import type { UserCategoryPermission } from '@/src/core/types/database';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type UpsertPermissionData = {
  user_id: string;
  category_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type PermissionWithCategory = UserCategoryPermission & {
  category: { id: string; name: string; color: string | null; icon: string | null } | null;
};

// Select con join de categoria para obtener nombre, color e icono
const PERMISSION_SELECT = `
  *,
  category:categories!category_id(id, name, color, icon)
`;

// ─── Obtener permisos de un usuario ─────────────────────────────────────────

export async function getUserPermissions(userId: string) {
  const { data, error } = await supabase
    .from('user_category_permissions')
    .select(PERMISSION_SELECT)
    .eq('user_id', userId);

  return { data: (data as PermissionWithCategory[] | null) ?? [], error };
}

// ─── Crear o actualizar un permiso ──────────────────────────────────────────

export async function upsertPermission(permissionData: UpsertPermissionData) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('user_category_permissions')
    .upsert(
      {
        ...permissionData,
        granted_by: user.id,
      },
      { onConflict: 'user_id,category_id' }
    )
    .select(PERMISSION_SELECT)
    .single();

  return { data: data as PermissionWithCategory | null, error };
}

// ─── Eliminar un permiso ────────────────────────────────────────────────────

export async function deletePermission(id: string) {
  const { data, error } = await supabase
    .from('user_category_permissions')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as UserCategoryPermission | null, error };
}

// ─── Actualizar permisos en lote ────────────────────────────────────────────

export async function bulkUpdatePermissions(
  userId: string,
  permissions: UpsertPermissionData[]
) {
  const errors: Error[] = [];

  for (const permission of permissions) {
    const { error } = await upsertPermission({
      ...permission,
      user_id: userId,
    });

    if (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  return { success: errors.length === 0, errors };
}
