import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import type { Notification } from '@/src/core/types/database';

const THIRTY_SECONDS = 1000 * 30;
const ONE_MINUTE = 1000 * 60;

// ─── Obtener notificaciones del usuario actual ──────────────────────────────

export function useNotifications(limit?: number) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', limit ?? 'all'],
    queryFn: async () => {
      const { data, error } = await getUserNotifications(limit);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Obtener cantidad de notificaciones no leidas ───────────────────────────

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data, error } = await getUnreadCount();
      if (error) throw error;
      return data;
    },
    staleTime: THIRTY_SECONDS,
    refetchInterval: ONE_MINUTE,
    refetchIntervalInBackground: false,
  });
}

// ─── Marcar una notificacion como leida ────────────────────────────────────

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await markAsRead(notificationId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Marcar todas las notificaciones como leidas ───────────────────────────

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await markAllAsRead();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
