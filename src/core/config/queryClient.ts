import { QueryClient, MutationCache } from '@tanstack/react-query';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { sanitizeErrorMessage } from '@/src/core/utils/errorMessages';

const FIVE_MINUTES = 1000 * 60 * 5;
const TEN_MINUTES = 1000 * 60 * 10;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES,
      gcTime: TEN_MINUTES,
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      showSnackbar(sanitizeErrorMessage(error), 'error');
    },
  }),
});
