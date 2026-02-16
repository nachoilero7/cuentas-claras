import { useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import {
  useBudgetAlerts,
  useUpsertBudgetAlert,
  useDeleteBudgetAlert,
  useBudgetStatus,
} from '@/src/features/budget/hooks/useBudgetAlerts';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { formatCurrency } from '@/src/core/utils/currency';
import { hapticWarning } from '@/src/shared/lib/haptics';
import { spacing, borderRadius } from '@/src/shared/theme';
import type { BudgetAlertWithCategory } from '@/src/features/budget/services/budgetAlertService';
import type { BudgetStatus } from '@/src/features/budget/services/budgetAlertService';

// ── Colores de progreso ─────────────────────────────────────────────────────

function getProgressColor(percentageUsed: number, threshold: number, colors: { error: string; warning: string; success: string }): string {
  if (percentageUsed >= threshold) return colors.error;
  if (percentageUsed >= 50) return colors.warning;
  return colors.success;
}

// ── Componente de barra de progreso ─────────────────────────────────────────

function ProgressBar({
  percentage,
  threshold,
  color,
  trackColor,
  markerColor,
}: {
  percentage: number;
  threshold: number;
  color: string;
  trackColor: string;
  markerColor: string;
}) {
  const clampedPercentage = Math.min(percentage, 100);
  const clampedThreshold = Math.min(threshold, 100);

  return (
    <View style={[progressStyles.track, { backgroundColor: trackColor }]}>
      <View
        style={[
          progressStyles.fill,
          {
            backgroundColor: color,
            width: `${clampedPercentage}%`,
          },
        ]}
      />
      {/* Marcador del umbral */}
      <View
        style={[
          progressStyles.thresholdMarker,
          { left: `${clampedThreshold}%`, backgroundColor: markerColor },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    borderRadius: 1,
    marginLeft: -1,
  },
});

// ── Componente principal ────────────────────────────────────────────────────

export default function BudgetAlertsScreen() {
  const { colors } = useAppTheme();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  const {
    data: alerts,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    error: alertsError,
    refetch: refetchAlerts,
    isRefetching: isAlertsRefetching,
  } = useBudgetAlerts();

  const {
    data: budgetStatuses,
    refetch: refetchStatus,
    isRefetching: isStatusRefetching,
  } = useBudgetStatus();

  const upsertMutation = useUpsertBudgetAlert();
  const deleteMutation = useDeleteBudgetAlert();

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // ── Mapa de estados de presupuesto por categoria ──────────────────────────
  // NOTA: todos los hooks deben ir ANTES de los early returns (Rules of Hooks)

  const statusMap = useMemo(() => {
    const map = new Map<string, BudgetStatus>();
    budgetStatuses?.forEach((s) => map.set(s.category_id, s));
    return map;
  }, [budgetStatuses]);

  const activeAlerts = useMemo(() => {
    return (alerts ?? []).filter((a) => a.is_active);
  }, [alerts]);

  // Cabecera de la lista (debe estar antes de los early returns - Rules of Hooks)
  const ListHeaderComponent = useMemo(() => {
    if (activeAlerts.length === 0) return null;

    return (
      <View>
        {/* Seccion de estados de presupuesto */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="chart-bar"
            size={20}
            color={colors.primary}
          />
          <Text
            variant="titleMedium"
            style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}
          >
            Estado de presupuestos
          </Text>
        </View>

        {activeAlerts.map((alert) => {
          const status = statusMap.get(alert.category_id);
          if (!status) return null;

          const progressColor = getProgressColor(status.percentage_used, status.threshold_percentage, colors);
          const iconName = (alert.category?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'tag-outline';

          return (
            <Card
              key={`status-${alert.id}`}
              variant="elevated"
              padding="md"
              style={styles.statusCard}
            >
              <View style={styles.statusHeader}>
                <View style={[styles.statusIconContainer, { backgroundColor: alert.category?.color ? `${alert.category.color}20` : colors.primaryContainer }]}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={20}
                    color={alert.category?.color ?? colors.primary}
                  />
                </View>
                <View style={styles.statusHeaderText}>
                  <Text
                    variant="titleSmall"
                    style={{ color: colors.text, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {status.category_name}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={{ color: progressColor, fontWeight: '600' }}
                  >
                    {Math.round(status.percentage_used)}% usado
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <ProgressBar
                  percentage={status.percentage_used}
                  threshold={status.threshold_percentage}
                  color={progressColor}
                  trackColor={colors.outlineVariant}
                  markerColor={colors.text}
                />
              </View>

              <View style={styles.statusFooter}>
                <Text
                  variant="bodySmall"
                  style={{ color: colors.textSecondary }}
                >
                  {formatCurrency(status.current_spending)} / {formatCurrency(status.budget_limit)}
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ color: colors.textTertiary }}
                >
                  Umbral: {status.threshold_percentage}%
                </Text>
              </View>
            </Card>
          );
        })}

        {/* Separador */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="cog-outline"
            size={20}
            color={colors.primary}
          />
          <Text
            variant="titleMedium"
            style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}
          >
            Configuracion de alertas
          </Text>
        </View>
      </View>
    );
  }, [activeAlerts, statusMap, colors]);

  // ── Guard: solo admin puede acceder ──────────────────────────────────────

  if (!isProfileLoading && !isAdmin) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
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
          No tienes permisos para gestionar las alertas de presupuesto.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={() => router.back()}>
            Volver
          </Button>
        </View>
      </View>
    );
  }

  // ── Estado de carga ────────────────────────────────────────────────────────

  if (isAlertsLoading || isProfileLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando alertas...
        </Text>
      </View>
    );
  }

  // ── Estado de error ────────────────────────────────────────────────────────

  if (isAlertsError) {
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
          Error al cargar alertas
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
        >
          {alertsError instanceof Error
            ? alertsError.message
            : 'Ocurrio un error inesperado.'}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={() => { refetchAlerts(); refetchStatus(); }}>
            Reintentar
          </Button>
        </View>
      </View>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleAlert = (alert: BudgetAlertWithCategory) => {
    upsertMutation.mutate({
      category_id: alert.category_id,
      threshold_percentage: alert.threshold_percentage,
      is_active: !alert.is_active,
    });
  };

  const handleThresholdStep = (alert: BudgetAlertWithCategory, direction: 'up' | 'down') => {
    const step = 5;
    const current = alert.threshold_percentage;
    const newValue = direction === 'up'
      ? Math.min(current + step, 100)
      : Math.max(current - step, 10);
    if (newValue !== current) {
      upsertMutation.mutate({
        category_id: alert.category_id,
        threshold_percentage: newValue,
        is_active: alert.is_active,
      });
    }
  };

  const handleDeleteAlert = (alert: BudgetAlertWithCategory) => {
    hapticWarning();
    Alert.alert(
      'Eliminar alerta',
      `Deseas eliminar la alerta de "${alert.category?.name ?? 'esta categoria'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(alert.id);
          },
        },
      ],
    );
  };

  const handleRefresh = () => {
    refetchAlerts();
    refetchStatus();
  };

  // ── Renderizar cada alerta configurable ───────────────────────────────────

  const renderAlertItem = ({ item }: { item: BudgetAlertWithCategory }) => {
    const iconName = (item.category?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'tag-outline';
    const budgetLimit = item.category?.budget_limit_ars;

    return (
      <Card variant="outlined" padding="md" style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <View style={[styles.alertIconContainer, { backgroundColor: item.category?.color ? `${item.category.color}20` : colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={iconName}
                size={18}
                color={item.category?.color ?? colors.primary}
              />
            </View>
            <View style={styles.alertTitleText}>
              <Text
                variant="bodyMedium"
                style={{ color: colors.text, fontWeight: '600' }}
                numberOfLines={1}
              >
                {item.category?.name ?? 'Categoria desconocida'}
              </Text>
              {budgetLimit != null && (
                <Text
                  variant="bodySmall"
                  style={{ color: colors.textSecondary }}
                >
                  Limite: {formatCurrency(budgetLimit)}
                </Text>
              )}
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleAlert(item)}
            color={colors.primary}
          />
        </View>

        {/* Control de umbral con stepper */}
        <View style={[styles.thresholdSection, { borderTopColor: colors.outlineVariant }]}>
          <Text
            variant="bodySmall"
            style={{ color: colors.textSecondary, marginBottom: spacing.sm }}
          >
            Umbral de alerta
          </Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
              onPress={() => handleThresholdStep(item, 'down')}
              disabled={item.threshold_percentage <= 10}
            >
              <MaterialCommunityIcons
                name="minus"
                size={20}
                color={item.threshold_percentage <= 10 ? colors.textDisabled : colors.text}
              />
            </Pressable>

            <View style={[styles.stepperValueContainer, { backgroundColor: colors.primaryContainer }]}>
              <Text
                variant="titleMedium"
                style={{ color: colors.primary, fontWeight: '700' }}
              >
                {item.threshold_percentage}%
              </Text>
            </View>

            <Pressable
              style={[styles.stepperButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]}
              onPress={() => handleThresholdStep(item, 'up')}
              disabled={item.threshold_percentage >= 100}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={item.threshold_percentage >= 100 ? colors.textDisabled : colors.text}
              />
            </Pressable>
          </View>
          <View style={styles.stepperLabels}>
            <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
              Min: 10%
            </Text>
            <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
              Max: 100%
            </Text>
          </View>
        </View>

        {/* Boton de eliminar */}
        <Pressable
          style={[styles.deleteRow, { borderTopColor: colors.outlineVariant }]}
          onPress={() => handleDeleteAlert(item)}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={18}
            color={colors.error}
          />
          <Text
            variant="bodySmall"
            style={{ color: colors.error, marginLeft: spacing.xs }}
          >
            Eliminar alerta
          </Text>
        </Pressable>
      </Card>
    );
  };

  // ── Pantalla principal ────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={alerts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={[
          styles.listContent,
          (!alerts || alerts.length === 0) && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          alerts && alerts.length > 0
            ? ListHeaderComponent
            : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={isAlertsRefetching || isStatusRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bell-alert-outline"
            title="Sin alertas configuradas"
            description="No hay alertas de presupuesto configuradas. Las alertas se crean automaticamente al establecer limites de presupuesto en las categorias."
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.smd,
    marginTop: spacing.md,
  },

  // Status cards
  statusCard: {
    marginBottom: spacing.smd,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusHeaderText: {
    flex: 1,
    marginLeft: spacing.smd,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  // Alert config cards
  alertCard: {
    marginBottom: spacing.smd,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  alertIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitleText: {
    flex: 1,
    marginLeft: spacing.smd,
  },
  thresholdSection: {
    marginTop: spacing.smd,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepperValueContainer: {
    minWidth: 72,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  stepperLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.smd,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
