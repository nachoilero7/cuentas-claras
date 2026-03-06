/**
 * Componente Button personalizado para Cuentas Claras
 *
 * Envuelve el Button de React Native Paper con variantes y tamanos
 * predefinidos para mantener consistencia en toda la aplicacion.
 */

import React, { useCallback } from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import { borderRadius, componentHeight, spacing } from '@/src/shared/theme/spacing';
import { typography, fontWeight } from '@/src/shared/theme/typography';
import { hapticLight, hapticMedium } from '@/src/shared/lib/haptics';

// ── Tipos ───────────────────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Texto del boton */
  children: string;
  /** Variante visual del boton */
  variant?: ButtonVariant;
  /** Tamano del boton */
  size?: ButtonSize;
  /** Si el boton ocupa todo el ancho disponible */
  fullWidth?: boolean;
  /** Estado de carga - muestra un indicador de actividad */
  loading?: boolean;
  /** Desactivar el boton */
  disabled?: boolean;
  /** Icono a la izquierda del texto (nombre de MaterialCommunityIcons) */
  icon?: string;
  /** Funcion al presionar */
  onPress?: () => void;
  /** Estilos adicionales para el contenedor */
  style?: ViewStyle;
  /** Estilos adicionales para la etiqueta de texto */
  labelStyle?: TextStyle;
  /** ID para pruebas */
  testID?: string;
}

// ── Mapeos de variantes ─────────────────────────────────────────────────────
function getPaperMode(variant: ButtonVariant): 'contained' | 'outlined' | 'text' | 'elevated' {
  switch (variant) {
    case 'primary':
      return 'contained';
    case 'secondary':
      return 'elevated';
    case 'outline':
      return 'outlined';
    case 'ghost':
      return 'text';
  }
}

function getButtonColors(variant: ButtonVariant, theme: MD3Theme) {
  switch (variant) {
    case 'primary':
      return {
        buttonColor: theme.colors.primary,
        textColor: theme.colors.onPrimary,
      };
    case 'secondary':
      return {
        buttonColor: theme.colors.secondaryContainer,
        textColor: theme.colors.onSecondaryContainer,
      };
    case 'outline':
      return {
        buttonColor: 'transparent',
        textColor: theme.colors.primary,
      };
    case 'ghost':
      return {
        buttonColor: 'transparent',
        textColor: theme.colors.primary,
      };
  }
}

function getSizeStyles(size: ButtonSize): { container: ViewStyle; label: TextStyle } {
  switch (size) {
    case 'sm':
      return {
        container: {
          height: componentHeight.buttonSm,
          paddingHorizontal: spacing.sm,
          borderRadius: borderRadius.sm,
          gap: spacing.xs,
        },
        label: {
          fontSize: typography.body2.fontSize,
          lineHeight: typography.body2.lineHeight,
          marginVertical: 0,
          marginHorizontal: spacing.sm,
        },
      };
    case 'md':
      return {
        container: {
          height: componentHeight.buttonMd,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          gap: spacing.sm,
        },
        label: {
          fontSize: typography.body1.fontSize,
          lineHeight: typography.body1.lineHeight,
          marginVertical: 0,
          marginHorizontal: spacing.smd,
        },
      };
    case 'lg':
      return {
        container: {
          height: componentHeight.buttonLg,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
          gap: spacing.sm,
        },
        label: {
          fontSize: typography.subtitle.fontSize,
          lineHeight: typography.subtitle.lineHeight,
          marginVertical: 0,
          marginHorizontal: spacing.smd,
        },
      };
  }
}

// ── Componente ──────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  onPress,
  style,
  labelStyle,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const mode = getPaperMode(variant);
  const colors = getButtonColors(variant, theme);
  const sizeStyles = getSizeStyles(size);

  const handlePress = useCallback(() => {
    if (variant === 'primary') {
      hapticMedium();
    } else {
      hapticLight();
    }
    onPress?.();
  }, [variant, onPress]);

  return (
    <PaperButton
      mode={mode}
      onPress={onPress ? handlePress : undefined}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      buttonColor={colors.buttonColor}
      textColor={colors.textColor}
      contentStyle={[
        sizeStyles.container,
        fullWidth && styles.fullWidth,
      ]}
      labelStyle={[
        { fontWeight: fontWeight.semibold },
        sizeStyles.label,
        labelStyle,
      ]}
      style={[
        variant === 'outline' && {
          borderColor: theme.colors.outline,
          borderWidth: 1.5,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      testID={testID}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
});
