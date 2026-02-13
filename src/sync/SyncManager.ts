import NetInfo from '@react-native-community/netinfo';
import { QueryClient } from '@tanstack/react-query';
import { getOfflineQueue, dequeueMutation, incrementRetryCount } from './offlineQueue';
import { persistQueryCache } from './queryPersister';
import { createTransaction, updateTransaction, deleteTransaction } from '@/src/features/transactions/services/transactionService';
import { createCategory, updateCategory, deleteCategory } from '@/src/features/categories/services/categoryService';
import { createSeason, updateSeason, deleteSeason } from '@/src/features/seasons/services/seasonService';
import { approveRequest, rejectRequest } from '@/src/features/approvals/services/approvalService';
import { createRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction } from '@/src/features/recurring/services';
import { upsertBudgetAlert, deleteBudgetAlert } from '@/src/features/budget/services/budgetAlertService';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import type { OfflineMutation } from './offlineQueue';

const MAX_RETRIES = 3;

// ── Lock para evitar procesamiento concurrente de la cola ───────────────────
let isProcessing = false;

// ── Descripciones legibles para cada tipo de mutacion ────────────────────────

const MUTATION_DESCRIPTIONS: Record<OfflineMutation['type'], string> = {
  create_transaction: 'crear movimiento',
  update_transaction: 'actualizar movimiento',
  delete_transaction: 'eliminar movimiento',
  create_category: 'crear rubro',
  update_category: 'actualizar rubro',
  delete_category: 'eliminar rubro',
  create_season: 'crear temporada',
  update_season: 'actualizar temporada',
  delete_season: 'eliminar temporada',
  approve_request: 'aprobar solicitud',
  reject_request: 'rechazar solicitud',
  create_recurring: 'crear movimiento recurrente',
  update_recurring: 'actualizar movimiento recurrente',
  delete_recurring: 'eliminar movimiento recurrente',
  upsert_budget_alert: 'guardar alerta de presupuesto',
  delete_budget_alert: 'eliminar alerta de presupuesto',
};

// ── Mapeo de tipo de mutacion a query keys para invalidar ───────────────────

const MUTATION_QUERY_KEYS: Record<string, string[][]> = {
  create_transaction: [['transactions'], ['reports'], ['category-balances']],
  update_transaction: [['transactions'], ['reports'], ['category-balances']],
  delete_transaction: [['transactions'], ['reports'], ['category-balances']],
  create_category: [['categories']],
  update_category: [['categories'], ['category-balances']],
  delete_category: [['categories'], ['transactions'], ['dashboard']],
  create_season: [['seasons']],
  update_season: [['seasons']],
  delete_season: [['seasons']],
  approve_request: [['approvals'], ['transactions']],
  reject_request: [['approvals'], ['transactions']],
  create_recurring: [['recurring']],
  update_recurring: [['recurring']],
  delete_recurring: [['recurring']],
  upsert_budget_alert: [['budget-alerts']],
  delete_budget_alert: [['budget-alerts']],
};

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
      case 'delete_category': {
        const { error } = await deleteCategory(mutation.payload.id as string);
        return !error;
      }
      case 'create_season': {
        const { error } = await createSeason(mutation.payload as any);
        return !error;
      }
      case 'update_season': {
        const { id, ...updates } = mutation.payload as any;
        const { error } = await updateSeason(id, updates);
        return !error;
      }
      case 'delete_season': {
        const { error } = await deleteSeason(mutation.payload.id as string);
        return !error;
      }
      case 'approve_request': {
        const { id, comment } = mutation.payload as any;
        const { error } = await approveRequest(id, comment);
        return !error;
      }
      case 'reject_request': {
        const { id, comment } = mutation.payload as any;
        const { error } = await rejectRequest(id, comment);
        return !error;
      }
      case 'create_recurring': {
        const { error } = await createRecurringTransaction(mutation.payload as any);
        return !error;
      }
      case 'update_recurring': {
        const { id, ...updates } = mutation.payload as any;
        const { error } = await updateRecurringTransaction(id, updates);
        return !error;
      }
      case 'delete_recurring': {
        const { error } = await deleteRecurringTransaction(mutation.payload.id as string);
        return !error;
      }
      case 'upsert_budget_alert': {
        const { error } = await upsertBudgetAlert(mutation.payload as any);
        return !error;
      }
      case 'delete_budget_alert': {
        const { error } = await deleteBudgetAlert(mutation.payload.id as string);
        return !error;
      }
      default:
        if (__DEV__) console.warn(`[SyncManager] Tipo de mutacion desconocido: ${mutation.type}`);
        return false;
    }
  } catch (error) {
    if (__DEV__) console.error(`[SyncManager] Error procesando mutacion ${mutation.id}:`, error);
    return false;
  }
}

// ── Procesar toda la cola de mutaciones ──────────────────────────────────────

export async function processOfflineQueue(queryClient: QueryClient): Promise<{ processed: number; failed: number }> {
  // Evitar procesamiento concurrente (ej: NetInfo + trigger manual simultaneos)
  if (isProcessing) {
    if (__DEV__) console.log('[SyncManager] Cola ya en proceso, omitiendo');
    return { processed: 0, failed: 0 };
  }

  isProcessing = true;

  try {
    const queue = await getOfflineQueue();

    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    if (__DEV__) console.log(`[SyncManager] Procesando ${queue.length} mutaciones pendientes...`);

    let processed = 0;
    let failed = 0;
    const processedTypes = new Set<string>();

    for (const mutation of queue) {
      if (mutation.retryCount >= MAX_RETRIES) {
        if (__DEV__) console.warn(`[SyncManager] Mutacion ${mutation.id} excedio max reintentos, descartando`);
        await dequeueMutation(mutation.id);
        failed += 1;

        // Notificar al usuario que la mutacion se perdio
        const description = MUTATION_DESCRIPTIONS[mutation.type] ?? mutation.type;
        showSnackbar(
          `No se pudo sincronizar: ${description}. Los datos se perdieron.`,
          'error',
        );

        continue;
      }

      const success = await processMutation(mutation);

      if (success) {
        await dequeueMutation(mutation.id);
        processed += 1;
        processedTypes.add(mutation.type);
      } else {
        await incrementRetryCount(mutation.id);
        failed += 1;
      }
    }

    // Invalidar queries relevantes para refrescar datos despues de sincronizar
    if (processed > 0) {
      const keysToInvalidate = new Set<string>();
      for (const type of processedTypes) {
        const keys = MUTATION_QUERY_KEYS[type];
        if (keys) {
          for (const key of keys) {
            keysToInvalidate.add(JSON.stringify(key));
          }
        }
      }

      const invalidations = Array.from(keysToInvalidate).map((k) =>
        queryClient.invalidateQueries({ queryKey: JSON.parse(k) })
      );
      await Promise.all(invalidations);

      await persistQueryCache(queryClient);
      if (__DEV__) console.log(`[SyncManager] Sincronizacion completada: ${processed} exitosas, ${failed} fallidas`);
    }

    return { processed, failed };
  } finally {
    isProcessing = false;
  }
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
        if (__DEV__) console.error('[SyncManager] Error en sincronizacion automatica:', err);
      });
    }
  });

  return unsubscribe;
}
