import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'cuentas-claras-offline-queue';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface OfflineMutation {
  id: string;
  type:
    | 'create_transaction' | 'update_transaction' | 'delete_transaction'
    | 'create_category' | 'update_category'
    | 'create_season' | 'update_season' | 'delete_season'
    | 'approve_request' | 'reject_request'
    | 'create_recurring' | 'update_recurring' | 'delete_recurring'
    | 'upsert_budget_alert' | 'delete_budget_alert';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

// ── Obtener la cola de mutaciones pendientes ─────────────────────────────────

export async function getOfflineQueue(): Promise<OfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    if (__DEV__) console.warn('[OfflineQueue] Error al leer cola:', error);
    return [];
  }
}

// ── Agregar una mutacion a la cola ───────────────────────────────────────────

export async function enqueueMutation(mutation: Omit<OfflineMutation, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
  const queue = await getOfflineQueue();
  const newMutation: OfflineMutation = {
    ...mutation,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(newMutation);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ── Remover una mutacion de la cola (despues de procesarla) ──────────────────

export async function dequeueMutation(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const updated = queue.filter((m) => m.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

// ── Incrementar contador de reintentos ───────────────────────────────────────

export async function incrementRetryCount(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const item = queue.find((m) => m.id === id);
  if (item) {
    item.retryCount += 1;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// ── Limpiar toda la cola ─────────────────────────────────────────────────────

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

// ── Obtener tamaño de la cola ────────────────────────────────────────────────

export async function getQueueSize(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}
