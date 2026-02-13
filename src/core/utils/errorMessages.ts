/**
 * Sanitiza mensajes de error de Supabase para no exponer detalles internos
 * (nombres de tablas, columnas, policies RLS, etc.) al usuario.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Ocurrio un error inesperado.';

  const msg = error.message;

  if (msg.includes('row-level security') || msg.includes('RLS')) {
    return 'No tienes permiso para realizar esta accion.';
  }
  if (msg.includes('violates foreign key')) {
    return 'No se puede completar porque un registro relacionado no existe.';
  }
  if (msg.includes('duplicate key') || msg.includes('already exists')) {
    return 'Este registro ya existe.';
  }
  if (msg.includes('violates not-null')) {
    return 'Faltan datos obligatorios.';
  }
  if (msg.includes('JWT') || msg.includes('token')) {
    return 'Tu sesion expiro. Por favor, vuelve a iniciar sesion.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('Network')) {
    return 'Error de conexion. Verifica tu internet e intenta de nuevo.';
  }

  // Si no matchea patrones internos, retornar el mensaje original
  // (probablemente es un mensaje de validacion legible)
  return msg;
}
