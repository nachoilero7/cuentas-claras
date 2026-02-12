import { supabase } from '@/src/core/config/supabase';
import type { Notification } from '@/src/core/types/database';

// ─── Obtener notificaciones del usuario actual ──────────────────────────────

export async function getUserNotifications(limit?: number) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  return { data: (data as Notification[] | null) ?? [], error };
}

// ─── Obtener cantidad de notificaciones no leidas ───────────────────────────

export async function getUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  return { data: count ?? 0, error };
}

// ─── Marcar una notificacion como leida ────────────────────────────────────

export async function markAsRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  return { data: data as Notification | null, error };
}

// ─── Marcar todas las notificaciones como leidas para el usuario actual ────

export async function markAllAsRead() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .select();

  return { data: (data as Notification[] | null) ?? [], error };
}

// ─── Crear una notificacion ────────────────────────────────────────────────

export async function createNotification(notificationData: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();

  return { data: data as Notification | null, error };
}

// ─── Crear notificaciones de alerta de presupuesto para multiples usuarios ──

export async function createBudgetAlertNotification(
  categoryName: string,
  percentage: number,
  targetUserIds: string[]
) {
  const notifications = targetUserIds.map((userId) => ({
    user_id: userId,
    title: `Alerta de presupuesto: ${categoryName}`,
    body: `El gasto en "${categoryName}" ha alcanzado el ${Math.round(percentage)}% del presupuesto asignado.`,
    type: 'budget_alert',
    data: {
      category_name: categoryName,
      percentage_used: percentage,
    },
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  return { data: (data as Notification[] | null) ?? [], error };
}

// ─── Eliminar una notificacion ──────────────────────────────────────────────

export async function deleteNotification(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as Notification | null, error };
}
