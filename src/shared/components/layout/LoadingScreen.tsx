/**
 * Componente LoadingScreen - Pantalla de carga a pantalla completa
 *
 * Muestra un indicador de actividad centrado con un mensaje opcional.
 * Todos los textos estan en espanol.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { spacing } from '@/src/shared/theme/spacing';
import { typography } from '@/src/shared/theme/typography';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface LoadingScreenProps {
  /** Mensaje a mostrar debajo del indicador de carga */
  message?: string;
  /** Tamano del indicador de actividad */
  size?: 'small' | 'large';
  /** ID para pruebas */
  testID?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────
export function LoadingScreen({
  message = 'Cargando...',
  size = 'large',
  testID,
}: LoadingScreenProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
      testID={testID}
    >
      <ActivityIndicator
        animating
        size={size}
        color={theme.colors.primary}
        testID={testID ? `${testID}-indicator` : undefined}
      />
      {message ? (
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.onSurfaceVariant,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    fontSize: typography.body1.fontSize,
    lineHeight: typography.body1.lineHeight,
    textAlign: 'center',
  },
});
