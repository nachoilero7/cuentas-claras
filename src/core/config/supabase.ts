import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * Adaptador de almacenamiento seguro para Supabase Auth.
 * Usa expo-secure-store para guardar tokens de forma segura en el dispositivo.
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // SecureStore puede fallar en ciertos entornos (ej: web)
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silenciar errores en entornos no soportados
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silenciar errores en entornos no soportados
    }
  },
};

const supabaseUrl =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

// En produccion, la app DEBE tener las credenciales configuradas
if (!__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Credenciales de Supabase no configuradas. ' +
      'Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY antes de publicar.'
  );
}

// Placeholder solo para desarrollo sin .env (permite que metro bundle sin crashear)
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

const resolvedUrl = supabaseUrl || PLACEHOLDER_URL;
const resolvedKey = supabaseAnonKey || PLACEHOLDER_KEY;

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '[Cuentas Claras] Faltan las variables de entorno EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Crea un archivo .env basado en .env.example para conectar con Supabase.'
  );
}

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
