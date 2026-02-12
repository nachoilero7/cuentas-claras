import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook que funciona como useState pero persiste el valor en AsyncStorage.
 * Restaura el valor guardado al montar el componente.
 *
 * @param key - Clave unica para AsyncStorage
 * @param defaultValue - Valor por defecto si no hay nada guardado
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInternal] = useState<T>(defaultValue);
  const [isRestored, setIsRestored] = useState(false);

  // Restaurar al montar
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (stored !== null) {
          try {
            setStateInternal(JSON.parse(stored) as T);
          } catch {
            // Si no se puede parsear, usar el default
          }
        }
      })
      .finally(() => setIsRestored(true));
  }, [key]);

  // Setter que tambien persiste
  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const newValue = typeof value === 'function'
          ? (value as (prev: T) => T)(prev)
          : value;
        AsyncStorage.setItem(key, JSON.stringify(newValue));
        return newValue;
      });
    },
    [key],
  );

  // Retornar el default hasta que se restaure, para evitar flash
  return [isRestored ? state : defaultValue, setState];
}
