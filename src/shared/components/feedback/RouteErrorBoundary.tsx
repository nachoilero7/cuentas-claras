import { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

import { Button } from '../ui/Button';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing } from '@/src/shared/theme';

interface RouteErrorBoundaryProps {
  error: Error;
  retry: () => void;
}

/**
 * Error boundary para rutas individuales (Expo Router).
 * Se exporta como `ErrorBoundary` desde cada archivo de pantalla.
 */
export function ErrorBoundary({ error, retry }: RouteErrorBoundaryProps) {
  const { colors } = useAppTheme();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <MaterialCommunityIcons
          name="alert-decagram-outline"
          size={64}
          color={colors.error}
        />

        <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>
          Algo salio mal
        </Text>

        <Text variant="bodyMedium" style={[styles.description, { color: colors.textSecondary }]}>
          Ocurrio un error en esta seccion. Las demas secciones siguen funcionando.
        </Text>

        {error.message && (
          <View style={[styles.errorBox, { backgroundColor: colors.errorSurface, borderColor: colors.error + '40' }]}>
            <Text variant="labelSmall" style={{ color: colors.error, fontWeight: '600', marginBottom: spacing.xxs }}>
              Detalle del error
            </Text>
            <Text variant="bodySmall" style={{ color: colors.error }} numberOfLines={3}>
              {error.message}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button variant="primary" size="lg" fullWidth onPress={retry} icon="refresh">
            Reintentar
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    borderRadius: 12,
    padding: spacing.md,
    width: '100%',
    borderWidth: 1,
  },
  actions: {
    width: '100%',
    marginTop: spacing.md,
  },
});
