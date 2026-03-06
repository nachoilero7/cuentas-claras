export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useAllUsers } from '@/src/features/users/hooks/useUsers';
import { SkeletonList } from '@/src/shared/components/feedback/SkeletonList';
import { spacing, borderRadius } from '@/src/shared/theme';
import { USER_ROLE_LABELS } from '@/src/core/config/constants';
import type { Profile, UserRole } from '@/src/core/types/database';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// ── Componente de tarjeta de miembro ─────────────────────────────────────────

interface MemberCardProps {
  member: Profile;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function MemberCard({ member, colors }: MemberCardProps) {
  const [copied, setCopied] = useState(false);
  const ROLE_COLORS: Record<UserRole, string> = {
    admin: colors.info,
    manager: colors.warning,
    viewer: colors.textSecondary,
  };
  const roleColor = ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer;
  const roleLabel = USER_ROLE_LABELS[member.role] ?? member.role;
  const initials = getInitials(member.full_name);

  const handleCopyAlias = useCallback(async () => {
    if (!member.payment_alias) return;
    await Clipboard.setStringAsync(member.payment_alias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [member.payment_alias]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardRow}>
        {/* Avatar */}
        {member.avatar_url ? (
          <Image
            source={{ uri: member.avatar_url }}
            style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: roleColor + '1A' }]}>
            <Text
              variant="titleMedium"
              style={{ color: roleColor, fontWeight: '700' }}
            >
              {initials}
            </Text>
          </View>
        )}

        {/* Info principal */}
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text
              variant="titleSmall"
              style={{ color: colors.text, fontWeight: '700', flex: 1 }}
              numberOfLines={1}
            >
              {member.full_name}
            </Text>

            {/* Indicador activo/inactivo */}
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: member.is_active
                    ? colors.success
                    : colors.error,
                },
              ]}
            />
            <Text
              variant="labelSmall"
              style={{
                color: member.is_active ? colors.success : colors.error,
                marginLeft: spacing.xxs,
              }}
            >
              {member.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>

          {/* Badge de rol */}
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '1A' }]}>
            <MaterialCommunityIcons
              name="shield-account"
              size={12}
              color={roleColor}
            />
            <Text
              variant="labelSmall"
              style={{ color: roleColor, marginLeft: spacing.xxs, fontWeight: '600' }}
            >
              {roleLabel}
            </Text>
          </View>

          {/* Email */}
          <View style={styles.infoLine}>
            <MaterialCommunityIcons
              name="email-outline"
              size={14}
              color={colors.textTertiary}
            />
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary, marginLeft: spacing.xs, flex: 1 }}
              numberOfLines={1}
            >
              {member.email}
            </Text>
          </View>

          {/* Telefono */}
          {member.phone ? (
            <View style={styles.infoLine}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                variant="bodySmall"
                style={{ color: colors.textSecondary, marginLeft: spacing.xs }}
              >
                {member.phone}
              </Text>
            </View>
          ) : null}

          {/* Alias de pago */}
          {member.payment_alias ? (
            <View style={styles.infoLine}>
              <MaterialCommunityIcons
                name="bank-transfer"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                variant="bodySmall"
                style={{
                  color: colors.textSecondary,
                  marginLeft: spacing.xs,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {member.payment_alias}
              </Text>
              <Pressable
                onPress={handleCopyAlias}
                hitSlop={8}
                style={[styles.copyBtn, { backgroundColor: colors.surfaceVariant }]}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Alias copiado' : 'Copiar alias de pago'}
              >
                <MaterialCommunityIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={14}
                  color={copied ? colors.success : colors.textTertiary}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────

type RoleFilter = 'all' | UserRole;

const ROLE_FILTER_CHIPS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'admin', label: 'Admins' },
  { key: 'manager', label: 'Managers' },
  { key: 'viewer', label: 'Viewers' },
];

export default function MembersTab() {
  const { colors } = useAppTheme();
  const { data: users, isLoading, refetch, isRefetching } = useAllUsers();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let result = users;

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.display_name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, search, roleFilter]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: Profile }) => (
      <MemberCard member={item} colors={colors} />
    ),
    [colors]
  );

  const keyExtractor = useCallback((item: Profile) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {/* Titulo y contador */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: '700' }}
            >
              Directorio de Miembros
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: colors.textSecondary, marginTop: spacing.xxs }}
            >
              {users?.length ?? 0}{' '}
              {(users?.length ?? 0) === 1 ? 'miembro' : 'miembros'} registrados
            </Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="account-group"
              size={28}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Barra de busqueda */}
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
            color={colors.textTertiary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          )}
        </View>

        {/* Filtros por rol */}
        <View style={styles.roleChipsRow}>
          {ROLE_FILTER_CHIPS.map((chip) => {
            const isActive = roleFilter === chip.key;
            return (
              <Chip
                key={chip.key}
                mode={isActive ? 'flat' : 'outlined'}
                selected={isActive}
                onPress={() => setRoleFilter(chip.key)}
                accessibilityLabel={`Filtro rol: ${chip.label}${isActive ? ', seleccionado' : ''}`}
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.roleChip,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={{
                  color: isActive ? colors.onPrimary : colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '500',
                }}
                showSelectedOverlay={false}
                showSelectedCheck={false}
                compact
              >
                {chip.label}
              </Chip>
            );
          })}
        </View>
      </View>
    ),
    [colors, users?.length, search, roleFilter]
  );

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <SkeletonList count={5} variant="member" />
        </View>
      );
    }

    const hasActiveFilters = search.trim() || roleFilter !== 'all';

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name={hasActiveFilters ? 'magnify-close' : 'account-search-outline'}
          size={64}
          color={colors.textTertiary}
        />
        <Text
          variant="titleMedium"
          style={{
            color: colors.textSecondary,
            marginTop: spacing.md,
            fontWeight: '600',
          }}
        >
          {search.trim()
            ? `Sin resultados para '${search.trim()}'`
            : roleFilter !== 'all'
              ? 'Sin resultados para tu busqueda'
              : 'No se encontraron miembros'}
        </Text>
        <Text
          variant="bodyMedium"
          style={{
            color: colors.textTertiary,
            marginTop: spacing.xs,
            textAlign: 'center',
          }}
        >
          {hasActiveFilters
            ? 'Intenta con otros filtros de busqueda.'
            : 'Aun no hay miembros registrados.'}
        </Text>
      </View>
    );
  }, [isLoading, colors, search, roleFilter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: spacing.md,
    gap: spacing.smd,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
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
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.smd,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.smd,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  copyBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  roleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
});
