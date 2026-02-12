import { Stack } from 'expo-router';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';

export default function CategoriesLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        animation: 'slide_from_right',
      }}
    />
  );
}
