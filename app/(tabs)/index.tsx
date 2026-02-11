import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing } from '@/src/shared/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();

  // Extraer nombre del usuario de los metadatos o del email
  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Usuario';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons
          name="hand-wave"
          size={40}
          color={colors.primary}
          style={styles.icon}
        />
        <Text
          variant="headlineSmall"
          style={[styles.greeting, { color: colors.text }]}
        >
          Hola, {displayName}!
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.welcomeText, { color: colors.textSecondary }]}
        >
          Bienvenido a Cuentas Claras
        </Text>
      </View>

      <View style={[styles.placeholder, { backgroundColor: colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name="view-dashboard-outline"
          size={48}
          color={colors.textTertiary}
        />
        <Text
          variant="bodyLarge"
          style={[styles.placeholderText, { color: colors.textSecondary }]}
        >
          Dashboard en desarrollo
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: colors.textTertiary, textAlign: 'center' }}
        >
          Aqui veras un resumen de tus finanzas, saldos y movimientos recientes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  greeting: {
    fontWeight: '700',
  },
  welcomeText: {
    marginTop: spacing.xs,
  },
  placeholder: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontWeight: '600',
  },
});
