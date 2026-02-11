import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  /** Indica si el dispositivo esta conectado a una red (wifi, celular, etc.) */
  isConnected: boolean | null;
  /** Indica si la red tiene acceso efectivo a internet */
  isInternetReachable: boolean | null;
}

/**
 * Hook que monitorea el estado de conectividad de red en tiempo real.
 *
 * @example
 * ```tsx
 * const { isConnected, isInternetReachable } = useNetworkStatus();
 *
 * if (!isConnected) {
 *   return <Text>Sin conexion a internet</Text>;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
