export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { usePersistedState } from '@/src/shared/hooks/usePersistedState';
import { useReportSummary, useCategoryReport, useTransactionsForExport } from '@/src/features/reports/hooks/useReports';
import { exportTransactionsToExcel } from '@/src/features/reports/services/exportService';
import { exportReportToPdf } from '@/src/features/reports/services/exportPdfService';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { formatCurrency } from '@/src/core/utils/currency';
import { spacing } from '@/src/shared/theme';
import { TRANSACTION_TYPE_LABELS } from '@/src/core/config/constants';
import type { TransactionType } from '@/src/core/types/database';
import type { ReportFilters } from '@/src/features/reports/services/reportService';
import type { ExportTransaction } from '@/src/features/reports/services/exportService';

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

// ── Presets de fechas rapidas ───────────────────────────────────────────────

interface DatePreset {
  key: string;
  label: string;
  getRange: () => { start: string; end: string };
}

const DATE_PRESETS: DatePreset[] = [
  {
    key: 'this_month',
    label: 'Este mes',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'last_month',
    label: 'Mes pasado',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'last_3_months',
    label: 'Ultimos 3 meses',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'this_year',
    label: 'Este año',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    },
  },
];

// ── Componente principal ────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();

  // ── Estado de filtros (editables) ───────────────────────────────────────
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [typeFilter, setTypeFilter] = usePersistedState<TransactionType | undefined>('report-type-filter', undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = usePersistedState<string | undefined>('report-date-preset', undefined);
  const [showFilters, setShowFilters] = usePersistedState<boolean>('report-show-filters', true);

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

  const handlePresetSelect = useCallback((preset: DatePreset) => {
    const { start, end } = preset.getRange();
    setStartDate(start);
    setEndDate(end);
    setSelectedPreset(preset.key);
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

  const [pdfExporting, setPdfExporting] = useState(false);

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
        payment_method: t.payment_method ?? null,
        destination_alias: t.destination_alias ?? undefined,
        created_by_name: t.creator?.display_name || t.creator?.full_name || undefined,
        transfer_to_category_name: t.transfer_to_category?.name ?? undefined,
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

  const handleExportPdf = useCallback(async () => {
    setPdfExporting(true);
    try {
      const result = await refetchExport();
      const transactions = result.data;

      if (!transactions || transactions.length === 0) {
        Alert.alert('Sin datos', 'No hay transacciones para generar el reporte PDF.');
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
        payment_method: t.payment_method ?? null,
        destination_alias: t.destination_alias ?? undefined,
        created_by_name: t.creator?.display_name || t.creator?.full_name || undefined,
        transfer_to_category_name: t.transfer_to_category?.name ?? undefined,
      }));

      if (!summary) {
        Alert.alert('Sin resumen', 'Espera a que se cargue el resumen antes de exportar.');
        return;
      }

      await exportReportToPdf({
        summary,
        categoryReport: categoryReport ?? [],
        transactions: exportData,
        filters: {
          startDate,
          endDate,
          type: typeFilter,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrio un error inesperado al generar el PDF.';
      Alert.alert('Error al exportar PDF', message);
    } finally {
      setPdfExporting(false);
    }
  }, [refetchExport, summary, categoryReport, startDate, endDate, typeFilter]);

  // ── Balance color dinamico ──────────────────────────────────────────────
  const balanceColor = useMemo(() => {
    if (!summary) return colors.text;
    if (summary.netBalance > 0) return colors.income;
    if (summary.netBalance < 0) return colors.expense;
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
          <Pressable
            onPress={handleToggleFilters}
            accessibilityRole="button"
            style={[styles.toggleChip, { backgroundColor: colors.surface, borderColor: colors.outline }]}
          >
            <MaterialCommunityIcons
              name={showFilters ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        </View>

        {showFilters && (
          <Card variant="outlined" padding="md" style={{ marginTop: spacing.sm }}>
            {/* Periodo rapido */}
            <View style={styles.filterLabelRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>
                Periodo
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {DATE_PRESETS.map((preset) => {
                const isActive = selectedPreset === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    onPress={() => handlePresetSelect(preset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={[
                      styles.chip,
                      isActive
                        ? { backgroundColor: colors.info + 'E6' }
                        : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Rango de fechas */}
            <View style={[styles.filterLabelRow, { marginTop: spacing.smd }]}>
              <MaterialCommunityIcons name="calendar-range" size={14} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>
                Rango personalizado
              </Text>
            </View>
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
                  onChangeText={(text) => { setStartDate(text); setSelectedPreset(undefined); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                  keyboardType="number-pad"
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
                  onChangeText={(text) => { setEndDate(text); setSelectedPreset(undefined); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={10}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Tipo de transaccion */}
            <View style={[styles.filterLabelRow, { marginTop: spacing.smd }]}>
              <MaterialCommunityIcons name="shape-outline" size={14} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>
                Tipo
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {FILTER_CHIPS.map((chip) => {
                const isActive = activeTypeFilter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => handleTypeFilterChange(chip.key)}
                    accessibilityLabel={`Filtro tipo: ${chip.label}${isActive ? ', seleccionado' : ''}`}
                    accessibilityState={{ selected: isActive }}
                    accessibilityRole="button"
                    style={[
                      styles.chip,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Filtro por rubro */}
            <View style={[styles.filterLabelRow, { marginTop: spacing.smd }]}>
              <MaterialCommunityIcons name="tag-outline" size={14} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>
                Rubro
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <Pressable
                onPress={() => handleCategoryFilterChange(undefined)}
                accessibilityRole="button"
                accessibilityState={{ selected: categoryFilter === undefined }}
                style={[
                  styles.chip,
                  categoryFilter === undefined
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: categoryFilter === undefined ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  Todos
                </Text>
              </Pressable>
              {categories?.map((cat) => {
                const isActive = categoryFilter === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => handleCategoryFilterChange(cat.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    style={[
                      styles.chipWithIcon,
                      isActive
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
                    ]}
                  >
                    {cat.icon && (
                      <MaterialCommunityIcons
                        name={(cat.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'folder'}
                        size={14}
                        color={isActive ? colors.onPrimary : (cat.color ?? colors.textSecondary)}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        { color: isActive ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
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
                  <View style={[styles.summaryIconBadge, { backgroundColor: colors.income + '18' }]}>
                    <MaterialCommunityIcons name="trending-up" size={18} color={colors.income} />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    Ingresos
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={[styles.summaryAmount, { color: colors.income }]}
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
                  <View style={[styles.summaryIconBadge, { backgroundColor: colors.expense + '18' }]}>
                    <MaterialCommunityIcons name="trending-down" size={18} color={colors.expense} />
                  </View>
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
                    Egresos
                  </Text>
                  <Text
                    variant="titleSmall"
                    style={[styles.summaryAmount, { color: colors.expense }]}
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

            {/* Badge de cantidad de movimientos */}
            <View style={styles.countChipRow}>
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceVariant }]}>
                <MaterialCommunityIcons name="receipt-text-outline" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {summary.transactionCount} movimiento{summary.transactionCount !== 1 ? 's' : ''}
                </Text>
              </View>
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
              const balColor = item.netBalance >= 0 ? colors.income : colors.expense;

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
                        <Text variant="labelSmall" style={[styles.barLabel, { color: colors.income }]}>
                          Ing.
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: colors.income,
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
                        <Text variant="labelSmall" style={[styles.barLabel, { color: colors.expense }]}>
                          Egr.
                        </Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                backgroundColor: colors.expense,
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
          icon="file-pdf-box"
          onPress={handleExportPdf}
          loading={pdfExporting}
          disabled={pdfExporting || !summary}
        >
          Exportar a PDF
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          icon="file-excel-outline"
          onPress={handleExport}
          loading={exportFetching}
          disabled={exportFetching || pdfExporting || !summary}
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
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    gap: spacing.xs,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  chipWithIcon: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  toggleChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  countBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    gap: spacing.smd,
  },
});
