import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { dispatchBudgetAlertNotifications } from '../services/budgetAlertService';
import { queryClient } from '@/src/core/config/queryClient';

/**
 * Hook que verifica alertas de presupuesto al abrir la app.
 * Si alguna categoria excede su umbral, crea notificaciones para admin/manager.
 * Throttled a cada 4 horas para evitar spam.
 */
export function useBudgetAlertDispatch() {
  const hasRun = useRef(false);

  useEffect(() => {
    async function run() {
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        const { notified } = await dispatchBudgetAlertNotifications();

        if (notified > 0) {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        }
      } catch (err) {
        if (__DEV__) console.warn('[BudgetAlertDispatch] Error:', err);
      }
    }

    run();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        hasRun.current = false;
        run();
      }
    });

    return () => subscription.remove();
  }, []);
}
