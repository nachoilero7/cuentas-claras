import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
} from '@/src/core/services/pushNotifications';

/**
 * Hook que registra push notifications al montar y maneja la navegacion
 * cuando el usuario toca una notificacion.
 */
export function usePushNotifications() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Registrar para push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        savePushToken(token);
      }
    });

    // Listener para cuando el usuario toca una notificacion
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      if (!data?.type) return;

      // Navegar segun el tipo de notificacion
      switch (data.type) {
        case 'approval_pending':
        case 'approval_approved':
        case 'approval_rejected':
          router.push('/approvals');
          break;
        case 'budget_alert':
        case 'balance_alert':
          router.push('/budget-alerts');
          break;
        default:
          router.push('/notifications');
          break;
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
}
