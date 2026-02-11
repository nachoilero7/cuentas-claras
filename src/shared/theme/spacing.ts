/**
 * Sistema de espaciado para Cuentas Claras
 *
 * Basado en una grilla de 4px para mantener consistencia visual.
 */

// ── Escala de espaciado ─────────────────────────────────────────────────────
export const spacing = {
  /** 2px - Espaciado minimo */
  xxs: 2,
  /** 4px - Extra pequeno */
  xs: 4,
  /** 8px - Pequeno */
  sm: 8,
  /** 12px - Pequeno-mediano */
  smd: 12,
  /** 16px - Mediano (base) */
  md: 16,
  /** 20px - Mediano-grande */
  mlg: 20,
  /** 24px - Grande */
  lg: 24,
  /** 32px - Extra grande */
  xl: 32,
  /** 40px - 2x Extra grande */
  '2xl': 40,
  /** 48px - 3x Extra grande */
  xxl: 48,
  /** 64px - Enorme */
  '3xl': 64,
  /** 80px - Maximo */
  '4xl': 80,
} as const;

// ── Radio de borde ──────────────────────────────────────────────────────────
export const borderRadius = {
  /** Sin radio */
  none: 0,
  /** 4px */
  xs: 4,
  /** 8px - Sutil */
  sm: 8,
  /** 12px - Medio */
  md: 12,
  /** 16px - Grande */
  lg: 16,
  /** 24px - Extra grande */
  xl: 24,
  /** 9999px - Circular / pill */
  full: 9999,
} as const;

// ── Tamanos de iconos ───────────────────────────────────────────────────────
export const iconSize = {
  /** 16px */
  xs: 16,
  /** 20px */
  sm: 20,
  /** 24px */
  md: 24,
  /** 28px */
  lg: 28,
  /** 32px */
  xl: 32,
  /** 48px */
  xxl: 48,
} as const;

// ── Alturas de componentes comunes ──────────────────────────────────────────
export const componentHeight = {
  /** 32px - Boton pequeno */
  buttonSm: 32,
  /** 44px - Boton mediano */
  buttonMd: 44,
  /** 52px - Boton grande */
  buttonLg: 52,
  /** 48px - Input de texto */
  input: 48,
  /** 56px - Barra de navegacion */
  navbar: 56,
  /** 64px - Header */
  header: 64,
  /** 80px - Tab bar */
  tabBar: 80,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type IconSize = typeof iconSize;
export type ComponentHeight = typeof componentHeight;
