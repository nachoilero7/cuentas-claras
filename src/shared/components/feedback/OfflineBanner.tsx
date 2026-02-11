/**
 * Componente OfflineBanner - Indicador de conexion a internet
 *
 * Muestra un banner animado cuando el dispositivo esta sin conexion.
 * Utiliza el hook useNetworkStatus para detectar el estado de red.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/src/core/hooks/useNetworkStatus';
import { spacing } from '@/src/shared/theme/spacing';
import { typography, fontWeight } from '@/src/shared/theme/typography';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface OfflineBannerProps {
  /** ID para pruebas */
  testID?: string;
}

// ── Constantes ──────────────────────────────────────────────────────────────
const BANNER_HEIGHT = 44;
const ANIMATION_DURATION = 300;

// ── Componente ──────────────────────────────────────────────────────────────
export function OfflineBanner({ testID }: OfflineBannerProps) {
  const theme = useTheme();
  const { isConnected } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const isOffline = isConnected === false;

  useEffect(() => {
    if (isOffline) {
      setIsVisible(true);
      // Deslizar hacia abajo (mostrar)
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Deslizar hacia arriba (ocultar)
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -BANNER_HEIGHT,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Ocultar despues de que la animacion termine
        setIsVisible(false);
      });
    }
  }, [isOffline, slideAnim, opacityAnim]);

  // No renderizar nada si estamos conectados y la animacion termino
  if (!isVisible && !isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.error,
          paddingTop: Platform.OS === 'ios' ? insets.top : 0,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <Icon source="wifi-off" size={18} color="#ffffff" />
        <Text style={styles.text}>Sin conexion a internet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BANNER_HEIGHT,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  text: {
    color: '#ffffff',
    fontSize: typography.body2.fontSize,
    lineHeight: typography.body2.lineHeight,
    fontWeight: fontWeight.semibold,
  },
});
