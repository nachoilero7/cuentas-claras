export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';
import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { startOfWeek, startOfMonth, subMonths, format } from 'date-fns';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { sanitizeErrorMessage } from '@/src/core/utils/errorMessages';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { useTransactions } from '@/src/features/transactions/hooks/useTransactions';
import type { TransactionWithCategory } from '@/src/features/transactions/services/transactionService';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { formatCurrency } from '@/src/core/utils/currency';
import { formatDate } from '@/src/core/utils/date';
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '@/src/core/config/constants';
import { spacing } from '@/src/shared/theme';
import type { TransactionType, CurrencyCode } from '@/src/core/types/database';

// ── Configuracion de iconos por tipo ────────────────────────────────────────

const TYPE_ICONS: Record<TransactionType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  income: 'trending-up',
  expense: 'trending-down',
  transfer: 'swap-horizontal',
};

// ── Filtros ─────────────────────────────────────────────────────────────────

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

// ── Filtros rapidos de fecha ────────────────────────────────────────────────

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'quarter';

interface DateFilterChipItem {
  key: DateFilter;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const DATE_FILTER_CHIPS: DateFilterChipItem[] = [
  { key: 'all', label: 'Todo', icon: 'calendar-blank' },
  { key: 'today', label: 'Hoy', icon: 'calendar-today' },
  { key: 'week', label: 'Semana', icon: 'calendar-week' },
  { key: 'month', label: 'Mes', icon: 'calendar-month' },
  { key: 'quarter', label: 'Trimestre', icon: 'calendar-range' },
];

function getDateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  if (filter === 'all') return {};

  const now = new Date();
  const endDate = format(now, 'yyyy-MM-dd');

  if (filter === 'today') {
    return { startDate: endDate, endDate };
  }

  if (filter === 'week') {
    // Lunes como inicio de semana
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return { startDate: format(start, 'yyyy-MM-dd'), endDate };
  }

  if (filter === 'month') {
    const start = startOfMonth(now);
    return { startDate: format(start, 'yyyy-MM-dd'), endDate };
  }

  // quarter - ultimos 3 meses
  const start = startOfMonth(subMonths(now, 2));
  return { startDate: format(start, 'yyyy-MM-dd'), endDate };
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const params = useLocalSearchParams<{ categoryId?: string; type?: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (params.type as FilterType) || 'all'
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(
    params.categoryId || undefined
  );
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Al presionar el tab directamente, limpiar todos los filtros
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setActiveFilter('all');
      setActiveDateFilter('all');
      setActiveCategoryId(undefined);
      setSearchQuery('');
      setDebouncedSearch('');
    });
    return unsubscribe;
  }, [navigation]);

  // Sincronizar filtros con params de navegacion (ej: desde dashboard con categoryId)
  useEffect(() => {
    setActiveCategoryId(params.categoryId || undefined);
  }, [params.categoryId]);

  useEffect(() => {
    if (params.type) {
      setActiveFilter(params.type as FilterType);
    }
  }, [params.type]);

  // Debounce de busqueda: actualizar 300ms despues de dejar de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.is_active);
  }, [categories]);

  const activeCategoryName = useMemo(() => {
    if (!activeCategoryId || !activeCategories.length) return undefined;
    return activeCategories.find((c) => c.id === activeCategoryId)?.name;
  }, [activeCategoryId, activeCategories]);

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // Usuarios no-admin solo ven sus propias transacciones
  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (activeFilter !== 'all') {
      f.type = activeFilter as TransactionType;
    }
    if (activeCategoryId) {
      f.categoryId = activeCategoryId;
    }
    if (!isAdmin && user?.id) {
      f.createdBy = user.id;
    }
    if (debouncedSearch.trim()) {
      f.search = debouncedSearch.trim();
    }
    // Filtros de fecha
    const dateRange = getDateRange(activeDateFilter);
    if (dateRange.startDate) f.startDate = dateRange.startDate;
    if (dateRange.endDate) f.endDate = dateRange.endDate;

    return Object.keys(f).length > 0 ? f : undefined;
  }, [activeFilter, activeCategoryId, activeDateFilter, isAdmin, user?.id, debouncedSearch]);

  const { data: transactions, isLoading, error, refetch } = useTransactions(filters);

  // All authenticated users can create transactions
  const canCreate = true;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNavigateToNew = useCallback(() => {
    router.push('/transactions/new');
  }, []);

  const handleNavigateToDetail = useCallback((id: string) => {
    router.push(`/transactions/${id}`);
  }, []);

  const renderTransaction = useCallback(
    ({ item }: { item: TransactionWithCategory }) => (
      <TransactionCard
        transaction={item}
        colors={colors}
        onPress={() => handleNavigateToDetail(item.id)}
      />
    ),
    [colors, handleNavigateToDetail],
  );

  const keyExtractor = useCallback((item: TransactionWithCategory) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // ── Estado de carga ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={[styles.loadingText, { color: colors.textSecondary }]}
        >
          Cargando movimientos...
        </Text>
      </View>
    );
  }

  // ── Estado de error ─────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.error}
        />
        <Text
          variant="bodyLarge"
          style={[styles.errorTitle, { color: colors.text }]}
        >
          Error al cargar movimientos
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.errorMessage, { color: colors.textSecondary }]}
        >
          {sanitizeErrorMessage(error)}
        </Text>
        <Button variant="primary" size="md" onPress={handleRefresh} icon="refresh">
          Reintentar
        </Button>
      </View>
    );
  }

  // ── Estado vacio ────────────────────────────────────────────────────────

  if (!transactions || transactions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterSection}>
            <View style={styles.filterLabelRow}>
              <MaterialCommunityIcons name="shape-outline" size={12} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Tipo</Text>
            </View>
            <FilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} colors={colors} />
          </View>
          <View style={styles.filterSection}>
            <View style={styles.filterLabelRow}>
              <MaterialCommunityIcons name="calendar-outline" size={12} color={colors.textTertiary} />
              <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Periodo</Text>
            </View>
            <DateFilterChips activeFilter={activeDateFilter} onFilterChange={setActiveDateFilter} colors={colors} />
          </View>
          {activeCategories.length > 0 && (
            <View style={styles.filterSection}>
              <View style={styles.filterLabelRow}>
                <MaterialCommunityIcons name="tag-outline" size={12} color={colors.textTertiary} />
                <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Rubro</Text>
              </View>
              <CategoryFilterChips
                categories={activeCategories}
                activeCategoryId={activeCategoryId}
                onCategoryChange={setActiveCategoryId}
                colors={colors}
              />
            </View>
          )}
        </View>

        <EmptyState
          icon={
            debouncedSearch || activeFilter !== 'all' || activeDateFilter !== 'all' || activeCategoryId
              ? 'magnify-close'
              : 'receipt-text-outline'
          }
          title={
            debouncedSearch || activeFilter !== 'all' || activeDateFilter !== 'all' || activeCategoryId
              ? 'Sin resultados'
              : 'Sin movimientos'
          }
          description={
            debouncedSearch
              ? `No se encontraron movimientos para "${debouncedSearch}".`
              : activeCategoryId && activeCategoryName
                ? `No hay movimientos en el rubro "${activeCategoryName}"${activeFilter !== 'all' ? ` de tipo ${FILTER_CHIPS.find(f => f.key === activeFilter)?.label?.toLowerCase() ?? activeFilter}` : ''}${activeDateFilter !== 'all' ? ` en este periodo` : ''}.`
                : activeFilter !== 'all' || activeDateFilter !== 'all'
                  ? 'No hay movimientos que coincidan con los filtros aplicados.'
                  : 'Registra tu primer movimiento para empezar a llevar el control de tus finanzas.'
          }
          actionLabel={
            (activeFilter !== 'all' || activeDateFilter !== 'all' || activeCategoryId || debouncedSearch)
              ? 'Limpiar filtros'
              : canCreate ? 'Nuevo movimiento' : undefined
          }
          onAction={
            (activeFilter !== 'all' || activeDateFilter !== 'all' || activeCategoryId || debouncedSearch)
              ? () => {
                  setActiveFilter('all');
                  setActiveDateFilter('all');
                  setActiveCategoryId(undefined);
                  setSearchQuery('');
                }
              : canCreate ? handleNavigateToNew : undefined
          }
        />

        {canCreate && (
          <FAB
            icon="plus"
            label="Nuevo"
            onPress={handleNavigateToNew}
            style={[styles.fab, { backgroundColor: colors.primary }]}
            color={colors.onPrimary}
            accessibilityLabel="Crear nuevo movimiento"
          />
        )}
      </View>
    );
  }

  // ── Lista de movimientos ────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderTransaction}
        ItemSeparatorComponent={ItemSeparator}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <View style={styles.filtersWrapper}>
            {/* Barra de busqueda */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: colors.surface, borderColor: colors.outline },
              ]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar por descripcion..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                accessibilityLabel="Buscar movimientos"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  accessibilityLabel="Limpiar busqueda"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              )}
            </View>

            {/* Filtros de tipo */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelRow}>
                <MaterialCommunityIcons name="shape-outline" size={12} color={colors.textTertiary} />
                <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Tipo</Text>
              </View>
              <FilterChips activeFilter={activeFilter} onFilterChange={(f) => { setActiveFilter(f); }} colors={colors} />
            </View>

            {/* Filtros de periodo */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelRow}>
                <MaterialCommunityIcons name="calendar-outline" size={12} color={colors.textTertiary} />
                <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Periodo</Text>
              </View>
              <DateFilterChips activeFilter={activeDateFilter} onFilterChange={setActiveDateFilter} colors={colors} />
            </View>

            {/* Filtro de rubro */}
            {activeCategories.length > 0 && (
              <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                  <MaterialCommunityIcons name="tag-outline" size={12} color={colors.textTertiary} />
                  <Text variant="labelSmall" style={[styles.filterSectionLabel, { color: colors.textTertiary }]}>Rubro</Text>
                </View>
                <CategoryFilterChips
                  categories={activeCategories}
                  activeCategoryId={activeCategoryId}
                  onCategoryChange={setActiveCategoryId}
                  colors={colors}
                />
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {canCreate && (
        <FAB
          icon="plus"
          label="Nuevo"
          onPress={handleNavigateToNew}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
          accessibilityLabel="Crear nuevo movimiento"
        />
      )}
    </View>
  );
}

// ── Filtro de chips ─────────────────────────────────────────────────────────

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function FilterChips({ activeFilter, onFilterChange, colors }: FilterChipsProps) {
  return (
    <View style={styles.chipsRow}>
      {FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.key;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onFilterChange(chip.key)}
            accessibilityLabel={`Filtro: ${chip.label}${isActive ? ', seleccionado' : ''}`}
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
  );
}

// ── Filtro de chips de fecha ────────────────────────────────────────────────

interface DateFilterChipsProps {
  activeFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function DateFilterChips({ activeFilter, onFilterChange, colors }: DateFilterChipsProps) {
  return (
    <View style={styles.chipsRow}>
      {DATE_FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.key;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onFilterChange(chip.key)}
            accessibilityLabel={`Periodo: ${chip.label}${isActive ? ', seleccionado' : ''}`}
            accessibilityState={{ selected: isActive }}
            accessibilityRole="button"
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
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Filtro de chips de rubro ─────────────────────────────────────────────────

interface CategoryFilterChipsProps {
  categories: { id: string; name: string; color: string | null }[];
  activeCategoryId: string | undefined;
  onCategoryChange: (id: string | undefined) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function CategoryFilterChips({ categories, activeCategoryId, onCategoryChange, colors }: CategoryFilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      <Pressable
        onPress={() => onCategoryChange(undefined)}
        accessibilityLabel={`Rubro: Todos${!activeCategoryId ? ', seleccionado' : ''}`}
        accessibilityState={{ selected: !activeCategoryId }}
        accessibilityRole="button"
        style={[
          styles.chip,
          !activeCategoryId
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: !activeCategoryId ? colors.onPrimary : colors.textSecondary },
          ]}
        >
          Todos
        </Text>
      </Pressable>
      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        const catColor = cat.color ?? colors.primary;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onCategoryChange(isActive ? undefined : cat.id)}
            accessibilityLabel={`Rubro: ${cat.name}${isActive ? ', seleccionado' : ''}`}
            accessibilityState={{ selected: isActive }}
            accessibilityRole="button"
            style={[
              styles.chip,
              isActive
                ? { backgroundColor: catColor }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
            ]}
          >
            {isActive && (
              <View style={[styles.categoryDot, { backgroundColor: colors.onPrimary }]} />
            )}
            {!isActive && cat.color && (
              <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
            )}
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#FFFFFF' : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ── Tarjeta de movimiento ───────────────────────────────────────────────────

interface TransactionCardProps {
  transaction: TransactionWithCategory;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: () => void;
}

const TransactionCard = memo(function TransactionCard({ transaction, colors, onPress }: TransactionCardProps) {
  const typeColor = colors[transaction.type];
  const typeIcon = TYPE_ICONS[transaction.type];
  const categoryColor = transaction.category?.color ?? colors.textTertiary;
  const categoryName = transaction.category?.name ?? 'Sin rubro';

  // Formatear monto con signo
  const amountPrefix = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '';
  const formattedAmount = `${amountPrefix}${formatCurrency(transaction.amount, transaction.currency)}`;

  // Para transferencias, mostrar rubro destino
  const subtitle = transaction.type === 'transfer' && transaction.transfer_to_category
    ? `${categoryName} → ${transaction.transfer_to_category.name}`
    : categoryName;

  return (
    <Card variant="elevated" padding="none" onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Indicador de color del rubro */}
        <View
          style={[
            styles.categoryIndicator,
            { backgroundColor: categoryColor },
          ]}
        />

        {/* Icono del tipo de movimiento */}
        <View
          style={[
            styles.typeIconContainer,
            { backgroundColor: typeColor + '18' },
          ]}
        >
          <MaterialCommunityIcons
            name={typeIcon}
            size={24}
            color={typeColor}
          />
        </View>

        {/* Informacion del movimiento */}
        <View style={styles.cardInfo}>
          <Text
            variant="titleSmall"
            style={[styles.description, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>

          <Text
            variant="bodySmall"
            style={{ color: colors.textSecondary }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>

          <View style={styles.metaColumn}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={11} color={colors.textTertiary} />
              <Text variant="labelSmall" style={{ color: colors.textTertiary, fontSize: 10 }}>
                {formatDate(transaction.transaction_date)}
              </Text>
            </View>
            {transaction.creator && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="account-outline" size={11} color={colors.textTertiary} />
                <Text variant="labelSmall" style={{ color: colors.textTertiary, fontSize: 10 }} numberOfLines={1}>
                  {transaction.creator.display_name || transaction.creator.full_name}
                </Text>
              </View>
            )}
            {transaction.payment_method && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name={PAYMENT_METHOD_ICONS[transaction.payment_method] as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={11}
                  color={colors.textTertiary}
                />
                <Text variant="labelSmall" style={{ color: colors.textTertiary, fontSize: 10 }}>
                  {PAYMENT_METHOD_LABELS[transaction.payment_method]}
                </Text>
              </View>
            )}
            {transaction.destination_alias && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="arrow-right" size={11} color={colors.textTertiary} />
                <Text variant="labelSmall" style={{ color: colors.textTertiary, fontSize: 10 }} numberOfLines={1}>
                  {transaction.destination_alias}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Monto y estado */}
        <View style={styles.amountContainer}>
          <Text
            variant="titleSmall"
            style={[styles.amount, { color: typeColor }]}
            numberOfLines={1}
          >
            {formattedAmount}
          </Text>
          {transaction.status === 'pending' ? (
            <Text
              variant="labelSmall"
              style={{ color: colors.warning, fontWeight: '600', fontSize: 10 }}
            >
              Pendiente
            </Text>
          ) : transaction.status === 'rejected' ? (
            <Text
              variant="labelSmall"
              style={{ color: colors.error, fontWeight: '600', fontSize: 10 }}
            >
              Rechazada
            </Text>
          ) : (
            <Text
              variant="labelSmall"
              style={[styles.typeLabel, { color: typeColor + '99' }]}
            >
              {TRANSACTION_TYPE_LABELS[transaction.type]}
            </Text>
          )}
        </View>

        {/* Flecha de navegacion */}
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.textTertiary}
        />
      </View>
    </Card>
  );
});

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.smd,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  errorTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.smd,
    gap: spacing.sm,
  },
  filtersWrapper: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.smd,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xxs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterSection: {
    gap: spacing.xxs,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.xxs,
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row' as const,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.smd,
    gap: spacing.smd,
  },
  categoryIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: '10%',
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  description: {
    fontWeight: '600',
  },
  metaColumn: {
    gap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  amount: {
    fontWeight: '700',
  },
  typeLabel: {
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 16,
  },
});
