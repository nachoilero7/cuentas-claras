/**
 * Sistema tipografico para Cuentas Claras
 *
 * Escala tipografica con tamanos, alturas de linea y pesos definidos.
 */

import { Platform, TextStyle } from 'react-native';

// ── Familias tipograficas ───────────────────────────────────────────────────
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

// ── Pesos tipograficos ─────────────────────────────────────────────────────
export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
};

// ── Escala tipografica ──────────────────────────────────────────────────────
export interface TypographyVariant {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
}

export const typography = {
  /** 11px - Notas al pie, etiquetas diminutas */
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: fontWeight.regular,
    letterSpacing: 0.4,
  } satisfies TypographyVariant,

  /** 12px - Etiquetas secundarias, badges */
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.medium,
    letterSpacing: 1.0,
  } satisfies TypographyVariant,

  /** 13px - Texto auxiliar, descripciones cortas */
  body2: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.regular,
    letterSpacing: 0.25,
  } satisfies TypographyVariant,

  /** 15px - Texto principal del cuerpo */
  body1: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeight.regular,
    letterSpacing: 0.15,
  } satisfies TypographyVariant,

  /** 16px - Subtitulos, elementos importantes */
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.15,
  } satisfies TypographyVariant,

  /** 18px - Subtitulos grandes */
  subtitle2: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.1,
  } satisfies TypographyVariant,

  /** 20px - Titulos de secciones */
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0,
  } satisfies TypographyVariant,

  /** 24px - Encabezados de pantalla */
  headline: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeight.bold,
    letterSpacing: 0,
  } satisfies TypographyVariant,

  /** 32px - Numeros destacados, saldos */
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  } satisfies TypographyVariant,

  /** 40px - Numeros grandes (dashboard) */
  displayLarge: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -1.0,
  } satisfies TypographyVariant,

  /** Numeros monoespacio para montos */
  amount: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  } satisfies TypographyVariant,
} as const;

export type TypographyKey = keyof typeof typography;
