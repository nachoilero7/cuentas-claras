import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllProfiles,
  updateUserRole,
} from '@/src/features/auth/services/profileService';
import {
  getUserPermissions,
  bulkUpdatePermissions,
  deletePermission,
} from '../services/userService';
import type { Profile, UserRole } from '@/src/core/types/database';
import type { PermissionWithCategory, UpsertPermissionData } from '../services/userService';

// ─── Listar todos los usuarios ──────────────────────────────────────────────

export function useAllUsers() {
  return useQuery<Profile[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await getAllProfiles();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Actualizar rol de usuario ──────────────────────────────────────────────

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await updateUserRole(userId, role);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] });
    },
  });
}

// ─── Obtener permisos de un usuario ─────────────────────────────────────────

export function useUserPermissions(userId: string) {
  return useQuery<PermissionWithCategory[]>({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const { data, error } = await getUserPermissions(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Guardar permisos en lote ───────────────────────────────────────────────

export function useSavePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: UpsertPermissionData[];
    }) => {
      const { success, errors } = await bulkUpdatePermissions(userId, permissions);
      if (!success) throw new Error(errors?.join(', ') ?? 'Error al guardar permisos');
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    },
  });
}

// ─── Eliminar un permiso ────────────────────────────────────────────────────

export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deletePermission(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
    },
  });
}
