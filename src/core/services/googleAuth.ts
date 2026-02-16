import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/src/core/config/supabase';

// Necesario para cerrar el browser automaticamente al volver
WebBrowser.maybeCompleteAuthSession();

// ─── Redirect URI para el flujo OAuth ──────────────────────────────────────

const redirectUri = makeRedirectUri({
  scheme: 'cuentasclaras',
});

// ─── Iniciar sesion con Google via Supabase OAuth ──────────────────────────

export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    // 1. Obtener la URL de OAuth de Supabase
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // No abrir el browser automaticamente
      },
    });

    if (oauthError || !data?.url) {
      return {
        error: oauthError ?? new Error('No se pudo obtener la URL de autenticacion'),
      };
    }

    // 2. Abrir el browser para que el usuario se autentique con Google
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type !== 'success' || !result.url) {
      // El usuario cerro el browser o cancelo
      return { error: null };
    }

    // 3. Extraer tokens de la URL de redireccion
    // Supabase redirige con #access_token=...&refresh_token=...
    const url = new URL(result.url);

    // Los tokens pueden estar en el fragment (#) o en query params (?)
    const params = new URLSearchParams(
      url.hash ? url.hash.substring(1) : url.search.substring(1),
    );

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      // Puede ser un error de autenticacion
      const errorDescription = params.get('error_description');
      return {
        error: new Error(
          errorDescription ?? 'No se recibieron tokens de autenticacion',
        ),
      };
    }

    // 4. Establecer la sesion en Supabase con los tokens recibidos
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      return { error: sessionError };
    }

    return { error: null };
  } catch (error) {
    if (__DEV__) console.error('[GoogleAuth] Error inesperado:', error);
    return {
      error: error instanceof Error ? error : new Error('Error inesperado al iniciar sesion con Google'),
    };
  }
}

// ─── Obtener el redirect URI (util para configuracion) ─────────────────────

export function getRedirectUri(): string {
  return redirectUri;
}
