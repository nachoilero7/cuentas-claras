import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/core/providers/AuthProvider';
import {
  getProfileById,
  updateProfile,
  getAllProfiles,
} from '../services/profileService';
import type { Profile } from '@/src/core/types/database';

const FIVE_MINUTES = 1000 * 60 * 5;

// ─── Perfil del usuario actual (o por ID) ───────────────────────────────────

export function useProfile(userId?: string) {
  const { user } = useAuth();
  const resolvedId = userId ?? user?.id;

  return useQuery<Profile | null>({
    queryKey: ['profile', resolvedId],
    queryFn: async () => {
      if (!resolvedId) return null;
      const { data, error } = await getProfileById(resolvedId);
      if (error) throw error;
      return data;
    },
    enabled: !!resolvedId,
    staleTime: FIVE_MINUTES,
  });
}

// ─── Mutacion para actualizar perfil ────────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      updates: Partial<Pick<Profile, 'display_name' | 'phone' | 'avatar_url'>>
    ) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      const { data, error } = await updateProfile(user.id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar cache del perfil para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

// ─── Todos los perfiles (admin) ─────────────────────────────────────────────

export function useAllProfiles() {
  return useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await getAllProfiles();
      if (error) throw error;
      return data;
    },
  });
}
