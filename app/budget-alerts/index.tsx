import { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Switch, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { useCategoryBalances } from '@/src/features/dashboard/hooks/useDashboard';
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
import type { BalanceAlertType } from '@/src/core/types/database';

// ── Labels de tipo de alerta ────────────────────────────────────────────────

const ALERT_TYPE_CONFIG: Record<BalanceAlertType, {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  description: string;
}> = {
  below: {
    label: 'Balance bajo',
    icon: 'arrow-down-circle-outline',
    description: 'Alertar cuando el balance baje de',
  },
  above: {
    label: 'Balance alto',
    icon: 'arrow-up-circle-outline',
    description: 'Alertar cuando el balance alcance o supere',
  },
};

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

  const { data: categories } = useCategories();
  const { data: categoryBalances } = useCategoryBalances();

  const upsertMutation = useUpsertBudgetAlert();
  const deleteMutation = useDeleteBudgetAlert();

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // ── Estado del formulario de nueva alerta ─────────────────────────────────

  const [showForm, setShowForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAlertType, setSelectedAlertType] = useState<BalanceAlertType>('below');
  const [thresholdInput, setThresholdInput] = useState('');

  // ── Mapa de estados por alert_id ──────────────────────────────────────────

  const statusMap = useMemo(() => {
    const map = new Map<string, typeof budgetStatuses extends (infer T)[] | undefined ? T : never>();
    budgetStatuses?.forEach((s) => map.set(s.alert_id, s));
    return map;
  }, [budgetStatuses]);

  // ── Mapa de balances por category_id ──────────────────────────────────────

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    categoryBalances?.forEach((b) => map.set(b.category_id, b.balance_ars));
    return map;
  }, [categoryBalances]);

  // ── Categorias disponibles para nueva alerta ──────────────────────────────

  const availableCategories = useMemo(() => {
    if (!categories) return [];
    const existingPairs = new Set(
      (alerts ?? []).map((a) => `${a.category_id}:${a.alert_type}`),
    );
    return categories.filter((c) => {
      // Mostrar categoria si al menos un tipo de alerta no esta configurado
      return (
        !existingPairs.has(`${c.id}:below`) ||
        !existingPairs.has(`${c.id}:above`)
      );
    });
  }, [categories, alerts]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleAlert = useCallback((alert: BudgetAlertWithCategory) => {
    upsertMutation.mutate({
      category_id: alert.category_id,
      alert_type: alert.alert_type,
      threshold_amount: alert.threshold_amount,
      is_active: !alert.is_active,
    });
  }, [upsertMutation]);

  const handleDeleteAlert = useCallback((alert: BudgetAlertWithCategory) => {
    hapticWarning();
    Alert.alert(
      'Eliminar alerta',
      `Deseas eliminar la alerta "${ALERT_TYPE_CONFIG[alert.alert_type].label}" de "${alert.category?.name ?? 'esta categoria'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(alert.id),
        },
      ],
    );
  }, [deleteMutation]);

  const handleCreateAlert = useCallback(() => {
    if (!selectedCategoryId) return;

    const amount = parseFloat(thresholdInput.replace(/[^\d.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto invalido', 'Ingresa un monto mayor a cero.');
      return;
    }

    upsertMutation.mutate(
      {
        category_id: selectedCategoryId,
        alert_type: selectedAlertType,
        threshold_amount: amount,
        is_active: true,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setSelectedCategoryId(null);
          setThresholdInput('');
        },
      },
    );
  }, [selectedCategoryId, selectedAlertType, thresholdInput, upsertMutation]);

  const handleRefresh = useCallback(() => {
    refetchAlerts();
    refetchStatus();
  }, [refetchAlerts, refetchStatus]);

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
          No tienes permisos para gestionar las alertas de balance.
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

  // ── Renderizar formulario de nueva alerta ─────────────────────────────────

  const renderForm = () => {
    if (!showForm) return null;

    return (
      <Card variant="elevated" padding="md" style={styles.formCard}>
        <Text
          variant="titleSmall"
          style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.smd }}
        >
          Nueva alerta de balance
        </Text>

        {/* Selector de categoria */}
        <Text
          variant="labelMedium"
          style={{ color: colors.textSecondary, marginBottom: spacing.xs }}
        >
          Rubro
        </Text>
        <View style={styles.categoryPicker}>
          {availableCategories.length === 0 ? (
            <Text variant="bodySmall" style={{ color: colors.textTertiary, padding: spacing.sm }}>
              Todos los rubros ya tienen alertas de ambos tipos.
            </Text>
          ) : (
            availableCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.outline,
                    },
                  ]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.icon && (
                    <MaterialCommunityIcons
                      name={cat.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={16}
                      color={isSelected ? colors.primary : cat.color ?? colors.textSecondary}
                    />
                  )}
                  <Text
                    variant="labelMedium"
                    style={{
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '600' : '400',
                      marginLeft: cat.icon ? spacing.xs : 0,
                    }}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {selectedCategoryId === cat.id && (
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.textTertiary, marginLeft: spacing.xs }}
                    >
                      (Balance: {formatCurrency(balanceMap.get(cat.id) ?? 0)})
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Selector de tipo de alerta */}
        <Text
          variant="labelMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.smd, marginBottom: spacing.xs }}
        >
          Tipo de alerta
        </Text>
        <View style={styles.alertTypeRow}>
          {(['below', 'above'] as BalanceAlertType[]).map((type) => {
            const config = ALERT_TYPE_CONFIG[type];
            const isSelected = selectedAlertType === type;
            // Check if this type is already configured for selected category
            const alreadyExists = selectedCategoryId
              ? (alerts ?? []).some((a) => a.category_id === selectedCategoryId && a.alert_type === type)
              : false;

            return (
              <Pressable
                key={type}
                style={[
                  styles.alertTypeChip,
                  {
                    backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceVariant,
                    borderColor: isSelected ? colors.primary : colors.outline,
                    opacity: alreadyExists ? 0.5 : 1,
                  },
                ]}
                onPress={() => !alreadyExists && setSelectedAlertType(type)}
                disabled={alreadyExists}
              >
                <MaterialCommunityIcons
                  name={config.icon}
                  size={20}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text
                  variant="labelMedium"
                  style={{
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                    marginLeft: spacing.xs,
                  }}
                >
                  {config.label}
                </Text>
                {alreadyExists && (
                  <Text variant="labelSmall" style={{ color: colors.textTertiary, marginLeft: spacing.xs }}>
                    (ya existe)
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Monto umbral */}
        <Text
          variant="labelMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.smd, marginBottom: spacing.xs }}
        >
          {ALERT_TYPE_CONFIG[selectedAlertType].description}
        </Text>
        <TextInput
          mode="outlined"
          value={thresholdInput}
          onChangeText={setThresholdInput}
          placeholder="Ej: 50000"
          keyboardType="numeric"
          left={<TextInput.Affix text="$" />}
          style={{ backgroundColor: colors.surface }}
        />

        {/* Botones */}
        <View style={styles.formButtons}>
          <Button
            variant="outline"
            size="sm"
            onPress={() => {
              setShowForm(false);
              setSelectedCategoryId(null);
              setThresholdInput('');
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={handleCreateAlert}
            loading={upsertMutation.isPending}
            disabled={!selectedCategoryId || !thresholdInput}
          >
            Crear alerta
          </Button>
        </View>
      </Card>
    );
  };

  // ── Renderizar cada alerta configurada ───────────────────────────────────

  const renderAlertItem = ({ item }: { item: BudgetAlertWithCategory }) => {
    const iconName = (item.category?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'tag-outline';
    const config = ALERT_TYPE_CONFIG[item.alert_type];
    const status = statusMap.get(item.id);
    const currentBalance = status?.current_balance ?? balanceMap.get(item.category_id) ?? 0;

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
              <View style={styles.alertTypeBadge}>
                <MaterialCommunityIcons
                  name={config.icon}
                  size={14}
                  color={item.alert_type === 'below' ? colors.error : colors.success}
                />
                <Text
                  variant="labelSmall"
                  style={{ color: colors.textSecondary, marginLeft: 4 }}
                >
                  {config.label}
                </Text>
              </View>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleAlert(item)}
            color={colors.primary}
          />
        </View>

        {/* Informacion de umbral y balance actual */}
        <View style={[styles.thresholdSection, { borderTopColor: colors.outlineVariant }]}>
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdItem}>
              <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
                Umbral
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.text, fontWeight: '700' }}
              >
                {formatCurrency(item.threshold_amount)}
              </Text>
            </View>
            <View style={styles.thresholdItem}>
              <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
                Balance actual
              </Text>
              <Text
                variant="titleSmall"
                style={{
                  color: status?.is_triggered ? colors.error : colors.success,
                  fontWeight: '700',
                }}
              >
                {formatCurrency(currentBalance)}
              </Text>
            </View>
          </View>

          {/* Indicador de estado */}
          {status && (
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: status.is_triggered
                  ? `${colors.error}15`
                  : `${colors.success}15`,
              },
            ]}>
              <MaterialCommunityIcons
                name={status.is_triggered ? 'bell-ring-outline' : 'bell-check-outline'}
                size={16}
                color={status.is_triggered ? colors.error : colors.success}
              />
              <Text
                variant="labelSmall"
                style={{
                  color: status.is_triggered ? colors.error : colors.success,
                  marginLeft: spacing.xs,
                  fontWeight: '600',
                }}
              >
                {status.is_triggered
                  ? (item.alert_type === 'below' ? 'Balance por debajo del umbral' : 'Balance alcanzo el umbral')
                  : 'Sin alertar'}
              </Text>
            </View>
          )}
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={alerts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={[
          styles.listContent,
          (!alerts || alerts.length === 0) && !showForm && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View>
            {/* Boton para crear nueva alerta */}
            {!showForm && (
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primaryContainer }]}
                onPress={() => setShowForm(true)}
              >
                <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                <Text
                  variant="labelLarge"
                  style={{ color: colors.primary, marginLeft: spacing.sm, fontWeight: '600' }}
                >
                  Nueva alerta de balance
                </Text>
              </Pressable>
            )}

            {/* Formulario */}
            {renderForm()}

            {/* Titulo de lista */}
            {(alerts ?? []).length > 0 && (
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  variant="titleMedium"
                  style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}
                >
                  Alertas configuradas
                </Text>
              </View>
            )}
          </View>
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
          showForm ? null : (
            <EmptyState
              icon="bell-alert-outline"
              title="Sin alertas configuradas"
              description="Crea alertas para recibir notificaciones cuando el balance de un rubro suba o baje de un monto determinado."
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
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

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // Form
  formCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  alertTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alertTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  // Alert cards
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
  alertTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  thresholdSection: {
    marginTop: spacing.smd,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdItem: {
    gap: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.smd,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.smd,
    paddingTop: spacing.smd,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
