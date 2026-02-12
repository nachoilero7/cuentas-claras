import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Text, Chip, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
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

// ── Colores financieros ─────────────────────────────────────────────────────

const FINANCIAL_COLORS = {
  income: '#16a34a',
  expense: '#ef4444',
  transfer: '#3b82f6',
} as const;

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
  const endDate = now.toISOString().split('T')[0]; // hoy YYYY-MM-DD

  if (filter === 'today') {
    return { startDate: endDate, endDate };
  }

  if (filter === 'week') {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    // Lunes como inicio de semana
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - diff);
    return { startDate: start.toISOString().split('T')[0], endDate };
  }

  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate };
  }

  // quarter - ultimos 3 meses
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { startDate: start.toISOString().split('T')[0], endDate };
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce de busqueda: actualizar 300ms despues de dejar de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // Usuarios no-admin solo ven sus propias transacciones
  const filters = useMemo(() => {
    const f: Record<string, any> = {};
    if (activeFilter !== 'all') {
      f.type = activeFilter as TransactionType;
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
  }, [activeFilter, activeDateFilter, isAdmin, user?.id, debouncedSearch]);

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
          {error instanceof Error ? error.message : 'Ocurrio un error inesperado.'}
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
          <FilterChips
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            colors={colors}
          />
          <View style={styles.dateChipsRow}>
            <DateFilterChips
              activeFilter={activeDateFilter}
              onFilterChange={setActiveDateFilter}
              colors={colors}
            />
          </View>
        </View>

        <EmptyState
          icon="receipt-text-outline"
          title="Sin movimientos"
          description={
            activeFilter === 'all'
              ? 'Registra tu primer movimiento para empezar a llevar el control de tus finanzas.'
              : `No hay ${FILTER_CHIPS.find((f) => f.key === activeFilter)?.label?.toLowerCase() ?? 'movimientos'} registrados.`
          }
          actionLabel={canCreate ? 'Nuevo movimiento' : undefined}
          onAction={canCreate ? handleNavigateToNew : undefined}
        />

        {canCreate && (
          <FAB
            icon="plus"
            label="Nuevo"
            onPress={handleNavigateToNew}
            style={[styles.fab, { backgroundColor: colors.primary }]}
            color={colors.onPrimary}
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
              />
              {searchQuery.length > 0 && (
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                  onPress={() => setSearchQuery('')}
                />
              )}
            </View>

            <FilterChips
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              colors={colors}
            />
            <DateFilterChips
              activeFilter={activeDateFilter}
              onFilterChange={setActiveDateFilter}
              colors={colors}
            />
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
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            colors={colors}
            onPress={() => handleNavigateToDetail(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {canCreate && (
        <FAB
          icon="plus"
          label="Nuevo"
          onPress={handleNavigateToNew}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
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
          <Chip
            key={chip.key}
            mode={isActive ? 'flat' : 'outlined'}
            selected={isActive}
            onPress={() => onFilterChange(chip.key)}
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
          <Chip
            key={chip.key}
            mode={isActive ? 'flat' : 'outlined'}
            selected={isActive}
            onPress={() => onFilterChange(chip.key)}
            icon={chip.icon}
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
  );
}

// ── Tarjeta de movimiento ───────────────────────────────────────────────────

interface TransactionCardProps {
  transaction: TransactionWithCategory;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: () => void;
}

function TransactionCard({ transaction, colors, onPress }: TransactionCardProps) {
  const typeColor = FINANCIAL_COLORS[transaction.type];
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

          <View style={styles.metaRow}>
            <Text
              variant="labelSmall"
              style={{ color: colors.textTertiary }}
            >
              {formatDate(transaction.transaction_date)}
            </Text>
            {transaction.payment_method && (
              <View style={styles.paymentMethodBadge}>
                <MaterialCommunityIcons
                  name={PAYMENT_METHOD_ICONS[transaction.payment_method] as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={12}
                  color={colors.textTertiary}
                />
                <Text
                  variant="labelSmall"
                  style={{ color: colors.textTertiary, fontSize: 10 }}
                >
                  {PAYMENT_METHOD_LABELS[transaction.payment_method]}
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
              style={{ color: '#f59e0b', fontWeight: '600', fontSize: 10 }}
            >
              Pendiente
            </Text>
          ) : transaction.status === 'rejected' ? (
            <Text
              variant="labelSmall"
              style={{ color: '#ef4444', fontWeight: '600', fontSize: 10 }}
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
}

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
  },
  filtersWrapper: {
    paddingBottom: spacing.sm,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateChipsRow: {
    marginTop: spacing.sm,
  },
  chip: {
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
