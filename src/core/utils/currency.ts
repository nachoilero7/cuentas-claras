import type { CurrencyCode } from '@/src/core/types/database';
import { CURRENCY_SYMBOLS } from '@/src/core/config/constants';

/**
 * Formatea un monto numerico como moneda en formato argentino.
 *
 * Ejemplos:
 *   formatCurrency(1234.5, 'ARS')  => "$ 1.234,50"
 *   formatCurrency(1234.5, 'USD')  => "US$ 1.234,50"
 *   formatCurrency(-500, 'ARS')    => "-$ 500,00"
 *
 * @param amount  Monto numerico a formatear
 * @param currency  Codigo de moneda (ARS | USD)
 * @returns Cadena formateada con simbolo de moneda
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'ARS'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);

  // Separar parte entera y decimal
  const fixed = absoluteAmount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  // Agregar puntos como separador de miles
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Formato argentino: punto para miles, coma para decimales
  const formatted = `${symbol} ${formattedInteger},${decimalPart}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parsea un texto de entrada de usuario a un numero.
 * Acepta formatos comunes:
 *   "1.234,56" => 1234.56  (formato argentino)
 *   "1234.56"  => 1234.56  (formato internacional)
 *   "1234,56"  => 1234.56  (coma como decimal)
 *   "1234"     => 1234
 *   "$1.234"   => 1234
 *
 * @param text  Texto ingresado por el usuario
 * @returns  Numero parseado, o NaN si el texto no es valido
 */
export function parseCurrencyInput(text: string): number {
  if (!text || typeof text !== 'string') {
    return NaN;
  }

  // Remover simbolos de moneda, espacios y caracteres no numericos (excepto puntos, comas, signo negativo)
  let cleaned = text.replace(/[^0-9.,-]/g, '').trim();

  if (cleaned === '' || cleaned === '-') {
    return NaN;
  }

  // Detectar formato argentino: "1.234,56" (punto como miles, coma como decimal)
  // Si hay coma Y puntos antes de la coma, es formato argentino
  const commaIndex = cleaned.lastIndexOf(',');
  const dotIndex = cleaned.lastIndexOf('.');

  if (commaIndex > -1 && dotIndex > -1) {
    if (dotIndex < commaIndex) {
      // Formato argentino: "1.234,56" -> remover puntos, cambiar coma por punto
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato "1,234.56" -> remover comas
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (commaIndex > -1) {
    // Solo coma presente: "1234,56" -> reemplazar coma por punto
    // Verificar que lo que viene despues de la coma sean 1 o 2 digitos (es decimal)
    const afterComma = cleaned.substring(commaIndex + 1);
    if (afterComma.length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Es separador de miles: "1,234" -> remover coma
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return isFinite(parsed) ? parsed : NaN;
}
