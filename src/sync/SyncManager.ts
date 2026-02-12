import NetInfo from '@react-native-community/netinfo';
import { QueryClient } from '@tanstack/react-query';
import { getOfflineQueue, dequeueMutation, incrementRetryCount } from './offlineQueue';
import { persistQueryCache } from './queryPersister';
import { createTransaction, updateTransaction, deleteTransaction } from '@/src/features/transactions/services/transactionService';
import { createCategory, updateCategory } from '@/src/features/categories/services/categoryService';
import type { OfflineMutation } from './offlineQueue';

const MAX_RETRIES = 3;

// ── Procesar una mutacion individual ─────────────────────────────────────────

async function processMutation(mutation: OfflineMutation): Promise<boolean> {
  try {
    switch (mutation.type) {
      case 'create_transaction': {
        const { error } = await createTransaction(mutation.payload as any);
        return !error;
      }
      case 'update_transaction': {
        const { id, ...updates } = mutation.payload as any;
        const { error } = await updateTransaction(id, updates);
        return !error;
      }
      case 'delete_transaction': {
        const { error } = await deleteTransaction(mutation.payload.id as string);
        return !error;
      }
      case 'create_category': {
        const { error } = await createCategory(mutation.payload as any);
        return !error;
      }
      case 'update_category': {
        const { id, ...updates } = mutation.payload as any;
        const { error } = await updateCategory(id, updates);
        return !error;
      }
      default:
        console.warn(`[SyncManager] Tipo de mutacion desconocido: ${mutation.type}`);
        return false;
    }
  } catch (error) {
    console.error(`[SyncManager] Error procesando mutacion ${mutation.id}:`, error);
    return false;
  }
}

// ── Procesar toda la cola de mutaciones ──────────────────────────────────────

export async function processOfflineQueue(queryClient: QueryClient): Promise<{ processed: number; failed: number }> {
  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    return { processed: 0, failed: 0 };
  }

  console.log(`[SyncManager] Procesando ${queue.length} mutaciones pendientes...`);

  let processed = 0;
  let failed = 0;

  for (const mutation of queue) {
    if (mutation.retryCount >= MAX_RETRIES) {
      console.warn(`[SyncManager] Mutacion ${mutation.id} excedio max reintentos, descartando`);
      await dequeueMutation(mutation.id);
      failed += 1;
      continue;
    }

    const success = await processMutation(mutation);

    if (success) {
      await dequeueMutation(mutation.id);
      processed += 1;
    } else {
      await incrementRetryCount(mutation.id);
      failed += 1;
    }
  }

  // Invalidar queries para refrescar datos despues de sincronizar
  if (processed > 0) {
    await queryClient.invalidateQueries();
    await persistQueryCache(queryClient);
    console.log(`[SyncManager] Sincronizacion completada: ${processed} exitosas, ${failed} fallidas`);
  }

  return { processed, failed };
}

// ── Iniciar el listener de reconexion ────────────────────────────────────────

export function startSyncListener(queryClient: QueryClient): () => void {
  let wasDisconnected = false;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable;

    if (!isOnline) {
      wasDisconnected = true;
      return;
    }

    // Si recuperamos conexion despues de estar offline, procesar cola
    if (wasDisconnected && isOnline) {
      wasDisconnected = false;
      processOfflineQueue(queryClient).catch((err) => {
        console.error('[SyncManager] Error en sincronizacion automatica:', err);
      });
    }
  });

  return unsubscribe;
}
