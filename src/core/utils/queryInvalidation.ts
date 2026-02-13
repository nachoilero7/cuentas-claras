import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalida todas las queries que dependen de datos financieros.
 * Usar despues de crear/actualizar/eliminar transacciones, aprobar/rechazar,
 * ejecutar recurrentes, o cualquier mutacion que afecte montos.
 */
export function invalidateFinancialData(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['report-summary'] });
  queryClient.invalidateQueries({ queryKey: ['category-report'] });
  queryClient.invalidateQueries({ queryKey: ['budget-status'] });
}

// ─── Mapeo tabla → query keys para invalidacion via Realtime ─────────────────

export const TABLE_QUERY_KEY_MAP: Record<string, string[][]> = {
  transactions: [
    ['transactions'], ['dashboard'], ['report-summary'],
    ['category-report'], ['budget-status'],
  ],
  categories: [['categories']],
  seasons: [['seasons'], ['current-season']],
  profiles: [['users'], ['profile']],
  approval_requests: [['approvals'], ['pending-approvals']],
  recurring_transactions: [['recurring']],
  budget_alerts: [['budget-alerts']],
  notifications: [['notifications']],
  user_category_permissions: [['permissions'], ['users']],
};

/**
 * Invalida todas las query keys asociadas a una tabla de Supabase.
 * Usado por RealtimeProvider cuando llega un evento postgres_changes.
 */
export function invalidateTableQueries(
  tableName: string,
  queryClient: QueryClient,
) {
  const queryKeys = TABLE_QUERY_KEY_MAP[tableName];
  if (!queryKeys) return;

  for (const key of queryKeys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
