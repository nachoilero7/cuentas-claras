import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../services/onboardingService';
import type { Profile } from '@/src/core/types/database';

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOnboarding,
    // Se actualiza el cache sincrónicamente para evitar un race entre el
    // router.replace('/(tabs)') y el refetch de useProfile que haría
    // aparecer el onboarding de nuevo.
    onSuccess: () => {
      queryClient.setQueriesData<Profile | null>(
        { queryKey: ['profile'] },
        (prev) => (prev ? { ...prev, has_completed_onboarding: true } : prev),
      );
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
