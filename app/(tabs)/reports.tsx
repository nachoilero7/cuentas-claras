import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing } from '@/src/shared/theme';

export default function ReportsScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.placeholder, { backgroundColor: colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name="chart-bar"
          size={48}
          color={colors.textTertiary}
        />
        <Text
          variant="bodyLarge"
          style={[styles.placeholderText, { color: colors.textSecondary }]}
        >
          Reportes en desarrollo
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: colors.textTertiary, textAlign: 'center' }}
        >
          Aqui podras generar reportes, graficos y exportar informacion financiera.
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
