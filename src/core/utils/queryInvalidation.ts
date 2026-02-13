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
