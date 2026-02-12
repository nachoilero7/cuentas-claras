import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useUnreadCount } from '@/src/features/budget/hooks';
import type { UserRole } from '@/src/core/types/database';

// ── Tipos para los iconos de tabs ───────────────────────────────────────────

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: TabIconName;
  iconFocused: TabIconName;
  adminOnly?: boolean;
  /** Roles que pueden ver este tab (si no se define, visible para todos) */
  requiredRoles?: UserRole[];
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
    name: 'members',
    title: 'Miembros',
    icon: 'account-group-outline',
    iconFocused: 'account-group',
    requiredRoles: ['admin', 'manager'],
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
  const { data: unreadCount } = useUnreadCount();
  const isAdmin = profile?.role === 'admin';
  const userRole = profile?.role;

  // Determinar si un tab debe estar visible segun el rol del usuario
  const isTabVisible = (tab: TabConfig): boolean => {
    if (tab.requiredRoles && userRole) {
      return tab.requiredRoles.includes(userRole);
    }
    if (tab.adminOnly) {
      return isAdmin;
    }
    return true;
  };

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
            // Badge de notificaciones no leidas en el tab de Ajustes
            ...(tab.name === 'settings' && unreadCount && unreadCount > 0
              ? { tabBarBadge: unreadCount > 99 ? '99+' : unreadCount }
              : {}),
            // Ocultar tabs segun el rol del usuario
            href: isTabVisible(tab) ? undefined : null,
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
