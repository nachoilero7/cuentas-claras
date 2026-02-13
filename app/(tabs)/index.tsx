export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CartesianChart, Bar, BarGroup } from 'victory-native';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCurrentSeason } from '@/src/features/seasons/hooks/useSeasons';
import {
  useDashboardSummary,
  useMonthlyBreakdown,
  useCategoryBreakdown,
} from '@/src/features/dashboard/hooks/useDashboard';
import { useRecurringTransactions } from '@/src/features/recurring/hooks/useRecurring';
import { useBudgetStatus } from '@/src/features/budget/hooks/useBudgetAlerts';
import { formatCurrency } from '@/src/core/utils/currency';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing, borderRadius } from '@/src/shared/theme/spacing';

// ── Formato de fecha actual ────────────────────────────────────────────────────
function getCurrentDateLabel(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const formatted = now.toLocaleDateString('es-AR', options);
  // Capitalizar primera letra
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ── Componente: Tarjeta de resumen individual ──────────────────────────────────

interface SummaryCardProps {
  label: string;
  amount: number;
  amountUsd?: number;
  color: string;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  backgroundColor: string;
  textColor: string;
  secondaryTextColor?: string;
}

const SummaryCard = React.memo(function SummaryCard({
  label,
  amount,
  amountUsd,
  color,
  iconName,
  backgroundColor,
  textColor,
  secondaryTextColor,
}: SummaryCardProps) {
  const showUsd = amountUsd !== undefined && amountUsd !== 0;

  return (
    <View style={[styles.summaryCard, { backgroundColor }]}>
      <View style={[styles.summaryIconContainer, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={color} />
      </View>
      <Text
        variant="labelSmall"
        style={[styles.summaryLabel, { color: textColor }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        variant="titleSmall"
        style={[styles.summaryAmount, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatCurrency(amount ?? 0)}
      </Text>
      {showUsd && (
        <Text
          variant="labelSmall"
          style={[styles.summaryAmountUsd, { color: secondaryTextColor ?? textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatCurrency(amountUsd, 'USD')}
        </Text>
      )}
    </View>
  );
});

// (Graficos Victory Native se renderizan inline en el dashboard)

// ── Componente principal: Dashboard ────────────────────────────────────────────

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const queryClient = useQueryClient();

  // Datos del perfil
  const { data: profile } = useProfile();

  // Temporada actual
  const { data: currentSeason } = useCurrentSeason();

  // Datos del dashboard (filtrados por temporada actual)
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useDashboardSummary(currentSeason?.id);

  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyBreakdown(currentSeason?.id);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryBreakdown({
    seasonId: currentSeason?.id,
  });

  // Datos de recurrentes y presupuestos para indicadores
  const { data: recurringData } = useRecurringTransactions();
  const { data: budgetStatuses } = useBudgetStatus();

  // Nombre para mostrar
  const displayName =
    profile?.display_name ??
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')?.[0] ?? 'Usuario';

  // Rol del usuario
  const userRole = profile?.role ?? 'viewer';
  const isAdmin = userRole === 'admin';

  // Fecha actual
  const currentDate = useMemo(() => getCurrentDateLabel(), []);

  // Pull to refresh
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['current-season'] }),
      queryClient.invalidateQueries({ queryKey: ['recurring'] }),
      queryClient.invalidateQueries({ queryKey: ['budget-status'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Calcular totales y porcentajes de categorias
  const categoryTotal = useMemo(() => {
    if (!categoryData || categoryData.length === 0) return 0;
    return categoryData.reduce((sum, cat) => sum + (cat.total_ars ?? 0), 0);
  }, [categoryData]);

  // Recurrentes vencidas (next_execution <= hoy y activas)
  const overdueRecurringCount = useMemo(() => {
    if (!recurringData || recurringData.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    return recurringData.filter(
      (r) => r.is_active && r.next_execution <= today
    ).length;
  }, [recurringData]);

  // Alertas de presupuesto sobre el umbral
  const overBudgetCount = useMemo(() => {
    if (!budgetStatuses || budgetStatuses.length === 0) return 0;
    return budgetStatuses.filter((s) => s.is_over_threshold).length;
  }, [budgetStatuses]);

  // Balance colores
  const balanceColor =
    (summary?.net_balance_ars ?? 0) >= 0
      ? colors.income
      : colors.expense;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (summaryLoading && !summary) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.md }}
        >
          Cargando dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Encabezado de bienvenida ──────────────────────────────────────── */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeTextContainer}>
            <Text
              variant="headlineSmall"
              style={[styles.greeting, { color: colors.text }]}
            >
              Hola, {displayName}!
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary }}
            >
              {currentDate}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary, marginTop: spacing.xxs }}
            >
              Temporada: {currentSeason?.name ?? 'Sin temporada activa'}
            </Text>
          </View>
          <View
            style={[
              styles.welcomeIconContainer,
              { backgroundColor: colors.primaryContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="hand-wave"
              size={28}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      {/* ── Contenido para administradores (datos financieros completos) ── */}
      {isAdmin && (
        <>
          {/* ── Error state ────────────────────────────────────────────── */}
          {summaryError && (
            <Card variant="outlined" padding="md" style={styles.sectionCard}>
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={32}
                  color={colors.error}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.error, marginTop: spacing.sm }}
                >
                  Error al cargar el resumen
                </Text>
              </View>
            </Card>
          )}

          {/* ── Tarjetas de resumen ──────────────────────────────────── */}
          <View style={styles.summaryRow}>
            <SummaryCard
              label="Ingresos"
              amount={summary?.total_income_ars ?? 0}
              amountUsd={summary?.total_income_usd ?? 0}
              color={colors.income}
              iconName="trending-up"
              backgroundColor={colors.surface}
              textColor={colors.textSecondary}
              secondaryTextColor={colors.textTertiary}
            />
            <SummaryCard
              label="Egresos"
              amount={summary?.total_expenses_ars ?? 0}
              amountUsd={summary?.total_expenses_usd ?? 0}
              color={colors.expense}
              iconName="trending-down"
              backgroundColor={colors.surface}
              textColor={colors.textSecondary}
              secondaryTextColor={colors.textTertiary}
            />
            <SummaryCard
              label="Balance"
              amount={summary?.net_balance_ars ?? 0}
              amountUsd={summary?.net_balance_usd ?? 0}
              color={balanceColor}
              iconName="scale-balance"
              backgroundColor={colors.surface}
              textColor={colors.textSecondary}
              secondaryTextColor={colors.textTertiary}
            />
          </View>

          {/* ── Fila secundaria: contadores ──────────────────────────── */}
          <View style={styles.countersRow}>
            <View style={[styles.counterChip, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={18}
                color={colors.primary}
              />
              <Text variant="labelMedium" style={{ color: colors.text, marginLeft: spacing.xs }}>
                {summary?.transaction_count ?? 0} movimientos
              </Text>
            </View>
            {(summary?.pending_approvals ?? 0) > 0 && (
              <Pressable
                style={[styles.counterChip, { backgroundColor: colors.surface }]}
                onPress={() => router.push('/approvals')}
                accessibilityRole="button"
                accessibilityLabel={`${summary?.pending_approvals} aprobaciones pendientes`}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={colors.warning}
                />
                <Text
                  variant="labelMedium"
                  style={{ color: colors.warning, marginLeft: spacing.xs, fontWeight: '600' }}
                >
                  {summary?.pending_approvals} pendientes
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Fila de indicadores: recurrentes y presupuestos ─────── */}
          <View style={styles.countersRow}>
            <Pressable
              style={[
                styles.counterChip,
                {
                  backgroundColor: colors.surface,
                  borderWidth: overdueRecurringCount > 0 ? 1 : 0,
                  borderColor: overdueRecurringCount > 0 ? colors.warning : 'transparent',
                },
              ]}
              onPress={() => router.push('/recurring')}
              accessibilityRole="button"
              accessibilityLabel={
                overdueRecurringCount > 0
                  ? `${overdueRecurringCount} recurrentes vencidas`
                  : 'Ver recurrentes'
              }
            >
              <MaterialCommunityIcons
                name="autorenew"
                size={18}
                color={overdueRecurringCount > 0 ? colors.warning : colors.primary}
              />
              <Text
                variant="labelMedium"
                style={{
                  color: overdueRecurringCount > 0 ? colors.warning : colors.text,
                  marginLeft: spacing.xs,
                  fontWeight: overdueRecurringCount > 0 ? '600' : '400',
                }}
              >
                {overdueRecurringCount > 0
                  ? `${overdueRecurringCount} vencidas`
                  : 'Recurrentes'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.counterChip,
                {
                  backgroundColor: colors.surface,
                  borderWidth: overBudgetCount > 0 ? 1 : 0,
                  borderColor: overBudgetCount > 0 ? colors.error : 'transparent',
                },
              ]}
              onPress={() => router.push('/budget-alerts')}
              accessibilityRole="button"
              accessibilityLabel={
                overBudgetCount > 0
                  ? `${overBudgetCount} alertas de presupuesto activas`
                  : 'Ver presupuestos'
              }
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={overBudgetCount > 0 ? colors.error : colors.primary}
              />
              <Text
                variant="labelMedium"
                style={{
                  color: overBudgetCount > 0 ? colors.error : colors.text,
                  marginLeft: spacing.xs,
                  fontWeight: overBudgetCount > 0 ? '600' : '400',
                }}
              >
                {overBudgetCount > 0
                  ? `${overBudgetCount} sobre limite`
                  : 'Presupuestos'}
              </Text>
            </Pressable>
          </View>

          {/* ── Grafico mensual: Ingresos vs Egresos ─────────────────── */}
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={22}
                color={colors.primary}
              />
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Ingresos vs Egresos (ultimos 6 meses)
              </Text>
            </View>

            {/* Leyenda */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.income }]}
                />
                <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
                  Ingresos
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.expense }]}
                />
                <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
                  Egresos
                </Text>
              </View>
            </View>

            {monthlyLoading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !monthlyData || monthlyData.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="chart-line-variant"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.textSecondary, marginTop: spacing.sm }}
                >
                  Sin datos mensuales
                </Text>
              </View>
            ) : (
              <View style={{ height: 220 }}>
                <CartesianChart
                  data={monthlyData as unknown as Record<string, unknown>[]}
                  xKey={"label" as never}
                  yKeys={["income", "expenses"] as never[]}
                  domainPadding={{ left: 30, right: 30, top: 10 }}
                  axisOptions={{
                    labelColor: colors.textSecondary,
                    lineColor: colors.outlineVariant,
                  }}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {({ points, chartBounds }: any) => (
                    <BarGroup
                      chartBounds={chartBounds}
                      betweenGroupPadding={0.3}
                      withinGroupPadding={0.1}
                    >
                      <BarGroup.Bar
                        points={points.income}
                        color={colors.income}
                        animate={{ type: 'spring' }}
                      />
                      <BarGroup.Bar
                        points={points.expenses}
                        color={colors.expense}
                        animate={{ type: 'spring' }}
                      />
                    </BarGroup>
                  )}
                </CartesianChart>
              </View>
            )}
          </Card>

          {/* ── Distribucion de egresos por categoria ─────────────────── */}
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="tag-multiple"
                size={22}
                color={colors.primary}
              />
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Distribucion de egresos
              </Text>
            </View>

            {categoryLoading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !categoryData || categoryData.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="tag-off-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: colors.textSecondary, marginTop: spacing.sm }}
                >
                  Sin datos de egresos
                </Text>
              </View>
            ) : (
              <View style={{ height: Math.max(180, categoryData.length * 44) }}>
                <CartesianChart
                  data={categoryData.map((cat) => ({
                    category_name: cat.category_name,
                    total_ars: cat.total_ars ?? 0,
                  })) as unknown as Record<string, unknown>[]}
                  xKey={"category_name" as never}
                  yKeys={["total_ars"] as never[]}
                  domainPadding={{ left: 10, right: 10, top: 10 }}
                  axisOptions={{
                    labelColor: colors.textSecondary,
                    lineColor: colors.outlineVariant,
                  }}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {({ points, chartBounds }: any) => (
                    <Bar
                      points={points.total_ars}
                      chartBounds={chartBounds}
                      color={colors.expense}
                      animate={{ type: 'spring' }}
                      roundedCorners={{ topLeft: 4, topRight: 4 }}
                    />
                  )}
                </CartesianChart>
              </View>
            )}

            {/* Leyenda de categorias (clickeable) */}
            {categoryData && categoryData.length > 0 && (
              <View style={styles.categoryLegend}>
                {categoryData.map((cat) => {
                  const pct = categoryTotal > 0
                    ? ((cat.total_ars ?? 0) / categoryTotal) * 100
                    : 0;
                  return (
                    <Pressable
                      key={cat.category_id}
                      style={styles.categoryLegendItem}
                      onPress={() => router.push({
                        pathname: '/(tabs)/transactions',
                        params: { categoryId: cat.category_id, type: 'expense' },
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.category_name}: ${formatCurrency(cat.total_ars)}`}
                    >
                      <View
                        style={[
                          styles.categoryLegendDot,
                          { backgroundColor: cat.color ?? colors.expense },
                        ]}
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.text, flex: 1 }}
                        numberOfLines={1}
                      >
                        {cat.category_name}
                      </Text>
                      <Text
                        variant="labelSmall"
                        style={{ color: colors.textSecondary }}
                      >
                        {pct.toFixed(1)}%
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.text, fontWeight: '600', marginLeft: spacing.xs }}
                      >
                        {formatCurrency(cat.total_ars)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>

          {/* ── Acciones rapidas (admin) ──────────────────────────────── */}
          <View style={styles.quickActions}>
            <Button
              variant="primary"
              icon="plus-circle-outline"
              fullWidth
              onPress={() => router.push('/transactions/new')}
              style={styles.quickActionButton}
            >
              Nuevo Movimiento
            </Button>
            <Button
              variant="outline"
              icon="tag-outline"
              fullWidth
              onPress={() => router.push('/(tabs)/categories')}
              style={styles.quickActionButton}
            >
              Ver Rubros
            </Button>
          </View>
        </>
      )}

      {/* ── Contenido para usuarios no-admin (vista simplificada) ────────── */}
      {!isAdmin && (
        <>
          {/* ── Informacion sobre permisos ──────────────────────────── */}
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <View style={styles.infoSection}>
              <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={32} color={colors.primary} />
              </View>
              <Text
                variant="titleSmall"
                style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}
              >
                Registra tus movimientos
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}
              >
                Podes crear movimientos en cualquier rubro. Cada movimiento sera revisado y aprobado por un administrador.
              </Text>
            </View>
          </Card>

          {/* ── Accion principal: crear movimiento ───────────────────── */}
          <Button
            variant="primary"
            size="lg"
            icon="plus-circle-outline"
            fullWidth
            onPress={() => router.push('/transactions/new')}
            style={{ marginBottom: spacing.md }}
          >
            Nuevo Movimiento
          </Button>

          {/* ── Acceso a mis movimientos ─────────────────────────────── */}
          <Button
            variant="outline"
            icon="swap-horizontal"
            fullWidth
            onPress={() => router.push('/(tabs)/transactions')}
            style={{ marginBottom: spacing.sm }}
          >
            Ver mis movimientos
          </Button>
        </>
      )}

      {/* Padding inferior para scroll seguro */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout principal
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bienvenida
  welcomeSection: {
    marginBottom: spacing.md,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTextContainer: {
    flex: 1,
  },
  greeting: {
    fontWeight: '700',
  },
  welcomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },

  // Tarjetas de resumen
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.smd,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.smd,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    marginBottom: spacing.xxs,
    fontWeight: '500',
  },
  summaryAmount: {
    fontWeight: '700',
  },
  summaryAmountUsd: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: spacing.xxs,
  },

  // Contadores secundarios
  countersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  counterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // Secciones de graficos
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  chartLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Leyenda del grafico
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.smd,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Leyenda de categorias
  categoryLegend: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  categoryLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  categoryLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Seccion informativa (no-admin)
  infoSection: {
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.md,
  },
  infoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Acciones rapidas
  quickActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickActionButton: {
    marginBottom: 0,
  },

  // Espaciado inferior
  bottomSpacer: {
    height: spacing.xl,
  },
});
