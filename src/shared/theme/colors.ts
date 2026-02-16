/**
 * Paleta de colores para Cuentas Claras
 *
 * Identidad rojinegra de Club Independiente.
 * Rojo vibrante como primario, negro/grafito como secundario.
 */

// ── Paleta primaria: rojo Independiente ─────────────────────────────────────
export const primary = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#C41E3A',
  600: '#b91c35',
  700: '#9f1a2f',
  800: '#7f1528',
  900: '#5c0f1d',
  accent: '#e11d48',
} as const;

// ── Paleta secundaria: negro/grafito ────────────────────────────────────────
export const secondary = {
  50: '#f5f5f5',
  100: '#e5e5e5',
  200: '#d4d4d4',
  300: '#a3a3a3',
  400: '#737373',
  500: '#1a1a1a',
  600: '#141414',
  700: '#0f0f0f',
  800: '#0a0a0a',
  900: '#050505',
} as const;

// ── Grises neutros ──────────────────────────────────────────────────────────
export const neutral = {
  0: '#ffffff',
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
} as const;

// ── Colores semanticos ─────────────────────────────────────────────────────
export const semantic = {
  success: {
    light: '#22c55e',
    main: '#16a34a',
    dark: '#15803d',
    surface: '#f0fdf4',
    onSurface: '#14532d',
  },
  warning: {
    light: '#fbbf24',
    main: '#f59e0b',
    dark: '#d97706',
    surface: '#fffbeb',
    onSurface: '#78350f',
  },
  error: {
    light: '#f87171',
    main: '#ef4444',
    dark: '#dc2626',
    surface: '#fef2f2',
    onSurface: '#7f1d1d',
  },
  info: {
    light: '#60a5fa',
    main: '#3b82f6',
    dark: '#2563eb',
    surface: '#eff6ff',
    onSurface: '#1e3a5f',
  },
} as const;

// ── Esquema de colores claro ────────────────────────────────────────────────
export const lightColorScheme = {
  // Superficies
  background: '#faf8f8',
  surface: '#ffffff',
  surfaceVariant: '#f5f0f0',
  surfaceDisabled: '#e5e5e5',

  // Primarios (rojo Independiente)
  primary: primary[500],
  primaryContainer: '#fef2f2',
  onPrimary: '#ffffff',
  onPrimaryContainer: primary[700],

  // Secundarios (negro/grafito)
  secondary: secondary[500],
  secondaryContainer: '#f5f5f5',
  onSecondary: '#ffffff',
  onSecondaryContainer: secondary[800],

  // Acento
  accent: primary.accent,
  onAccent: '#ffffff',

  // Texto
  text: neutral[900],
  textSecondary: neutral[500],
  textTertiary: neutral[400],
  textDisabled: neutral[300],

  // Bordes
  outline: neutral[200],
  outlineVariant: neutral[100],

  // Semanticos
  success: semantic.success.main,
  successSurface: semantic.success.surface,
  warning: semantic.warning.main,
  warningSurface: semantic.warning.surface,
  error: semantic.error.main,
  errorSurface: semantic.error.surface,
  info: semantic.info.main,
  infoSurface: semantic.info.surface,

  // Financieros (especificos de la app)
  income: '#16a34a',
  expense: '#ef4444',
  transfer: '#3b82f6',
  balance: primary[500],

  // Elevacion / sombras
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Barra de estado
  statusBar: 'dark' as const,

  // Inversiones
  inverseSurface: neutral[800],
  inverseOnSurface: neutral[50],
  inversePrimary: primary[200],
} as const;

// ── Esquema de colores oscuro ───────────────────────────────────────────────
export const darkColorScheme = {
  // Superficies
  background: '#0d0d0d',
  surface: '#1a1a1a',
  surfaceVariant: '#252525',
  surfaceDisabled: '#2a2a2a',

  // Primarios (rojo Independiente – tonos claros para contraste en dark)
  primary: '#f87171',
  primaryContainer: '#3b1018',
  onPrimary: '#1a0508',
  onPrimaryContainer: '#fecaca',

  // Secundarios (grafito claro)
  secondary: '#d4d4d4',
  secondaryContainer: '#333333',
  onSecondary: '#0d0d0d',
  onSecondaryContainer: '#e5e5e5',

  // Acento
  accent: '#fb7185',
  onAccent: '#1a0508',

  // Texto
  text: '#e5e5e5',
  textSecondary: '#a3a3a3',
  textTertiary: '#737373',
  textDisabled: '#525252',

  // Bordes
  outline: '#333333',
  outlineVariant: '#252525',

  // Semanticos
  success: '#3fb950',
  successSurface: '#0d2818',
  warning: '#d29922',
  warningSurface: '#2d2000',
  error: '#f85149',
  errorSurface: '#300a0a',
  info: '#58a6ff',
  infoSurface: '#0d1a30',

  // Financieros (especificos de la app)
  income: '#3fb950',
  expense: '#f85149',
  transfer: '#58a6ff',
  balance: '#f87171',

  // Elevacion / sombras
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Barra de estado
  statusBar: 'light' as const,

  // Inversiones
  inverseSurface: neutral[100],
  inverseOnSurface: neutral[800],
  inversePrimary: primary[500],
} as const;

// ── Tipo del esquema de colores ─────────────────────────────────────────────
export interface ColorScheme {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceDisabled: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondary: string;
  onSecondaryContainer: string;
  accent: string;
  onAccent: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  outline: string;
  outlineVariant: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  error: string;
  errorSurface: string;
  info: string;
  infoSurface: string;
  income: string;
  expense: string;
  transfer: string;
  balance: string;
  shadow: string;
  overlay: string;
  statusBar: 'light' | 'dark';
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

/**
 * Obtiene el esquema de colores segun el modo (claro u oscuro).
 */
export function getColorScheme(isDark: boolean): ColorScheme {
  return isDark ? darkColorScheme : lightColorScheme;
}
