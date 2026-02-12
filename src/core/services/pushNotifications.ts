import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/src/core/config/supabase';

// ─── Configurar comportamiento de notificaciones en foreground ─────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Registrar dispositivo para push notifications ─────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  // Solo funciona en dispositivos fisicos
  if (!Device.isDevice) {
    console.warn('Push notifications solo funcionan en dispositivos fisicos');
    return null;
  }

  // Verificar permisos existentes
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Si no hay permiso, solicitarlo
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permisos de notificaciones no otorgados');
    return null;
  }

  // Configurar canal de notificaciones en Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B6EF3',
    });

    await Notifications.setNotificationChannelAsync('approvals', {
      name: 'Aprobaciones',
      description: 'Notificaciones de aprobacion de transacciones',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Presupuesto',
      description: 'Alertas de presupuesto por rubro',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Obtener token de push
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    return tokenData.data;
  } catch (error) {
    console.error('Error obteniendo push token:', error);
    return null;
  }
}

// ─── Guardar token en el perfil del usuario ────────────────────────────────

export async function savePushToken(token: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return;

  // Guardar token en el perfil (campo push_token si existe, sino en metadata)
  await supabase
    .from('profiles')
    .update({ push_token: token } as any)
    .eq('id', user.id);
}

// ─── Enviar notificacion local ─────────────────────────────────────────────

export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId: string = 'default',
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger: null, // Inmediata
  });
}

// ─── Notificaciones locales especificas ────────────────────────────────────

export async function notifyApprovalPending(description: string, amount: string) {
  await sendLocalNotification(
    'Aprobacion pendiente',
    `Nueva transaccion requiere aprobacion: ${description} por ${amount}`,
    { type: 'approval_pending' },
    'approvals',
  );
}

export async function notifyApprovalResult(
  description: string,
  approved: boolean,
) {
  const status = approved ? 'aprobada' : 'rechazada';
  await sendLocalNotification(
    `Transaccion ${status}`,
    `La transaccion "${description}" fue ${status}.`,
    { type: approved ? 'approval_approved' : 'approval_rejected' },
    'approvals',
  );
}

export async function notifyBudgetThreshold(
  categoryName: string,
  percentage: number,
) {
  await sendLocalNotification(
    'Alerta de presupuesto',
    `El rubro "${categoryName}" alcanzo el ${Math.round(percentage)}% de su presupuesto.`,
    { type: 'budget_alert', category: categoryName, percentage },
    'budget',
  );
}

// ─── Obtener tokens de push de usuarios admin ──────────────────────────────

export async function getAdminPushTokens(): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('role', 'admin')
    .eq('is_active', true)
    .not('push_token', 'is', null);

  return (data ?? [])
    .map((p: any) => p.push_token as string)
    .filter(Boolean);
}

// ─── Obtener token de push de un usuario especifico ────────────────────────

export async function getUserPushToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single();

  return (data as any)?.push_token ?? null;
}

// ─── Enviar push notifications via Expo Push API ───────────────────────────

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  channelId: string = 'approvals',
) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    channelId,
    sound: 'default' as const,
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('[Push] Error enviando push notifications:', error);
  }
}

// ─── Notificar a todos los administradores ─────────────────────────────────

export async function sendPushToAdmins(
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const tokens = await getAdminPushTokens();
  await sendExpoPush(tokens, title, body, data);
}

// ─── Notificar a un usuario especifico ─────────────────────────────────────

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const token = await getUserPushToken(userId);
  if (token) {
    await sendExpoPush([token], title, body, data);
  }
}

// ─── Obtener cantidad de notificaciones en badge ───────────────────────────

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// ─── Listeners de notificaciones ───────────────────────────────────────────

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
