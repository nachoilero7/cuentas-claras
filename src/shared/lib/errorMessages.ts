/**
 * Utilidad para traducir errores de Supabase a mensajes amigables en español
 */

const SUPABASE_ERROR_MAP: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Credenciales incorrectas. Verifica tu email y contraseña.',
  'Email not confirmed': 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada.',
  'User already registered': 'Ya existe una cuenta con este email.',
  'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos antes de reintentar.',
  // RLS / permission errors
  'new row violates row-level security policy': 'No tienes permisos para realizar esta accion.',
  'row-level security policy': 'No tienes permisos para acceder a este recurso.',
  // Network
  'Failed to fetch': 'Error de conexion. Verifica tu conexion a internet.',
  'Network request failed': 'Error de conexion. Verifica tu conexion a internet.',
  // Storage
  'The resource already exists': 'El archivo ya existe.',
  'Bucket not found': 'Error interno de almacenamiento.',
  // DB
  'duplicate key value violates unique constraint': 'Ya existe un registro con estos datos.',
  'violates foreign key constraint': 'No se puede eliminar porque hay datos relacionados.',
  'violates check constraint': 'Los datos ingresados no son validos.',
};

/** Default fallback message */
const DEFAULT_ERROR = 'Ocurrio un error inesperado. Intenta de nuevo.';

/**
 * Translate a Supabase/API error into a user-friendly Spanish message.
 * Falls back to the original message if no match found.
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) return DEFAULT_ERROR;

  const message = error instanceof Error ? error.message : String(error);

  // Check for exact match first
  if (SUPABASE_ERROR_MAP[message]) {
    return SUPABASE_ERROR_MAP[message];
  }

  // Check for partial match (error message contains known pattern)
  for (const [pattern, friendlyMsg] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMsg;
    }
  }

  // If the message is already in Spanish or user-friendly, return as-is
  if (/^[A-ZÁÉÍÓÚÑ]/.test(message) && message.length < 200) {
    return message;
  }

  return DEFAULT_ERROR;
}
