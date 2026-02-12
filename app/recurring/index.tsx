import { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useRecurringTransactions, useToggleRecurring, useDeleteRecurring } from '@/src/features/recurring';
import type { RecurringWithCategory } from '@/src/features/recurring';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { formatCurrency } from '@/src/core/utils/currency';
import { useBiometric } from '@/src/features/security';
import { spacing } from '@/src/shared/theme';
import type { RecurrenceFrequency, TransactionType } from '@/src/core/types/database';

// ── Constantes ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<TransactionType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  income: 'trending-up',
  expense: 'trending-down',
  transfer: 'swap-horizontal',
};

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

// ── Componente ──────────────────────────────────────────────────────────────

export default function RecurringListScreen() {
  const { colors } = useAppTheme();
  const { data: items, isLoading, isRefetching, refetch } = useRecurringTransactions();
  const toggleMutation = useToggleRecurring();
  const deleteMutation = useDeleteRecurring();
  const { authenticate } = useBiometric();

  const handleToggle = useCallback(
    (item: RecurringWithCategory) => {
      toggleMutation.mutate({ id: item.id, isActive: !item.is_active });
    },
    [toggleMutation],
  );

  const handleDelete = useCallback(
    async (item: RecurringWithCategory) => {
      const authenticated = await authenticate('Confirma tu identidad para eliminar');
      if (!authenticated) return;

      Alert.alert(
        'Eliminar recurrente',
        `Eliminar "${item.description}"? No se eliminaran las transacciones ya creadas.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => deleteMutation.mutate(item.id),
          },
        ],
      );
    },
    [authenticate, deleteMutation],
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando recurrentes...
        </Text>
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="repeat"
          title="Sin transacciones recurrentes"
          description="Crea una transaccion recurrente para automatizar registros periodicos como cuotas, alquileres o suscripciones."
          actionLabel="Nueva recurrente"
          onAction={() => router.push('/recurring/new')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <RecurringCard
            item={item}
            colors={colors}
            onToggle={() => handleToggle(item)}
            onDelete={() => handleDelete(item)}
            onEdit={() => router.push(`/recurring/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <FAB
        icon="plus"
        label="Nueva"
        onPress={() => router.push('/recurring/new')}
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
      />
    </View>
  );
}

// ── Tarjeta de recurrente ───────────────────────────────────────────────────

interface RecurringCardProps {
  item: RecurringWithCategory;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function RecurringCard({ item, colors, onToggle, onDelete, onEdit }: RecurringCardProps) {
  const typeColor = colors[item.type as 'income' | 'expense' | 'transfer'];
  const typeIcon = TYPE_ICONS[item.type];
  const nextDate = new Date(item.next_execution);
  const formattedDate = `${nextDate.getDate().toString().padStart(2, '0')}/${(nextDate.getMonth() + 1).toString().padStart(2, '0')}/${nextDate.getFullYear()}`;

  return (
    <Card
      variant="elevated"
      padding="none"
      onPress={onEdit}
      style={!item.is_active ? { opacity: 0.6 } : undefined}
    >
      <View style={styles.cardContent}>
        {/* Indicador de color */}
        <View
          style={[
            styles.categoryIndicator,
            { backgroundColor: item.category?.color ?? colors.textTertiary },
          ]}
        />

        {/* Icono */}
        <View style={[styles.iconContainer, { backgroundColor: typeColor + '18' }]}>
          <MaterialCommunityIcons name={typeIcon} size={24} color={typeColor} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text
            variant="titleSmall"
            style={[styles.description, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }} numberOfLines={1}>
            {item.category?.name ?? 'Sin rubro'} · {FREQUENCY_LABELS[item.frequency]}
          </Text>
          <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
            Proxima: {formattedDate}
          </Text>
        </View>

        {/* Monto */}
        <View style={styles.amountContainer}>
          <Text variant="titleSmall" style={{ color: typeColor, fontWeight: '700' }}>
            {formatCurrency(item.amount, item.currency)}
          </Text>
          <View style={styles.actions}>
            <MaterialCommunityIcons
              name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
              size={22}
              color={item.is_active ? colors.warning : colors.primary}
              onPress={onToggle}
            />
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color={colors.error}
              onPress={onDelete}
            />
          </View>
        </View>
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
  },
  list: {
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
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 16,
  },
});
