/**
 * Componente Card personalizado para Cuentas Claras
 *
 * Envuelve el Card de React Native Paper con variantes predefinidas
 * y opciones de padding consistentes.
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import { borderRadius, spacing } from '@/src/shared/theme/spacing';

// ── Tipos ───────────────────────────────────────────────────────────────────
export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Contenido de la tarjeta */
  children: React.ReactNode;
  /** Variante visual */
  variant?: CardVariant;
  /** Padding interno */
  padding?: CardPadding;
  /** Handler al presionar la tarjeta */
  onPress?: () => void;
  /** Desactivar la interaccion */
  disabled?: boolean;
  /** Estilos adicionales del contenedor */
  style?: ViewStyle;
  /** Clases de NativeWind */
  className?: string;
  /** ID para pruebas */
  testID?: string;
}

// ── Mapeos ──────────────────────────────────────────────────────────────────
function getPaperMode(variant: CardVariant): 'elevated' | 'outlined' | 'contained' {
  switch (variant) {
    case 'elevated':
      return 'elevated';
    case 'outlined':
      return 'outlined';
    case 'filled':
      return 'contained';
  }
}

function getPaddingValue(padding: CardPadding): number {
  switch (padding) {
    case 'none':
      return 0;
    case 'sm':
      return spacing.sm;
    case 'md':
      return spacing.md;
    case 'lg':
      return spacing.lg;
  }
}

function getCardStyle(variant: CardVariant, theme: MD3Theme): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: theme.colors.surface,
        elevation: 2,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      };
    case 'outlined':
      return {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.outlineVariant,
        borderWidth: 1,
        elevation: 0,
      };
    case 'filled':
      return {
        backgroundColor: theme.colors.surfaceVariant,
        elevation: 0,
      };
  }
}

// ── Componente ──────────────────────────────────────────────────────────────
export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  onPress,
  disabled = false,
  style,
  className,
  testID,
}: CardProps) {
  const theme = useTheme();
  const mode = getPaperMode(variant);
  const cardStyle = getCardStyle(variant, theme);
  const paddingValue = getPaddingValue(padding);

  const content = (
    <PaperCard.Content style={{ padding: paddingValue }}>
      {children}
    </PaperCard.Content>
  );

  return (
    <PaperCard
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.card,
        cardStyle,
        style,
      ]}
      testID={testID}
      className={className}
    >
      {content}
    </PaperCard>
  );
}

// ── Sub-componentes para composicion ────────────────────────────────────────

export interface CardHeaderProps {
  /** Titulo de la tarjeta */
  title: string;
  /** Subtitulo opcional */
  subtitle?: string;
  /** Componente a la izquierda (icono, avatar) */
  left?: (props: { size: number }) => React.ReactNode;
  /** Componente a la derecha (boton, icono) */
  right?: (props: { size: number }) => React.ReactNode;
  /** Estilos adicionales */
  style?: ViewStyle;
}

export function CardHeader({ title, subtitle, left, right, style }: CardHeaderProps) {
  return (
    <PaperCard.Title
      title={title}
      subtitle={subtitle}
      left={left}
      right={right}
      style={style}
    />
  );
}

export interface CardActionsProps {
  /** Contenido de las acciones (botones) */
  children: React.ReactNode;
  /** Estilos adicionales */
  style?: ViewStyle;
}

export function CardActions({ children, style }: CardActionsProps) {
  return <PaperCard.Actions style={style}>{children}</PaperCard.Actions>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});
