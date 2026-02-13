import { supabase } from '@/src/core/config/supabase';

/**
 * Marca al usuario actual como que completo el onboarding.
 */
export async function completeOnboarding() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ has_completed_onboarding: true })
    .eq('id', user.id)
    .select()
    .single();

  return { data, error };
}
