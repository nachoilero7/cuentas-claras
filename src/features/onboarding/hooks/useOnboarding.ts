import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../services/onboardingService';

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
