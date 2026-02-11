/**
 * Paleta de colores para Cuentas Claras
 *
 * Sistema de colores profesional para una aplicacion financiera.
 * Basado en tonos azul profundo con acentos en teal/esmeralda.
 */

// ── Paleta primaria: azul profundo ──────────────────────────────────────────
export const primary = {
  50: '#e8eaf6',
  100: '#c5cae9',
  200: '#9fa8da',
  300: '#7986cb',
  400: '#5c6bc0',
  500: '#0f3460',
  600: '#16213e',
  700: '#1a1a2e',
  800: '#131029',
  900: '#0d0a1f',
  accent: '#533483',
} as const;

// ── Paleta secundaria: teal/esmeralda ───────────────────────────────────────
export const secondary = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
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
  background: '#f8f9fc',
  surface: '#ffffff',
  surfaceVariant: '#f1f3f8',
  surfaceDisabled: '#e5e5e5',

  // Primarios
  primary: primary[500],
  primaryContainer: '#e8eaf6',
  onPrimary: '#ffffff',
  onPrimaryContainer: primary[700],

  // Secundarios
  secondary: secondary[500],
  secondaryContainer: '#d1fae5',
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
  background: '#0d1117',
  surface: '#161b22',
  surfaceVariant: '#1c2333',
  surfaceDisabled: '#2a2a2a',

  // Primarios
  primary: '#5c9aff',
  primaryContainer: '#1a3050',
  onPrimary: '#0d1117',
  onPrimaryContainer: '#b8d4ff',

  // Secundarios
  secondary: '#34d399',
  secondaryContainer: '#064e3b',
  onSecondary: '#0d1117',
  onSecondaryContainer: '#a7f3d0',

  // Acento
  accent: '#a78bfa',
  onAccent: '#0d1117',

  // Texto
  text: '#e6edf3',
  textSecondary: '#8b949e',
  textTertiary: '#6e7681',
  textDisabled: '#484f58',

  // Bordes
  outline: '#30363d',
  outlineVariant: '#21262d',

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
  balance: '#5c9aff',

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
