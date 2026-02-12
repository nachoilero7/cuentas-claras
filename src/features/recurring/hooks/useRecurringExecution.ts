import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { executeOverdueRecurring } from '../services/recurringService';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { queryClient } from '@/src/core/config/queryClient';

/**
 * Hook que ejecuta transacciones recurrentes vencidas al abrir la app.
 * Se ejecuta una sola vez por sesion de foreground.
 */
export function useRecurringExecution() {
  const hasRun = useRef(false);

  useEffect(() => {
    async function run() {
      if (hasRun.current) return;
      hasRun.current = true;

      try {
        const { executed, errors } = await executeOverdueRecurring();

        if (executed > 0) {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['recurring'] });

          showSnackbar(
            `${executed} movimiento${executed > 1 ? 's' : ''} recurrente${executed > 1 ? 's' : ''} creado${executed > 1 ? 's' : ''}`,
          );
        }

        if (errors.length > 0) {
          console.warn('[RecurringExecution] Errores:', errors);
        }
      } catch (err) {
        console.warn('[RecurringExecution] Error general:', err);
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
