import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  colors: ColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'cuentas-claras-theme-mode';

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColorScheme,
  themeMode: 'system',
  setThemeMode: () => {},
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
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Restaurar preferencia guardada
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  // Guardar preferencia y actualizar estado
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  // Resolver si es dark basado en el modo elegido
  const isDark = themeMode === 'system'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const appColors = isDark ? darkColorScheme : lightColorScheme;
  const paperTheme = isDark ? darkPaperTheme : lightPaperTheme;
  const navigationTheme = isDark ? navDarkTheme : navLightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, colors: appColors, themeMode, setThemeMode }),
    [isDark, appColors, themeMode, setThemeMode],
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
