import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

const CACHE_KEY = 'cuentas-claras-query-cache';

// ── Persistir cache de TanStack Query ────────────────────────────────────────

export async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializable = cache
      .filter((query) => query.state.status === 'success' && query.state.data !== undefined)
      .map((query) => ({
        queryKey: query.queryKey,
        data: query.state.data,
        dataUpdatedAt: query.state.dataUpdatedAt,
      }));
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serializable));
  } catch (error) {
    if (__DEV__) console.warn('[Sync] Error al persistir cache:', error);
  }
}

// ── Restaurar cache de TanStack Query ────────────────────────────────────────

export async function restoreQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw) as Array<{
      queryKey: unknown[];
      data: unknown;
      dataUpdatedAt: number;
    }>;

    for (const entry of entries) {
      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }

    if (__DEV__) console.log(`[Sync] Cache restaurado: ${entries.length} queries`);
  } catch (error) {
    if (__DEV__) console.warn('[Sync] Error al restaurar cache:', error);
  }
}

// ── Limpiar cache persistido ─────────────────────────────────────────────────

export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[Sync] Error al limpiar cache:', error);
  }
}
