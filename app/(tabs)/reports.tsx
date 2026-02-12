import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { useReportSummary, useCategoryReport, useTransactionsForExport } from '@/src/features/reports/hooks/useReports';
import { exportTransactionsToExcel } from '@/src/features/reports/services/exportService';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { formatCurrency } from '@/src/core/utils/currency';
import { spacing } from '@/src/shared/theme';
import { TRANSACTION_TYPE_LABELS } from '@/src/core/config/constants';
import type { TransactionType } from '@/src/core/types/database';
import type { ReportFilters } from '@/src/features/reports/services/reportService';
import type { ExportTransaction } from '@/src/features/reports/services/exportService';

// ── Colores financieros ─────────────────────────────────────────────────────

const FINANCIAL_COLORS = {
  income: '#16a34a',
  expense: '#ef4444',
  transfer: '#3b82f6',
} as const;

// ── Fechas por defecto (ultimos 30 dias) ────────────────────────────────────

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
const defaultEndDate = today.toISOString().split('T')[0];

// ── Chips de tipo de transaccion ────────────────────────────────────────────

type FilterType = 'all' | TransactionType;

interface FilterChipItem {
  key: FilterType;
  label: string;
}

const FILTER_CHIPS: FilterChipItem[] = [
  { key: 'all', label: 'Todos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'expense', label: 'Egresos' },
  { key: 'transfer', label: 'Transferencias' },
];

// ── Componente principal ────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();

  // ── Estado de filtros (editables) ───────────────────────────────────────
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(true);

  // ── Filtros aplicados (solo se actualizan al presionar "Aplicar") ──────
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  // ── Queries de reportes ─────────────────────────────────────────────────
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useReportSummary(appliedFilters);

  const {
    data: categoryReport,
    isLoading: categoryLoading,
  } = useCategoryReport(appliedFilters);

  const {
    refetch: refetchExport,
    isFetching: exportFetching,
  } = useTransactionsForExport(appliedFilters);

  // ── Estado del tipo activo (para chips) ─────────────────────────────────
  const activeTypeFilter = useMemo<FilterType>(() => {
    return typeFilter ?? 'all';
  }, [typeFilter]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleTypeFilterChange = useCallback((key: FilterType) => {
    setTypeFilter(key === 'all' ? undefined : (key as TransactionType));
  }, []);

  const handleCategoryFilterChange = useCallback((catId: string | undefined) => {
    setCategoryFilter(catId);
  }, []);

  const handleApplyFilters = useCallback(() => {
    const filters: ReportFilters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (typeFilter) filters.type = typeFilter;
    if (categoryFilter) filters.categoryId = categoryFilter;
    setAppliedFilters(filters);
  }, [startDate, endDate, typeFilter, categoryFilter]);

  const handleClearFilters = useCallback(() => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setTypeFilter(undefined);
    setCategoryFilter(undefined);
    setAppliedFilters({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });
  }, []);

  const handleToggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const result = await refetchExport();
      const transactions = result.data;

      if (!transactions || transactions.length === 0) {
        Alert.alert('Sin datos', 'No hay transacciones para exportar con los filtros actuales.');
        return;
      }

      const exportData: ExportTransaction[] = transactions.map((t: any) => ({
        transaction_date: t.transaction_date,
        type: t.type,
        description: t.description,
        category_name: t.category?.name ?? 'Sin rubro',
        amount: t.amount,
        currency: t.currency,
        status: t.status,
      }));

      await exportTransactionsToExcel(exportData, {
        startDate,
        endDate,
        type: typeFilter,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrio un error inesperado al exportar.';
      Alert.alert('Error al exportar', message);
    }
  }, [refetchExport, startDate, endDate, typeFilter]);

  // ── Balance color dinamico ──────────────────────────────────────────────
  const balanceColor = useMemo(() => {
    if (!summary) return colors.text;
    if (summary.netBalance > 0) return FINANCIAL_COLORS.income;
    if (summary.netBalance < 0) return FINANCIAL_COLORS.expense;
    return colors.textSecondary;
  }, [summary, colors]);

  // ── Maximo absoluto para barras de progreso ─────────────────────────────
  const maxCategoryAmount = useMemo(() => {
    if (!categoryReport || categoryReport.length === 0) return 1;
    let max = 0;
    for (const item of categoryReport) {
      if (item.totalIncome > max) max = item.totalIncome;
      if (item.totalExpenses > max) max = item.totalExpenses;
    }
    return max || 1;
  }, [categoryReport]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Seccion de filtros (colapsable) ─────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            Filtros
          </Text>
          <Chip
            mode="outlined"
            onPress={handleToggleFilters}
            style={{ backgroundColor: colors.surface, borderColor: colors.outline }}
            textStyle={{ color: colors.textSecondary, fontSize: 12 }}
            icon={showFilters ? 'chevron-up' : 'chevron-down'}
            compact
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </Chip>
        </View>

        {showFilters && (
          <Card variant="outlined" padding="md" style={{ marginTop: spacing.sm }}>
            {/* Rango de fechas */}
            <Text variant="labelLarge" style={[styles.filterLabel, { color: colors.textSecondary }]}>
              Rango de fechas
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateInputWrapper}>
                <Text variant="labelSmall" style={{ color: colors.textTertiary, marginBottom: spacing.xxs }}>
                  Desde
                </Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      color: colors.text,
                      borderColor: colors.outline,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                />
              </View>
              <View style={styles.dateInputWrapper}>
                <Text variant="labelSmall" style={{ color: colors.textTertiary, marginBottom: spacing.xxs }}>
                  Hasta
                </Text>
                <TextInput
                  style={[
                    styles.dateInput,
                    {
                      color: colors.text,
                      borderColor: colors.outline,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                />
              </View>
            </View>

            {/* Tipo de transaccion */}
            <Text
              variant="labelLarge"
              style={[styles.filterLabel, { color: colors.textSecondary, marginTop: spacing.smd }]}
            >
              Tipo de movimiento
            </Text>
            <View style={styles.chipsRow}>
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeTypeFilter === chip.key;
                return (
                  <Chip
                    key={chip.key}
                    mode={isActive ? 'flat' : 'outlined'}
                    selected={isActive}
                    onPress={() => handleTypeFilterChange(chip.key)}
                    style={[
                      styles.chip,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.outline },
                    ]}
                    textStyle={[
                      styles.chipText,
                      { color: isActive ? colors.onPrimary : colors.textSecondary },
                    ]}
                    showSelectedOverlay={false}
                    showSelectedCheck={false}
                  >
                    {chip.label}
                  </Chip>
                );
              })}
            </View>

            {/* Filtro por rubro */}
            <Text
              variant="labelLarge"
              style={[styles.filterLabel, { color: colors.textSecondary, marginTop: spacing.smd }]}
            >
              Rubro
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <Chip
                mode={categoryFilter === undefined ? 'flat' : 'outlined'}
                selected={categoryFilter === undefined}
                onPress={() => handleCategoryFilterChange(undefined)}
                style={[
                  styles.chip,
                  categoryFilter === undefined
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={[
                  styles.chipText,
                  { color: categoryFilter === undefined ? colors.onPrimary : colors.textSecondary },
                ]}
                showSelectedOverlay={false}
                showSelectedCheck={false}
              >
                Todos los rubros
              </Chip>
              {categories?.map((cat) => {
                const isActive = categoryFilter === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    mode={isActive ? 'flat' : 'outlined'}
                    selected={isActive}
                    onPress={() => handleCategoryFilterChange(cat.id)}
                    style={[
                      styles.chip,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderColor: colors.outline },
                    ]}
                    textStyle={[
                      styles.chipText,
                      { color: isActive ? colors.onPrimary : colors.textSecondary },
                    ]}
                    showSelectedOverlay={false}
                    showSelectedCheck={false}
                    icon={cat.icon ? () => (
                      <MaterialCommunityIcons
                        name={(cat.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'folder'}
                        size={16}
                        color={isActive ? colors.onPrimary : (cat.color ?? colors.textSecondary)}
                      />
                    ) : undefined}
                  >
                    {cat.name}
                  </Chip>
                );
              })}
            </ScrollView>

            {/* Botones de accion */}
            <View style={styles.filterActions}>
              <Button variant="primary" size="md" onPress={handleApplyFilters} icon="filter-check">
                Aplicar filtros
              </Button>
              <Button variant="ghost" size="md" onPress={handleClearFilters}>
                Limpiar
              </Button>
            </View>
          </Card>
        )}
      </View>

      {/* ── Seccion de resumen ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Resumen
        </Text>

        {summaryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Calculando resumen...
            </Text>
          </View>
        ) : summaryError ? (
          <Card variant="outlined" padding="md">
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.error} />
              <Text variant="bodyMedium" style={{ color: colors.error, marginLeft: spacing.sm }}>
                Error al cargar el resumen
              </Text>
            </View>
          </Card>
        ) : !summary ? (
          <Card variant="outlined" padding="md">
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="chart-bar" size={24} color={colors.textTertiary} />
              <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginLeft: spacing.sm }}>
                Sin datos para el periodo seleccionado
              </Text>
            </View>
          </Card>
        ) : (
          <>
            <View style={styles.summaryCardsRow}>
              {/* Ingresos */}
              <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <View style={[styles.summaryIconBadge, { backgroundColor: FINANCIAL_COLORS.income + '18' }]}>
                    <MaterialCommunityIcons name="trending-up" size={18} color={FINANCIAL_COLORS.income} />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    Ingresos
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={[styles.summaryAmount, { color: FINANCIAL_COLORS.income }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(summary.totalIncome, summary.currency)}
                  </Text>
                </View>
              </Card>

              {/* Egresos */}
              <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <View style={[styles.summaryIconBadge, { backgroundColor: FINANCIAL_COLORS.expense + '18' }]}>
                    <MaterialCommunityIcons name="trending-down" size={18} color={FINANCIAL_COLORS.expense} />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    Egresos
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={[styles.summaryAmount, { color: FINANCIAL_COLORS.expense }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(summary.totalExpenses, summary.currency)}
                  </Text>
                </View>
              </Card>

              {/* Balance */}
              <Card variant="elevated" padding="sm" style={styles.summaryCard}>
                <View style={styles.summaryCardContent}>
                  <View style={[styles.summaryIconBadge, { backgroundColor: balanceColor + '18' }]}>
                    <MaterialCommunityIcons name="scale-balance" size={18} color={balanceColor} />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    Balance
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={[styles.summaryAmount, { color: balanceColor }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(summary.netBalance, summary.currency)}
                  </Text>
                </View>
              </Card>
            </View>

            {/* Chip de cantidad de movimientos */}
            <View style={styles.countChipRow}>
              <Chip
                mode="flat"
                style={{ backgroundColor: colors.surfaceVariant }}
                textStyle={{ color: colors.textSecondary, fontSize: 12 }}
                icon="receipt-text-outline"
                compact
              >
                {summary.transactionCount} movimiento{summary.transactionCount !== 1 ? 's' : ''}
              </Chip>
            </View>
          </>
        )}
      </View>

      {/* ── Seccion de desglose por rubro ───────────────────────────────── */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
          Desglose por rubro
        </Text>

        {categoryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              Cargando desglose...
            </Text>
          </View>
        ) : !categoryReport || categoryReport.length === 0 ? (
          <Card variant="outlined" padding="md">
            <View style={styles.emptyRow}>
              <MaterialCommunityIcons name="shape-outline" size={24} color={colors.textTertiary} />
              <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginLeft: spacing.sm }}>
                Sin datos de rubros para el periodo
              </Text>
            </View>
          </Card>
        ) : (
          <Card variant="elevated" padding="md">
            {categoryReport.map((item, index) => {
              const catColor = item.categoryColor ?? colors.textTertiary;
              const catIcon = (item.categoryIcon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'folder';
              const incomeWidth = (item.totalIncome / maxCategoryAmount) * 100;
              const expenseWidth = (item.totalExpenses / maxCategoryAmount) * 100;
              const balColor = item.netBalance >= 0 ? FINANCIAL_COLORS.income : FINANCIAL_COLORS.expense;

              return (
                <View key={item.categoryId}>
                  {index > 0 && (
                    <View style={[styles.categoryDivider, { backgroundColor: colors.outlineVariant }]} />
                  )}
                  <View style={styles.categoryRow}>
                    {/* Cabecera del rubro */}
                    <View style={styles.categoryHeader}>
                      <View style={[styles.categoryIconBadge, { backgroundColor: catColor + '18' }]}>
                        <MaterialCommunityIcons name={catIcon} size={18} color={catColor} />
                      </View>
                      <View style={styles.categoryNameCol}>
                        <Text
                          variant="titleSmall"
                          style={[styles.categoryName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {item.categoryName}
                        </Text>
                        <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
                          {item.transactionCount} mov.
                        </Text>
                      </View>
                      <Text variant="titleSmall" style={[styles.categoryBalance, { color: balColor }]}>
                        {formatCurrency(item.netBalance)}
                      </Text>
                    </View>

                    {/* Barras de progreso */}
                    <View style={styles.barsContainer}>
                      {/* Barra de ingresos */}
                      <View style={styles.barRow}>
                        <Text variant="labelSmall" style={[styles.barLabel, { color: FINANCIAL_COLORS.income }]}>
                          Ing.
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: FINANCIAL_COLORS.income,
                                width: `${Math.max(incomeWidth, 0)}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text variant="labelSmall" style={[styles.barAmount, { color: colors.textSecondary }]}>
                          {formatCurrency(item.totalIncome)}
                        </Text>
                      </View>

                      {/* Barra de egresos */}
                      <View style={styles.barRow}>
                        <Text variant="labelSmall" style={[styles.barLabel, { color: FINANCIAL_COLORS.expense }]}>
                          Egr.
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: FINANCIAL_COLORS.expense,
                                width: `${Math.max(expenseWidth, 0)}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text variant="labelSmall" style={[styles.barAmount, { color: colors.textSecondary }]}>
                          {formatCurrency(item.totalExpenses)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {/* ── Seccion de exportacion ──────────────────────────────────────── */}
      <View style={[styles.section, styles.exportSection]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon="file-excel-outline"
          onPress={handleExport}
          loading={exportFetching}
          disabled={exportFetching}
        >
          Exportar a Excel
        </Button>
      </View>
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Secciones ────────────────────────────────────────────────────────────
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
  },

  // ── Filtros ──────────────────────────────────────────────────────────────
  filterLabel: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    marginTop: spacing.md,
  },

  // ── Resumen ──────────────────────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryCard: {
    flex: 1,
  },
  summaryCardContent: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  summaryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  summaryAmount: {
    fontWeight: '700',
    textAlign: 'center',
  },
  countChipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.smd,
  },

  // ── Desglose por rubro ───────────────────────────────────────────────────
  categoryDivider: {
    height: 1,
    marginVertical: spacing.smd,
  },
  categoryRow: {
    gap: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNameCol: {
    flex: 1,
    gap: spacing.xxs,
  },
  categoryName: {
    fontWeight: '600',
  },
  categoryBalance: {
    fontWeight: '700',
  },
  barsContainer: {
    gap: spacing.xs,
    paddingLeft: spacing['2xl'],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 28,
    fontWeight: '600',
    fontSize: 11,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barAmount: {
    width: 80,
    textAlign: 'right',
    fontSize: 11,
  },

  // ── Exportacion ──────────────────────────────────────────────────────────
  exportSection: {
    marginTop: spacing.sm,
  },
});
