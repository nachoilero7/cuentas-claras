import { Stack } from 'expo-router';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';

export default function RecurringLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Transacciones recurrentes' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Recurrente' }}
      />
    </Stack>
  );
}
