import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';

// ── Tipos para los iconos de tabs ───────────────────────────────────────────

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconFocused: TabIconName;
  adminOnly?: boolean;
}

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Inicio',
    icon: 'home-outline',
    iconFocused: 'home',
  },
  {
    name: 'transactions',
    title: 'Movimientos',
    icon: 'swap-horizontal',
    iconFocused: 'swap-horizontal-bold',
  },
  {
    name: 'categories',
    title: 'Rubros',
    icon: 'tag-outline',
    iconFocused: 'tag',
    adminOnly: true,
  },
  {
    name: 'reports',
    title: 'Reportes',
    icon: 'chart-bar',
    iconFocused: 'chart-bar',
    adminOnly: true,
  },
  {
    name: 'settings',
    title: 'Ajustes',
    icon: 'cog-outline',
    iconFocused: 'cog',
  },
];

// ── Componente ──────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  // Mostrar un indicador de carga mientras se verifica la sesion
  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Si no esta autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <MaterialCommunityIcons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
            // Ocultar tabs de admin para usuarios no-admin
            href: tab.adminOnly && !isAdmin ? null : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
