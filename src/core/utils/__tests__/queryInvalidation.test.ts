import { QueryClient } from '@tanstack/react-query';
import {
  invalidateFinancialData,
  invalidateTableQueries,
  TABLE_QUERY_KEY_MAP,
} from '../queryInvalidation';

describe('queryInvalidation utils', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    jest.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('invalidateFinancialData', () => {
    it('invalida las 5 query keys financieras', () => {
      invalidateFinancialData(queryClient);

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['report-summary'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['category-report'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budget-status'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    });
  });

  describe('TABLE_QUERY_KEY_MAP', () => {
    it('mapea transactions a 5 query keys', () => {
      expect(TABLE_QUERY_KEY_MAP.transactions).toEqual([
        ['transactions'], ['dashboard'], ['report-summary'],
        ['category-report'], ['budget-status'],
      ]);
    });

    it('mapea categories a 1 query key', () => {
      expect(TABLE_QUERY_KEY_MAP.categories).toEqual([['categories']]);
    });

    it('mapea seasons correctamente', () => {
      expect(TABLE_QUERY_KEY_MAP.seasons).toEqual([['seasons'], ['current-season']]);
    });

    it('mapea profiles correctamente', () => {
      expect(TABLE_QUERY_KEY_MAP.profiles).toEqual([['users'], ['profile']]);
    });

    it('mapea user_category_permissions correctamente', () => {
      expect(TABLE_QUERY_KEY_MAP.user_category_permissions).toEqual([['permissions'], ['users']]);
    });

    it('tiene entradas para todas las tablas principales', () => {
      const tables = Object.keys(TABLE_QUERY_KEY_MAP);
      expect(tables).toContain('transactions');
      expect(tables).toContain('categories');
      expect(tables).toContain('seasons');
      expect(tables).toContain('profiles');
      expect(tables).toContain('approval_requests');
      expect(tables).toContain('recurring_transactions');
      expect(tables).toContain('budget_alerts');
      expect(tables).toContain('notifications');
      expect(tables).toContain('user_category_permissions');
    });
  });

  describe('invalidateTableQueries', () => {
    it('invalida todas las queries para una tabla conocida', () => {
      invalidateTableQueries('transactions', queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    });

    it('no hace nada para una tabla desconocida', () => {
      invalidateTableQueries('tabla_inexistente', queryClient);
      expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it('invalida queries de categories', () => {
      invalidateTableQueries('categories', queryClient);
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['categories'] });
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    });
  });
});
