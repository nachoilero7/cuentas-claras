import { format, formatDistanceToNow, isYesterday, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Convierte un valor a un objeto Date.
 * Acepta Date, string ISO, o timestamp numerico.
 */
function toDate(date: Date | string | number): Date {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string') {
    return parseISO(date);
  }
  return new Date(date);
}

/**
 * Formatea una fecha en formato DD/MM/YYYY.
 *
 * @example
 * formatDate('2025-03-15') // "15/03/2025"
 * formatDate(new Date())   // "11/02/2026"
 */
export function formatDate(date: Date | string | number): string {
  return format(toDate(date), 'dd/MM/yyyy', { locale: es });
}

/**
 * Formatea una fecha y hora en formato DD/MM/YYYY HH:mm.
 *
 * @example
 * formatDateTime('2025-03-15T14:30:00') // "15/03/2025 14:30"
 */
export function formatDateTime(date: Date | string | number): string {
  return format(toDate(date), 'dd/MM/yyyy HH:mm', { locale: es });
}

/**
 * Formatea una fecha de forma relativa en espanol.
 *
 * Ejemplos:
 *   - Hace menos de 1 minuto: "hace menos de un minuto"
 *   - Hace 2 horas: "hace aproximadamente 2 horas"
 *   - Ayer: "ayer"
 *   - Hoy: "hoy"
 *   - Mas de 2 dias: "hace 3 dias", "hace 2 semanas", etc.
 *
 * @param date  Fecha a formatear
 * @returns  Texto relativo en espanol
 */
export function formatRelative(date: Date | string | number): string {
  const d = toDate(date);

  if (isToday(d)) {
    return 'hoy';
  }

  if (isYesterday(d)) {
    return 'ayer';
  }

  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: es,
  });
}
