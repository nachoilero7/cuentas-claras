import { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/src/core/hooks/useNetworkStatus';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing } from '@/src/shared/theme';

export function OfflineBanner() {
  const { colors } = useAppTheme();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = isConnected === false || isInternetReachable === false;
  const [slideAnim] = useState(() => new Animated.Value(isOffline ? 0 : -50));

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, slideAnim]);

  if (isConnected === null) return null; // Still loading

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.error, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={16}
          color="#ffffff"
        />
        <Text
          variant="labelSmall"
          style={styles.text}
        >
          Sin conexion - Modo offline
        </Text>
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
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
