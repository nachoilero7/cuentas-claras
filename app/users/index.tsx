import { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Share,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useAllUsers } from '@/src/features/users/hooks/useUsers';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { spacing } from '@/src/shared/theme';
import { USER_ROLE_LABELS } from '@/src/core/config/constants';
import type { Profile, UserRole } from '@/src/core/types/database';

// ── Colores de badge por rol ─────────────────────────────────────────────────

function getRoleBadgeColors(
  role: UserRole,
  colors: ReturnType<typeof useAppTheme>['colors'],
) {
  switch (role) {
    case 'admin':
      return { background: colors.error, text: colors.onPrimary };
    case 'manager':
      return { background: colors.primary, text: colors.onPrimary };
    case 'viewer':
      return { background: colors.surfaceVariant, text: colors.textSecondary };
    default:
      return { background: colors.surfaceVariant, text: colors.textSecondary };
  }
}

// ── Obtener iniciales del nombre ─────────────────────────────────────────────

function getInitials(fullName: string): string {
  if (!fullName) return '?';
  return fullName.charAt(0).toUpperCase();
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function UsersListScreen() {
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const { data: users, isLoading, isError, refetch, isRefetching } = useAllUsers();

  const [searchQuery, setSearchQuery] = useState('');

  const role = profile?.role ?? 'viewer';

  const handleInviteMember = useCallback(async () => {
    try {
      await Share.share({
        title: 'Unete a Cuentas Claras',
        message:
          '¡Te invito a unirte a Cuentas Claras, la app de finanzas de la sub-comision! ' +
          'Descarga la app y registrate para comenzar.',
      });
    } catch {
      // El usuario cancelo el share, no se requiere accion
    }
  }, []);

  // ── Filtrado de usuarios por busqueda ────────────────────────────────────

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Guard: solo admin puede acceder ──────────────────────────────────────

  if (role !== 'admin') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text
          variant="titleMedium"
          style={[styles.guardText, { color: colors.textSecondary }]}
        >
          No tienes permisos para gestionar usuarios.
        </Text>
        <Button variant="primary" size="md" onPress={() => router.back()}>
          Volver
        </Button>
      </View>
    );
  }

  // ── Estado de carga ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando usuarios...
        </Text>
      </View>
    );
  }

  // ── Estado de error ──────────────────────────────────────────────────────

  if (isError) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={colors.error}
        />
        <Text
          variant="titleMedium"
          style={[styles.errorText, { color: colors.error }]}
        >
          Error al cargar usuarios
        </Text>
        <Button variant="primary" size="md" onPress={handleRefresh}>
          Reintentar
        </Button>
      </View>
    );
  }

  // ── Renderizar cada usuario ──────────────────────────────────────────────

  const renderUserItem = ({ item }: { item: Profile }) => {
    const badgeColors = getRoleBadgeColors(item.role, colors);
    const initials = getInitials(item.full_name);

    return (
      <Card
        variant="elevated"
        padding="none"
        onPress={() => router.push(`/users/${item.id}`)}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          {/* Avatar con iniciales */}
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <Text
              variant="titleMedium"
              style={[styles.avatarText, { color: colors.onPrimaryContainer }]}
            >
              {initials}
            </Text>
          </View>

          {/* Informacion del usuario */}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text
                variant="titleSmall"
                style={{ color: colors.text }}
                numberOfLines={1}
              >
                {item.full_name}
              </Text>

              {/* Indicador de activo/inactivo */}
              <View
                style={[
                  styles.activeIndicator,
                  {
                    backgroundColor: item.is_active
                      ? colors.success
                      : colors.textDisabled,
                  },
                ]}
              />
            </View>

            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary }}
              numberOfLines={1}
            >
              {item.email}
            </Text>

            {/* Badge de rol */}
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: badgeColors.background },
              ]}
            >
              <Text style={[styles.roleBadgeText, { color: badgeColors.text }]}>
                {USER_ROLE_LABELS[item.role]}
              </Text>
            </View>
          </View>

          {/* Chevron de navegacion */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.textTertiary}
          />
        </View>
      </Card>
    );
  };

  // ── Pantalla principal ───────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de busqueda */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.outline,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={colors.textTertiary}
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Limpiar búsqueda"
            />
          )}
        </View>
      </View>

      {/* Lista de usuarios */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={[
          styles.listContent,
          filteredUsers.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={searchQuery.trim() ? 'magnify-close' : 'account-group-outline'}
            title={
              searchQuery.trim()
                ? `Sin resultados para '${searchQuery.trim()}'`
                : 'Sin usuarios'
            }
            description={
              searchQuery.trim()
                ? 'No se encontraron usuarios que coincidan con la busqueda.'
                : 'No hay usuarios registrados aun.'
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB para invitar miembros */}
      <FAB
        icon="account-plus"
        label="Invitar"
        onPress={handleInviteMember}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        accessibilityLabel="Invitar nuevo miembro"
      />
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  guardText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.smd,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.smd,
    gap: spacing.smd,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 9999,
    marginTop: spacing.xxs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 16,
  },
});
