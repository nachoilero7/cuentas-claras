/**
 * Componente Screen - Envoltorio de pantalla para Cuentas Claras
 *
 * Proporciona SafeAreaView, scroll opcional, padding consistente,
 * y color de fondo del tema actual.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  ViewStyle,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

import { spacing } from '@/src/shared/theme/spacing';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface ScreenProps {
  /** Contenido de la pantalla */
  children: React.ReactNode;
  /** Habilitar scroll vertical */
  scroll?: boolean;
  /** Padding horizontal personalizado */
  padding?: number;
  /** Sin padding */
  noPadding?: boolean;
  /** Habilitar pull-to-refresh */
  refreshing?: boolean;
  /** Handler de pull-to-refresh */
  onRefresh?: () => void;
  /** Estilos adicionales del contenedor */
  style?: ViewStyle;
  /** Estilos del contenido (solo en modo scroll) */
  contentContainerStyle?: ViewStyle;
  /** Clases de NativeWind */
  className?: string;
  /** Configuracion de la barra de estado */
  statusBarStyle?: 'light-content' | 'dark-content';
  /** Color de fondo de la barra de estado (Android) */
  statusBarBackgroundColor?: string;
  /** Ocultar barra de estado */
  statusBarHidden?: boolean;
  /** Bordes de SafeArea a respetar */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** ID para pruebas */
  testID?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll = false,
  padding,
  noPadding = false,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  className,
  statusBarStyle,
  statusBarBackgroundColor,
  statusBarHidden = false,
  edges = ['top', 'bottom'],
  testID,
}: ScreenProps) {
  const theme = useTheme();

  const horizontalPadding = noPadding ? 0 : (padding ?? spacing.md);
  const backgroundColor = theme.colors.background;

  // Determinar estilo de status bar basado en el tema
  const resolvedStatusBarStyle =
    statusBarStyle ?? (theme.dark ? 'light-content' : 'dark-content');

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
  };

  const innerStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: horizontalPadding,
  };

  const scrollContentStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: horizontalPadding,
    paddingBottom: spacing.xl,
  };

  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[scrollContentStyle, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      testID={testID ? `${testID}-scroll` : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[innerStyle, style]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[containerStyle, scroll && style]}
      edges={edges}
      className={className}
      testID={testID}
    >
      <StatusBar
        barStyle={resolvedStatusBarStyle}
        backgroundColor={
          statusBarBackgroundColor ??
          (Platform.OS === 'android' ? backgroundColor : undefined)
        }
        hidden={statusBarHidden}
        translucent={Platform.OS === 'android'}
      />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});
