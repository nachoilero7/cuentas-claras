/**
 * Tema de React Native Paper (Material Design 3) para Cuentas Claras
 */

import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { lightColorScheme, darkColorScheme } from './colors';
import { borderRadius } from './spacing';

// ── Tema claro ──────────────────────────────────────────────────────────────
export const lightPaperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: borderRadius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColorScheme.primary,
    onPrimary: lightColorScheme.onPrimary,
    primaryContainer: lightColorScheme.primaryContainer,
    onPrimaryContainer: lightColorScheme.onPrimaryContainer,
    secondary: lightColorScheme.secondary,
    onSecondary: lightColorScheme.onSecondary,
    secondaryContainer: lightColorScheme.secondaryContainer,
    onSecondaryContainer: lightColorScheme.onSecondaryContainer,
    tertiary: lightColorScheme.accent,
    onTertiary: lightColorScheme.onAccent,
    tertiaryContainer: '#fef2f2',
    onTertiaryContainer: '#5c0f1d',
    error: lightColorScheme.error,
    onError: '#ffffff',
    errorContainer: lightColorScheme.errorSurface,
    onErrorContainer: '#7f1d1d',
    background: lightColorScheme.background,
    onBackground: lightColorScheme.text,
    surface: lightColorScheme.surface,
    onSurface: lightColorScheme.text,
    surfaceVariant: lightColorScheme.surfaceVariant,
    onSurfaceVariant: lightColorScheme.textSecondary,
    outline: lightColorScheme.outline,
    outlineVariant: lightColorScheme.outlineVariant,
    shadow: lightColorScheme.shadow,
    scrim: lightColorScheme.overlay,
    inverseSurface: lightColorScheme.inverseSurface,
    inverseOnSurface: lightColorScheme.inverseOnSurface,
    inversePrimary: lightColorScheme.inversePrimary,
    elevation: {
      level0: 'transparent',
      level1: '#faf5f5',
      level2: '#f7f0f0',
      level3: '#f5ecec',
      level4: '#f2e8e8',
      level5: '#f0e5e5',
    },
    surfaceDisabled: lightColorScheme.surfaceDisabled,
    onSurfaceDisabled: lightColorScheme.textDisabled,
    backdrop: lightColorScheme.overlay,
  },
};

// ── Tema oscuro ─────────────────────────────────────────────────────────────
export const darkPaperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: borderRadius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColorScheme.primary,
    onPrimary: darkColorScheme.onPrimary,
    primaryContainer: darkColorScheme.primaryContainer,
    onPrimaryContainer: darkColorScheme.onPrimaryContainer,
    secondary: darkColorScheme.secondary,
    onSecondary: darkColorScheme.onSecondary,
    secondaryContainer: darkColorScheme.secondaryContainer,
    onSecondaryContainer: darkColorScheme.onSecondaryContainer,
    tertiary: darkColorScheme.accent,
    onTertiary: darkColorScheme.onAccent,
    tertiaryContainer: '#3b1018',
    onTertiaryContainer: '#fecaca',
    error: darkColorScheme.error,
    onError: '#0d0d0d',
    errorContainer: darkColorScheme.errorSurface,
    onErrorContainer: '#fca5a5',
    background: darkColorScheme.background,
    onBackground: darkColorScheme.text,
    surface: darkColorScheme.surface,
    onSurface: darkColorScheme.text,
    surfaceVariant: darkColorScheme.surfaceVariant,
    onSurfaceVariant: darkColorScheme.textSecondary,
    outline: darkColorScheme.outline,
    outlineVariant: darkColorScheme.outlineVariant,
    shadow: darkColorScheme.shadow,
    scrim: darkColorScheme.overlay,
    inverseSurface: darkColorScheme.inverseSurface,
    inverseOnSurface: darkColorScheme.inverseOnSurface,
    inversePrimary: darkColorScheme.inversePrimary,
    elevation: {
      level0: 'transparent',
      level1: '#1e1a1a',
      level2: '#222020',
      level3: '#262424',
      level4: '#2a2828',
      level5: '#2e2c2c',
    },
    surfaceDisabled: darkColorScheme.surfaceDisabled,
    onSurfaceDisabled: darkColorScheme.textDisabled,
    backdrop: darkColorScheme.overlay,
  },
};

/**
 * Obtiene el tema de Paper segun el modo (claro u oscuro).
 */
export function getTheme(isDark: boolean): MD3Theme {
  return isDark ? darkPaperTheme : lightPaperTheme;
}

export type AppTheme = typeof lightPaperTheme;
