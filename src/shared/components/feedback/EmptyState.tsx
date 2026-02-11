/**
 * Componente EmptyState - Estado vacio para listas y pantallas
 *
 * Muestra un icono, titulo, descripcion y una accion opcional
 * cuando no hay datos para mostrar.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';

import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme/spacing';
import { typography, fontWeight } from '@/src/shared/theme/typography';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface EmptyStateProps {
  /** Nombre del icono (MaterialCommunityIcons) */
  icon: string;
  /** Titulo principal */
  title: string;
  /** Descripcion secundaria */
  description?: string;
  /** Texto del boton de accion */
  actionLabel?: string;
  /** Handler del boton de accion */
  onAction?: () => void;
  /** Tamano del icono */
  iconSize?: number;
  /** Estilos adicionales del contenedor */
  style?: ViewStyle;
  /** Clases de NativeWind */
  className?: string;
  /** ID para pruebas */
  testID?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  iconSize = 64,
  style,
  className,
  testID,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, style]}
      className={className}
      testID={testID}
    >
      {/* Icono */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <Icon
          source={icon}
          size={iconSize}
          color={theme.colors.onSurfaceVariant}
        />
      </View>

      {/* Titulo */}
      <Text
        style={[
          styles.title,
          { color: theme.colors.onSurface },
        ]}
      >
        {title}
      </Text>

      {/* Descripcion */}
      {description ? (
        <Text
          style={[
            styles.description,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {description}
        </Text>
      ) : null}

      {/* Boton de accion */}
      {actionLabel && onAction ? (
        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            size="md"
            onPress={onAction}
            testID={testID ? `${testID}-action` : undefined}
          >
            {actionLabel}
          </Button>
        </View>
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
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body1.fontSize,
    lineHeight: typography.body1.lineHeight,
    fontWeight: fontWeight.regular,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  actionContainer: {
    marginTop: spacing.sm,
  },
});
