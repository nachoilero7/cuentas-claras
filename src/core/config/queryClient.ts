import { QueryClient, MutationCache } from '@tanstack/react-query';
import { showSnackbar } from '@/src/shared/lib/snackbar';

const FIVE_MINUTES = 1000 * 60 * 5;
const TEN_MINUTES = 1000 * 60 * 10;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES,
      gcTime: TEN_MINUTES,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Ocurrio un error inesperado.';
      showSnackbar(message, 'error');
    },
  }),
});
