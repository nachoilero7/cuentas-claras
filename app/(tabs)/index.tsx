export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import Svg, { Circle } from 'react-native-svg';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCurrentSeason } from '@/src/features/seasons/hooks/useSeasons';
import {
  useDashboardSummary,
  useMonthlyBreakdown,
  useCategoryBalances,
} from '@/src/features/dashboard/hooks/useDashboard';
import { useRecurringTransactions } from '@/src/features/recurring/hooks/useRecurring';
import { useBudgetStatus } from '@/src/features/budget/hooks/useBudgetAlerts';
import { formatCurrency } from '@/src/core/utils/currency';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing, borderRadius } from '@/src/shared/theme/spacing';

// ── Constantes del grafico ────────────────────────────────────────────────────
const CHART_BAR_HEIGHT = 160;
const DONUT_SIZE = 150;
const DONUT_STROKE = 22;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

// ── Formato compacto de montos (ej: $1.2M, $500K, $3.5K) ─────────────────────
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  if (abs === 0) return '$0';
  return `${sign}$${Math.round(abs)}`;
}

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

// ── Componente: Donut de resumen financiero ───────────────────────────────────

interface DonutSummaryProps {
  income: number;
  expenses: number;
  incomeUsd: number;
  expensesUsd: number;
  balance: number;
  balanceUsd: number;
  incomeColor: string;
  expenseColor: string;
  balanceColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
  textTertiary: string;
}

const DonutSummary = React.memo(function DonutSummary({
  income,
  expenses,
  incomeUsd,
  expensesUsd,
  balance,
  balanceUsd,
  incomeColor,
  expenseColor,
  balanceColor,
  surfaceColor,
  textColor,
  textSecondary,
  textTertiary,
}: DonutSummaryProps) {
  const total = income + expenses;
  const incomePct = total > 0 ? income / total : 0.5;
  const expensePct = total > 0 ? expenses / total : 0.5;
  const spendRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;

  // SVG donut segments (income starts from top, expense follows)
  const incomeLength = DONUT_CIRCUMFERENCE * incomePct;
  const expenseLength = DONUT_CIRCUMFERENCE * expensePct;
  const showUsdIncome = incomeUsd !== 0;
  const showUsdExpenses = expensesUsd !== 0;
  const showUsdBalance = balanceUsd !== 0;

  return (
    <View style={styles.donutCard}>
      <View style={styles.donutRow}>
        {/* Donut SVG */}
        <View style={styles.donutContainer}>
          <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
            {/* Track de fondo */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              stroke={surfaceColor}
              strokeWidth={DONUT_STROKE}
              fill="none"
            />
            {/* Segmento de ingresos */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              stroke={incomeColor}
              strokeWidth={DONUT_STROKE}
              fill="none"
              strokeDasharray={`${incomeLength} ${DONUT_CIRCUMFERENCE - incomeLength}`}
              strokeDashoffset={DONUT_CIRCUMFERENCE * 0.25}
              strokeLinecap="round"
            />
            {/* Segmento de egresos */}
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              stroke={expenseColor}
              strokeWidth={DONUT_STROKE}
              fill="none"
              strokeDasharray={`${expenseLength} ${DONUT_CIRCUMFERENCE - expenseLength}`}
              strokeDashoffset={DONUT_CIRCUMFERENCE * 0.25 - incomeLength}
              strokeLinecap="round"
            />
          </Svg>
          {/* Centro: balance */}
          <View style={styles.donutCenter}>
            <Text variant="labelSmall" style={{ color: textTertiary, fontSize: 9 }}>
              Balance
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: balanceColor, fontWeight: '700', fontSize: 14 }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCompact(balance)}
            </Text>
            {spendRatio > 0 && (
              <Text variant="labelSmall" style={{ color: textTertiary, fontSize: 8 }}>
                {spendRatio}% gastado
              </Text>
            )}
          </View>
        </View>

        {/* Detalle a la derecha */}
        <View style={styles.donutDetails}>
          {/* Ingresos */}
          <View style={styles.donutDetailRow}>
            <View style={[styles.donutDetailDot, { backgroundColor: incomeColor }]} />
            <View style={styles.donutDetailTexts}>
              <Text variant="labelSmall" style={{ color: textSecondary }}>
                Ingresos
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: incomeColor, fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(income)}
              </Text>
              {showUsdIncome && (
                <Text variant="labelSmall" style={{ color: textTertiary, fontSize: 10 }}>
                  {formatCurrency(incomeUsd, 'USD')}
                </Text>
              )}
            </View>
          </View>
          {/* Egresos */}
          <View style={styles.donutDetailRow}>
            <View style={[styles.donutDetailDot, { backgroundColor: expenseColor }]} />
            <View style={styles.donutDetailTexts}>
              <Text variant="labelSmall" style={{ color: textSecondary }}>
                Egresos
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: expenseColor, fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(expenses)}
              </Text>
              {showUsdExpenses && (
                <Text variant="labelSmall" style={{ color: textTertiary, fontSize: 10 }}>
                  {formatCurrency(expensesUsd, 'USD')}
                </Text>
              )}
            </View>
          </View>
          {/* Balance completo */}
          <View style={[styles.donutDetailRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: textTertiary + '30', paddingTop: spacing.xs }]}>
            <MaterialCommunityIcons name="scale-balance" size={14} color={balanceColor} />
            <View style={styles.donutDetailTexts}>
              <Text
                variant="titleSmall"
                style={{ color: balanceColor, fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(balance)}
              </Text>
              {showUsdBalance && (
                <Text variant="labelSmall" style={{ color: textTertiary, fontSize: 10 }}>
                  {formatCurrency(balanceUsd, 'USD')}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

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
  const { data: categoryBalances, isLoading: categoryLoading } = useCategoryBalances(currentSeason?.id);

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

  // Categorias activas con balance, ordenadas por balance descendente
  const activeBalances = useMemo(() => {
    if (!categoryBalances || categoryBalances.length === 0) return [];
    return categoryBalances
      .filter((b) => b.is_active)
      .sort((a, b) => b.balance_ars - a.balance_ars);
  }, [categoryBalances]);

  // Valor maximo absoluto para escala de barras
  const maxAbsBalance = useMemo(() => {
    if (activeBalances.length === 0) return 0;
    return Math.max(...activeBalances.map((b) => Math.abs(b.balance_ars)), 1);
  }, [activeBalances]);

  // Valor maximo para escala del grafico mensual
  const monthlyMax = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return 0;
    return Math.max(...monthlyData.flatMap((m) => [m.income, m.expenses]), 1);
  }, [monthlyData]);

  // Recurrentes vencidas (next_execution <= hoy y activas)
  const overdueRecurringCount = useMemo(() => {
    if (!recurringData || recurringData.length === 0) return 0;
    const today = new Date().toISOString().split('T')[0];
    return recurringData.filter(
      (r) => r.is_active && r.next_execution <= today
    ).length;
  }, [recurringData]);

  // Alertas de balance disparadas
  const triggeredAlertCount = useMemo(() => {
    if (!budgetStatuses || budgetStatuses.length === 0) return 0;
    return budgetStatuses.filter((s) => s.is_triggered).length;
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
          <View style={styles.welcomeLogoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.welcomeLogo}
              resizeMode="cover"
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

          {/* ── Donut de resumen ─────────────────────────────────────── */}
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <DonutSummary
              income={summary?.total_income_ars ?? 0}
              expenses={summary?.total_expenses_ars ?? 0}
              incomeUsd={summary?.total_income_usd ?? 0}
              expensesUsd={summary?.total_expenses_usd ?? 0}
              balance={summary?.net_balance_ars ?? 0}
              balanceUsd={summary?.net_balance_usd ?? 0}
              incomeColor={colors.income}
              expenseColor={colors.expense}
              balanceColor={balanceColor}
              surfaceColor={colors.outlineVariant + '40'}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
              textTertiary={colors.textTertiary}
            />
          </Card>

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
                  borderWidth: triggeredAlertCount > 0 ? 1 : 0,
                  borderColor: triggeredAlertCount > 0 ? colors.error : 'transparent',
                },
              ]}
              onPress={() => router.push('/budget-alerts')}
              accessibilityRole="button"
              accessibilityLabel={
                triggeredAlertCount > 0
                  ? `${triggeredAlertCount} alertas de balance activas`
                  : 'Ver alertas de balance'
              }
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={triggeredAlertCount > 0 ? colors.error : colors.primary}
              />
              <Text
                variant="labelMedium"
                style={{
                  color: triggeredAlertCount > 0 ? colors.error : colors.text,
                  marginLeft: spacing.xs,
                  fontWeight: triggeredAlertCount > 0 ? '600' : '400',
                }}
              >
                {triggeredAlertCount > 0
                  ? `${triggeredAlertCount} alerta${triggeredAlertCount > 1 ? 's' : ''}`
                  : 'Alertas'}
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
                Ingresos vs Egresos
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
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: colors.primary, width: 10, height: 3, borderRadius: 2 }]}
                />
                <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
                  Neto
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
              <View style={styles.chartContainer}>
                {(() => {
                  const barW = monthlyData.length <= 2 ? 30 : monthlyData.length <= 4 ? 22 : 16;
                  return (
                    <>
                      {/* Fila de montos sobre las barras */}
                      <View style={styles.chartRow}>
                        <View style={styles.yAxisSpacer} />
                        {monthlyData.map((month) => (
                          <View key={`top-${month.month}`} style={styles.monthColumn}>
                            <Text
                              variant="labelSmall"
                              style={[styles.barTopLabel, { color: colors.income }]}
                              numberOfLines={1}
                            >
                              {formatCompact(month.income)}
                            </Text>
                            <Text
                              variant="labelSmall"
                              style={[styles.barTopLabel, { color: colors.expense }]}
                              numberOfLines={1}
                            >
                              {formatCompact(month.expenses)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Eje Y + grilla + barras */}
                      <View style={styles.chartWithAxis}>
                        {/* Escala Y */}
                        <View style={styles.yAxis}>
                          {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                            <Text
                              key={`y-${pct}`}
                              variant="labelSmall"
                              style={[styles.yAxisLabel, { color: colors.textTertiary }]}
                              numberOfLines={1}
                            >
                              {monthlyMax > 0 ? formatCompact(monthlyMax * pct) : '0'}
                            </Text>
                          ))}
                        </View>

                        {/* Area de barras con grilla */}
                        <View style={styles.chartMainArea}>
                          {/* Lineas de grilla horizontales */}
                          {[0, 1, 2, 3, 4].map((i) => (
                            <View
                              key={`grid-${i}`}
                              style={[
                                styles.gridLine,
                                {
                                  backgroundColor: colors.outlineVariant + '50',
                                  top: (i / 4) * CHART_BAR_HEIGHT,
                                },
                              ]}
                            />
                          ))}

                          {/* Barras agrupadas por mes */}
                          <View style={styles.chartBarsArea}>
                            {monthlyData.map((month) => {
                              const incomeH = monthlyMax > 0 ? (month.income / monthlyMax) * CHART_BAR_HEIGHT : 0;
                              const expenseH = monthlyMax > 0 ? (month.expenses / monthlyMax) * CHART_BAR_HEIGHT : 0;

                              return (
                                <View key={month.month} style={styles.monthColumn}>
                                  <View style={[styles.monthBars, { gap: Math.max(barW * 0.15, 3) }]}>
                                    <View
                                      style={[
                                        styles.monthBar,
                                        {
                                          width: barW,
                                          height: Math.max(incomeH, 3),
                                          backgroundColor: colors.income,
                                        },
                                      ]}
                                    />
                                    <View
                                      style={[
                                        styles.monthBar,
                                        {
                                          width: barW,
                                          height: Math.max(expenseH, 3),
                                          backgroundColor: colors.expense,
                                        },
                                      ]}
                                    />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Fila de labels de mes */}
                      <View style={styles.chartRow}>
                        <View style={styles.yAxisSpacer} />
                        {monthlyData.map((month) => {
                          const net = month.income - month.expenses;
                          const netColor = net >= 0 ? colors.income : colors.expense;
                          return (
                            <View key={`lbl-${month.month}`} style={styles.monthColumn}>
                              <Text
                                variant="labelSmall"
                                style={[styles.monthLabel, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {month.label.split(' ')[0].slice(0, 3)}
                              </Text>
                              <Text
                                variant="labelSmall"
                                style={[styles.monthNet, { color: netColor }]}
                                numberOfLines={1}
                              >
                                {net >= 0 ? '+' : ''}{formatCompact(net)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}

                {/* Totales del periodo */}
                <View style={[styles.chartTotalsRow, { borderTopColor: colors.outlineVariant }]}>
                  <View style={styles.chartTotalItem}>
                    <MaterialCommunityIcons name="arrow-up-circle" size={14} color={colors.income} />
                    <Text variant="labelSmall" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                      Total:{' '}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.income, fontWeight: '600' }}>
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.income, 0))}
                    </Text>
                  </View>
                  <View style={styles.chartTotalItem}>
                    <MaterialCommunityIcons name="arrow-down-circle" size={14} color={colors.expense} />
                    <Text variant="labelSmall" style={{ color: colors.textSecondary, marginLeft: 4 }}>
                      Total:{' '}
                    </Text>
                    <Text variant="labelSmall" style={{ color: colors.expense, fontWeight: '600' }}>
                      {formatCurrency(monthlyData.reduce((s, m) => s + m.expenses, 0))}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* ── Balance por rubro ──────────────────────────────────────── */}
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="wallet-outline"
                size={22}
                color={colors.primary}
              />
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Balance por rubro
              </Text>
            </View>

            {categoryLoading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : activeBalances.length === 0 ? (
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
                  Sin rubros con movimientos
                </Text>
              </View>
            ) : (
              <View style={styles.categoryBalanceList}>
                {activeBalances.map((cat) => {
                  const barColor = cat.balance_ars >= 0 ? colors.income : colors.expense;
                  const barWidth = maxAbsBalance > 0
                    ? (Math.abs(cat.balance_ars) / maxAbsBalance) * 100
                    : 0;
                  const hasTransfers = cat.net_transfers_ars !== 0;

                  return (
                    <Pressable
                      key={cat.category_id}
                      style={styles.categoryBalanceRow}
                      onPress={() => router.push({
                        pathname: '/(tabs)/transactions',
                        params: { categoryId: cat.category_id },
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`${cat.category_name}: ${formatCurrency(cat.balance_ars)}`}
                    >
                      {/* Nombre y balance */}
                      <View style={styles.categoryBalanceHeader}>
                        <View style={styles.categoryBalanceNameRow}>
                          <View
                            style={[
                              styles.categoryBalanceDot,
                              { backgroundColor: cat.color ?? colors.primary },
                            ]}
                          />
                          <Text
                            variant="bodyMedium"
                            style={{ color: colors.text, flex: 1, fontWeight: '500' }}
                            numberOfLines={1}
                          >
                            {cat.category_name}
                          </Text>
                          <Text
                            variant="titleSmall"
                            style={{ color: barColor, fontWeight: '700' }}
                          >
                            {formatCurrency(cat.balance_ars)}
                          </Text>
                        </View>
                        {/* Detalle: ingresos, egresos, transferencias */}
                        <View style={styles.categoryBalanceDetail}>
                          <Text variant="labelSmall" style={{ color: colors.income }}>
                            +{formatCurrency(cat.total_income_ars)}
                          </Text>
                          <Text variant="labelSmall" style={{ color: colors.expense }}>
                            -{formatCurrency(cat.total_expenses_ars)}
                          </Text>
                          {hasTransfers && (
                            <Text
                              variant="labelSmall"
                              style={{ color: cat.net_transfers_ars >= 0 ? colors.income : colors.expense }}
                            >
                              {cat.net_transfers_ars >= 0 ? '+' : ''}{formatCurrency(cat.net_transfers_ars)} transf.
                            </Text>
                          )}
                        </View>
                      </View>
                      {/* Barra de balance */}
                      <View style={[styles.categoryBalanceBarBg, { backgroundColor: colors.outlineVariant + '40' }]}>
                        <View
                          style={[
                            styles.categoryBalanceBarFill,
                            {
                              backgroundColor: barColor,
                              width: `${Math.max(barWidth, 2)}%`,
                            },
                          ]}
                        />
                      </View>
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
  welcomeLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B1A1A',
    overflow: 'hidden',
    marginLeft: spacing.md,
  },
  welcomeLogo: {
    width: 48,
    height: 48,
  },

  // Donut de resumen
  donutCard: {
    // contenido del Card
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  donutContainer: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutDetails: {
    flex: 1,
    gap: spacing.sm,
  },
  donutDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  donutDetailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutDetailTexts: {
    flex: 1,
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

  // Leyenda del grafico mensual
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

  // Grafico mensual custom
  chartContainer: {
    gap: spacing.xs,
  },
  chartRow: {
    flexDirection: 'row',
  },
  yAxisSpacer: {
    width: 42,
  },
  chartWithAxis: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 42,
    height: CHART_BAR_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  yAxisLabel: {
    fontSize: 9,
    lineHeight: 11,
  },
  chartMainArea: {
    flex: 1,
    height: CHART_BAR_HEIGHT,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  chartBarsArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_BAR_HEIGHT,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTopLabel: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  monthBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  monthBar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 3,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  monthNet: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chartTotalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Balance por rubro
  categoryBalanceList: {
    gap: spacing.smd,
  },
  categoryBalanceRow: {
    gap: spacing.xs,
  },
  categoryBalanceHeader: {
    gap: spacing.xxs,
  },
  categoryBalanceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryBalanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryBalanceDetail: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingLeft: 20,
  },
  categoryBalanceBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBalanceBarFill: {
    height: '100%',
    borderRadius: 3,
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
