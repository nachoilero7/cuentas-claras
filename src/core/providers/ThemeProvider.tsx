import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import {
  lightColorScheme,
  darkColorScheme,
  lightPaperTheme,
  darkPaperTheme,
  type ColorScheme,
} from '@/src/shared/theme';

// ── Tipos del contexto ──────────────────────────────────────────────────────

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorScheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColorScheme,
});

/**
 * Hook para acceder al esquema de colores y estado del tema actual.
 */
export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ── Temas de navegacion adaptados ───────────────────────────────────────────

const navLightTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: lightColorScheme.primary,
    background: lightColorScheme.background,
    card: lightColorScheme.surface,
    text: lightColorScheme.text,
    border: lightColorScheme.outline,
    notification: lightColorScheme.error,
  },
};

const navDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkColorScheme.primary,
    background: darkColorScheme.background,
    card: darkColorScheme.surface,
    text: darkColorScheme.text,
    border: darkColorScheme.outline,
    notification: darkColorScheme.error,
  },
};

// ── Provider ────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const appColors = isDark ? darkColorScheme : lightColorScheme;
  const paperTheme = isDark ? darkPaperTheme : lightPaperTheme;
  const navigationTheme = isDark ? navDarkTheme : navLightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, colors: appColors }),
    [isDark, appColors],
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>
        <NavigationThemeProvider value={navigationTheme}>
          {children}
        </NavigationThemeProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
