import { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/src/features/budget/hooks/useNotifications';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { spacing } from '@/src/shared/theme';
import type { Notification } from '@/src/core/types/database';

// ── Utilidad de tiempo relativo ─────────────────────────────────────────────

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'Ahora';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes === 1) return 'Hace 1 minuto';
  if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
  if (diffHours === 1) return 'Hace 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return 'Hace 1 dia';
  if (diffDays < 30) return `Hace ${diffDays} dias`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Hace 1 mes';
  return `Hace ${diffMonths} meses`;
}

// ── Icono segun tipo de notificacion ────────────────────────────────────────

function getNotificationIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'budget_alert':
      return 'alert-circle';
    case 'approval':
      return 'clipboard-check';
    default:
      return 'bell';
  }
}

function getNotificationIconColor(type: string, colors: ReturnType<typeof useAppTheme>['colors']): string {
  switch (type) {
    case 'budget_alert':
      return colors.warning;
    case 'approval':
      return colors.info;
    default:
      return colors.primary;
  }
}

// ── Componente principal ────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors } = useAppTheme();

  const {
    data: notifications,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useNotifications();

  const { data: unreadCount } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = useCallback(
    (notification: Notification) => {
      if (!notification.is_read) {
        markAsReadMutation.mutate(notification.id);
      }
    },
    [markAsReadMutation],
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Ordenar por fecha descendente ─────────────────────────────────────────

  const sortedNotifications = useMemo(() => {
    if (!notifications) return [];
    return [...notifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [notifications]);

  // ── Estado de carga ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando notificaciones...
        </Text>
      </View>
    );
  }

  // ── Estado de error ────────────────────────────────────────────────────────

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
          style={{ color: colors.text, marginTop: spacing.md, fontWeight: '600' }}
        >
          Error al cargar notificaciones
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
        >
          {error instanceof Error
            ? error.message
            : 'Ocurrio un error inesperado.'}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={handleRefresh}>
            Reintentar
          </Button>
        </View>
      </View>
    );
  }

  // ── Renderizar cada notificacion ──────────────────────────────────────────

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationIconColor(item.type, colors);
    const relativeTime = getRelativeTime(item.created_at);
    const isUnread = !item.is_read;

    return (
      <Pressable onPress={() => handleMarkAsRead(item)}>
        <Card
          variant={isUnread ? 'elevated' : 'outlined'}
          padding="md"
          style={styles.notificationCard}
        >
          <View style={styles.notificationRow}>
            {/* Indicador de no leido */}
            {isUnread && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}

            {/* Icono */}
            <View
              style={[
                styles.notificationIconContainer,
                {
                  backgroundColor: isUnread
                    ? `${iconColor}18`
                    : colors.outlineVariant,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={iconName}
                size={22}
                color={isUnread ? iconColor : colors.textTertiary}
              />
            </View>

            {/* Contenido */}
            <View style={styles.notificationContent}>
              <Text
                variant="bodyMedium"
                style={{
                  color: colors.text,
                  fontWeight: isUnread ? '700' : '400',
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color: colors.textSecondary,
                  marginTop: spacing.xxs,
                }}
                numberOfLines={3}
              >
                {item.body}
              </Text>
              <Text
                variant="labelSmall"
                style={{
                  color: colors.textTertiary,
                  marginTop: spacing.xs,
                }}
              >
                {relativeTime}
              </Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  // ── Cabecera con boton "Marcar todas como leidas" ─────────────────────────

  const ListHeaderComponent = useMemo(() => {
    if (!unreadCount || unreadCount === 0) return null;

    return (
      <View style={styles.headerActions}>
        <View style={styles.unreadBadgeRow}>
          <View style={[styles.unreadBadge, { backgroundColor: colors.primaryContainer }]}>
            <Text
              variant="labelMedium"
              style={{ color: colors.primary, fontWeight: '700' }}
            >
              {unreadCount}
            </Text>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginLeft: spacing.sm }}
          >
            {unreadCount === 1 ? 'notificacion sin leer' : 'notificaciones sin leer'}
          </Text>
        </View>
        <Pressable
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending}
        >
          <MaterialCommunityIcons
            name="check-all"
            size={18}
            color={colors.primary}
          />
          <Text
            variant="labelMedium"
            style={{ color: colors.primary, marginLeft: spacing.xs, fontWeight: '600' }}
          >
            Marcar todas como leidas
          </Text>
        </Pressable>
      </View>
    );
  }, [unreadCount, colors, handleMarkAllAsRead, markAllAsReadMutation.isPending]);

  // ── Pantalla principal ────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        contentContainerStyle={[
          styles.listContent,
          sortedNotifications.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={ListHeaderComponent}
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
            icon="bell-outline"
            title="Sin notificaciones"
            description="No tienes notificaciones en este momento. Cuando haya alertas de presupuesto o actualizaciones, apareceran aqui."
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },

  // Header actions
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.smd,
    marginBottom: spacing.xs,
  },
  unreadBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  // Notification cards
  notificationCard: {
    marginBottom: spacing.sm,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: -4,
    top: 14,
    zIndex: 1,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.smd,
  },
  notificationContent: {
    flex: 1,
  },
});
