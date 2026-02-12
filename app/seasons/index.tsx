import { useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useSeasons } from '@/src/features/seasons/hooks/useSeasons';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { spacing } from '@/src/shared/theme';
import type { Season } from '@/src/core/types/database';

// ── Configuracion de estados ────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: { label: 'Activa', colorKey: 'success' as const, icon: 'play-circle' },
  planning: { label: 'Planificacion', colorKey: 'info' as const, icon: 'calendar-clock' },
  closed: { label: 'Cerrada', colorKey: 'textSecondary' as const, icon: 'lock' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function SeasonsListScreen() {
  const { colors } = useAppTheme();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: seasons, isLoading, isError, error, refetch, isRefetching } = useSeasons();

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // ── Guard de permisos ───────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  if (!isProfileLoading && !isAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Temporadas' }} />
        <MaterialCommunityIcons
          name="lock-outline"
          size={64}
          color={colors.textSecondary}
        />
        <Text
          variant="titleLarge"
          style={{ color: colors.text, marginTop: spacing.md, fontWeight: '700' }}
        >
          Acceso restringido
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
        >
          No tienes permisos para acceder a esta seccion.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={handleGoBack}>
            Volver
          </Button>
        </View>
      </View>
    );
  }

  // ── Estado de carga ─────────────────────────────────────────────────────

  if (isLoading || isProfileLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Temporadas' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando temporadas...
        </Text>
      </View>
    );
  }

  // ── Estado de error ─────────────────────────────────────────────────────

  if (isError) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Temporadas' }} />
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={colors.error}
        />
        <Text
          variant="titleMedium"
          style={{ color: colors.text, marginTop: spacing.md, fontWeight: '600' }}
        >
          Error al cargar temporadas
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
        >
          {error instanceof Error ? error.message : 'Ocurrio un error inesperado.'}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={() => refetch()}>
            Reintentar
          </Button>
        </View>
      </View>
    );
  }

  // ── Estado vacio ────────────────────────────────────────────────────────

  if (!seasons || seasons.length === 0) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Temporadas' }} />
        <EmptyState
          icon="calendar-blank-outline"
          title="Sin temporadas"
          description="No hay temporadas creadas todavia. Crea la primera temporada para comenzar."
          actionLabel="Crear temporada"
          onAction={() => router.push('/seasons/new')}
        />
      </View>
    );
  }

  // ── Render de cada tarjeta de temporada ─────────────────────────────────

  const renderSeasonCard = ({ item }: { item: Season }) => {
    const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.planning;
    const dateRange = item.end_date
      ? `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
      : `${formatDate(item.start_date)} - Presente`;

    const cardStyle: import('react-native').ViewStyle = {
      marginHorizontal: spacing.md,
      marginBottom: spacing.smd,
    };

    return (
      <Card
        variant="elevated"
        padding="md"
        onPress={() => router.push(`/seasons/${item.id}`)}
        style={cardStyle}
      >
        <View style={styles.cardContent}>
          {/* Fila superior: nombre + badges + chevron */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text
                variant="titleMedium"
                style={{ color: colors.text, fontWeight: '700', flex: 1 }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.is_current && (
                <View style={styles.currentBadge}>
                  <MaterialCommunityIcons
                    name="star"
                    size={14}
                    color={colors.warning}
                  />
                  <Text
                    variant="labelSmall"
                    style={[styles.currentBadgeText, { color: colors.warning }]}
                  >
                    Actual
                  </Text>
                </View>
              )}
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.textTertiary}
            />
          </View>

          {/* Badge de estado */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors[statusConfig.colorKey] + '1A' },
              ]}
            >
              <MaterialCommunityIcons
                name={statusConfig.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={14}
                color={colors[statusConfig.colorKey]}
              />
              <Text
                variant="labelSmall"
                style={{ color: colors[statusConfig.colorKey], marginLeft: spacing.xxs, fontWeight: '600' }}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Rango de fechas */}
          <View style={styles.dateRow}>
            <MaterialCommunityIcons
              name="calendar-range"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary, marginLeft: spacing.xs }}
            >
              {dateRange}
            </Text>
          </View>

          {/* Descripcion (si existe) */}
          {item.description ? (
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary, marginTop: spacing.xs }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </Card>
    );
  };

  // ── Lista principal ─────────────────────────────────────────────────────

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Temporadas' }} />

      <FlatList
        data={seasons}
        keyExtractor={(item) => item.id}
        renderItem={renderSeasonCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={5}
        maxToRenderPerBatch={8}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* FAB para crear nueva temporada */}
      {isAdmin && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
          onPress={() => router.push('/seasons/new')}
          label="Nueva"
        />
      )}
    </View>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  cardContent: {
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  currentBadgeText: {
    marginLeft: 4,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    borderRadius: 16,
  },
});
