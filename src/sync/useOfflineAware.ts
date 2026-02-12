import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { enqueueMutation } from './offlineQueue';
import type { OfflineMutation } from './offlineQueue';

/**
 * Hook que chequea conectividad antes de una mutacion.
 * Si esta offline, encola la mutacion y avisa al usuario.
 * Si esta online, ejecuta la mutacion normalmente.
 */
export function useOfflineAware() {
  const isCheckingRef = useRef(false);

  const executeOrQueue = useCallback(
    async <T>(
      mutationType: OfflineMutation['type'],
      payload: Record<string, unknown>,
      onlineFn: () => Promise<T>,
    ): Promise<{ result: T | null; queued: boolean }> => {
      // Evitar checks simultaneos
      if (isCheckingRef.current) {
        return { result: await onlineFn(), queued: false };
      }

      isCheckingRef.current = true;
      try {
        const netState = await NetInfo.fetch();
        const isOnline = netState.isConnected && netState.isInternetReachable !== false;

        if (isOnline) {
          try {
            const result = await onlineFn();
            return { result, queued: false };
          } catch (error) {
            // Si falla por red durante la ejecucion, encolar
            const errorMsg = error instanceof Error ? error.message : '';
            const isNetworkError =
              errorMsg.includes('Network') ||
              errorMsg.includes('network') ||
              errorMsg.includes('fetch') ||
              errorMsg.includes('ECONNREFUSED');

            if (isNetworkError) {
              await enqueueMutation({ type: mutationType, payload });
              Alert.alert(
                'Guardado offline',
                'No hay conexion. El cambio se sincronizara automaticamente cuando vuelvas a conectarte.',
              );
              return { result: null, queued: true };
            }

            throw error;
          }
        }

        // Offline: encolar
        await enqueueMutation({ type: mutationType, payload });
        Alert.alert(
          'Guardado offline',
          'No hay conexion. El cambio se sincronizara automaticamente cuando vuelvas a conectarte.',
        );
        return { result: null, queued: true };
      } finally {
        isCheckingRef.current = false;
      }
    },
    [],
  );

  return { executeOrQueue };
}
