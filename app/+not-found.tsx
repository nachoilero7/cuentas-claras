import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Link, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing } from '@/src/shared/theme';

export default function NotFoundScreen() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'No encontrada' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={colors.textTertiary}
        />

        <Text
          variant="headlineSmall"
          style={[styles.title, { color: colors.text }]}
        >
          Pagina no encontrada
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.description, { color: colors.textSecondary }]}
        >
          La pagina que buscas no existe o fue movida.
        </Text>

        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Volver al inicio
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.smd,
  },
  title: {
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  description: {
    textAlign: 'center',
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  linkText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
