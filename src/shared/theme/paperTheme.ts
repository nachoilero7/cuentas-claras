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
    tertiaryContainer: '#f3e8ff',
    onTertiaryContainer: '#3b0764',
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
      level1: '#f5f7fc',
      level2: '#f0f2f9',
      level3: '#ebeef6',
      level4: '#e8ebf4',
      level5: '#e5e8f2',
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
    tertiaryContainer: '#2e1065',
    onTertiaryContainer: '#e9d5ff',
    error: darkColorScheme.error,
    onError: '#0d1117',
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
      level1: '#1a2030',
      level2: '#1e2538',
      level3: '#222a40',
      level4: '#252e44',
      level5: '#293248',
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
