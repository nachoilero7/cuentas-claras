import { useInfiniteQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/transactionService';
import type { TransactionWithCategory, TransactionFilters } from '../services/transactionService';

const PAGE_SIZE = 30;

interface InfiniteTransactionsPage {
  data: TransactionWithCategory[];
  nextOffset: number | undefined;
}

/**
 * Hook para listar transacciones con paginacion infinita (scroll infinito).
 * Usa `useInfiniteQuery` de TanStack Query.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteTransactions(filters);
 * const allTransactions = data?.pages.flatMap(p => p.data) ?? [];
 * ```
 */
export function useInfiniteTransactions(filters?: Omit<TransactionFilters, 'limit' | 'offset'>) {
  return useInfiniteQuery<InfiniteTransactionsPage>({
    queryKey: ['transactions', 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error } = await getTransactions({
        ...filters,
        limit: PAGE_SIZE,
        offset,
      });
      if (error) throw error;

      return {
        data,
        nextOffset: data.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 1000 * 60, // 1 minuto
  });
}
