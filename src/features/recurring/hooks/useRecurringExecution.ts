import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { executeOverdueRecurring } from '../services/recurringService';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { queryClient } from '@/src/core/config/queryClient';
import { invalidateFinancialData } from '@/src/core/utils/queryInvalidation';

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
          invalidateFinancialData(queryClient);
          queryClient.invalidateQueries({ queryKey: ['recurring'] });

          showSnackbar(
            `${executed} movimiento${executed > 1 ? 's' : ''} recurrente${executed > 1 ? 's' : ''} creado${executed > 1 ? 's' : ''}`,
          );
        }

        if (errors.length > 0) {
          if (__DEV__) console.warn('[RecurringExecution] Errores:', errors);
        }
      } catch (err) {
        if (__DEV__) console.warn('[RecurringExecution] Error general:', err);
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
