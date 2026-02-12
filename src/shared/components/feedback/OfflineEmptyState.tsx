import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useNetworkStatus } from '@/src/core/hooks/useNetworkStatus';
import { Button } from '../ui/Button';
import { spacing } from '@/src/shared/theme';

interface OfflineEmptyStateProps {
  /** True si hay datos cacheados para mostrar */
  hasData: boolean;
  /** True si la query esta cargando */
  isLoading: boolean;
  /** Callback para reintentar la carga */
  onRetry?: () => void;
  /** Componente children a mostrar si hay datos o esta online */
  children: React.ReactNode;
}

/**
 * Wrapper que muestra un estado offline cuando no hay conexion y no hay datos cacheados.
 * Si hay datos en cache, muestra los children normalmente (con un aviso sutil).
 */
export function OfflineEmptyState({
  hasData,
  isLoading,
  onRetry,
  children,
}: OfflineEmptyStateProps) {
  const { colors } = useAppTheme();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = isConnected === false || isInternetReachable === false;

  // Si no esta offline o tiene datos, mostrar children normalmente
  if (!isOffline || hasData || isLoading) {
    return <>{children}</>;
  }

  // Offline sin datos cacheados
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={48}
          color={colors.textTertiary}
        />
      </View>

      <Text variant="titleMedium" style={[styles.title, { color: colors.text }]}>
        Sin conexion
      </Text>

      <Text variant="bodyMedium" style={[styles.description, { color: colors.textSecondary }]}>
        No hay datos disponibles en modo offline.{'\n'}
        Conectate a internet para cargar la informacion.
      </Text>

      {onRetry && (
        <Button variant="primary" size="md" onPress={onRetry} icon="refresh">
          Reintentar
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
