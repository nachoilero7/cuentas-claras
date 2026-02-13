export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
} from 'date-fns';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useAuditLogs } from '@/src/features/audit/hooks/useAuditLogs';
import type { AuditLogFilters, AuditLogWithUser } from '@/src/features/audit/services/auditService';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { formatDateTime } from '@/src/core/utils/date';
import { spacing } from '@/src/shared/theme';
import type { AuditAction } from '@/src/core/types/database';

// ── Constantes ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Crear',
  update: 'Actualizar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  login: 'Inicio sesion',
  logout: 'Cierre sesion',
  role_change: 'Cambio de rol',
  permission_change: 'Cambio de permiso',
  export: 'Exportar',
};

const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  create: '#4CAF50',
  update: '#2196F3',
  delete: '#F44336',
  approve: '#FF9800',
  reject: '#E91E63',
  login: '#607D8B',
  logout: '#607D8B',
  role_change: '#9C27B0',
  permission_change: '#9C27B0',
  export: '#795548',
};

const AUDIT_ACTION_ICONS: Record<AuditAction, string> = {
  create: 'plus-circle-outline',
  update: 'pencil-outline',
  delete: 'delete-outline',
  approve: 'check-circle-outline',
  reject: 'close-circle-outline',
  login: 'login',
  logout: 'logout',
  role_change: 'shield-account',
  permission_change: 'lock-outline',
  export: 'export',
};

const AUDIT_TABLE_LABELS: Record<string, string> = {
  transactions: 'Transacciones',
  categories: 'Categorias',
  profiles: 'Perfiles',
  approval_requests: 'Aprobaciones',
};

// ── Opciones de filtro ──────────────────────────────────────────────────────

const ACTION_FILTERS: { key: AuditAction | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'create', label: 'Crear' },
  { key: 'update', label: 'Actualizar' },
  { key: 'delete', label: 'Eliminar' },
  { key: 'approve', label: 'Aprobar' },
  { key: 'reject', label: 'Rechazar' },
];

const TABLE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'transactions', label: 'Transacciones' },
  { key: 'categories', label: 'Categorias' },
  { key: 'profiles', label: 'Perfiles' },
];

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'quarter';

const DATE_FILTERS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'quarter', label: 'Trimestre' },
];

function getDateFilterStart(preset: DatePreset): string | undefined {
  if (preset === 'all') return undefined;
  const now = new Date();
  switch (preset) {
    case 'today':
      return startOfDay(now).toISOString();
    case 'week':
      return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    case 'month':
      return startOfMonth(now).toISOString();
    case 'quarter':
      return startOfQuarter(now).toISOString();
  }
}

// ── Pantalla ────────────────────────────────────────────────────────────────

export default function AuditLogScreen() {
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const role = profile?.role ?? 'viewer';

  // Estado de filtros
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DatePreset>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Construir filtros para la query
  const filters = useMemo<AuditLogFilters>(() => {
    const f: AuditLogFilters = { limit: PAGE_SIZE };
    if (actionFilter !== 'all') f.action = actionFilter;
    if (tableFilter !== 'all') f.tableName = tableFilter;
    const startDate = getDateFilterStart(dateFilter);
    if (startDate) f.startDate = startDate;
    return f;
  }, [actionFilter, tableFilter, dateFilter]);

  const { data: logs, isLoading, refetch, isRefetching } = useAuditLogs(filters);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Guard: solo admin/manager ──────────────────────────────────────────

  if (role !== 'admin' && role !== 'manager') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Registro de Auditoria' }} />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textTertiary} />
          <Text variant="bodyLarge" style={{ color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
            No tenes permisos para ver el registro de auditoria
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render item ───────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: AuditLogWithUser }) => {
    const isExpanded = expandedId === item.id;
    const actionColor = AUDIT_ACTION_COLORS[item.action] ?? colors.textSecondary;
    const actionIcon = AUDIT_ACTION_ICONS[item.action] ?? 'help-circle-outline';
    const actionLabel = AUDIT_ACTION_LABELS[item.action] ?? item.action;
    const tableLabel = item.table_name ? (AUDIT_TABLE_LABELS[item.table_name] ?? item.table_name) : '—';

    return (
      <Pressable
        style={[styles.logItem, { backgroundColor: colors.surface }]}
        onPress={() => toggleExpand(item.id)}
      >
        {/* Fila principal */}
        <View style={styles.logRow}>
          {/* Icono de accion */}
          <View style={[styles.actionIconContainer, { backgroundColor: actionColor + '1A' }]}>
            <MaterialCommunityIcons
              name={actionIcon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20}
              color={actionColor}
            />
          </View>

          {/* Info principal */}
          <View style={styles.logInfo}>
            <View style={styles.logHeader}>
              <View style={[styles.actionBadge, { backgroundColor: actionColor + '20' }]}>
                <Text
                  variant="labelSmall"
                  style={{ color: actionColor, fontWeight: '600', fontSize: 11 }}
                >
                  {actionLabel}
                </Text>
              </View>
              <Text variant="labelSmall" style={{ color: colors.textTertiary }}>
                {tableLabel}
              </Text>
            </View>

            {/* Usuario */}
            <View style={styles.userRow}>
              {item.profile?.avatar_url ? (
                <Image
                  source={{ uri: item.profile.avatar_url }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.userAvatar, { backgroundColor: colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="account" size={12} color={colors.textTertiary} />
                </View>
              )}
              <Text variant="bodySmall" style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                {item.profile?.full_name ?? 'Sistema'}
              </Text>
            </View>

            {/* Timestamp */}
            <Text variant="labelSmall" style={{ color: colors.textTertiary, marginTop: 2 }}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>

          {/* Indicador de expansion */}
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textTertiary}
          />
        </View>

        {/* Detalle expandido */}
        {isExpanded && (
          <View style={[styles.expandedSection, { borderTopColor: colors.outlineVariant }]}>
            {item.record_id && (
              <DetailRow label="ID registro" value={item.record_id.substring(0, 8) + '...'} colors={colors} />
            )}

            {item.old_values && Object.keys(item.old_values).length > 0 && (
              <View style={styles.diffSection}>
                <Text variant="labelSmall" style={{ color: colors.error, fontWeight: '600', marginBottom: 4 }}>
                  Valores anteriores
                </Text>
                {Object.entries(item.old_values).map(([key, value]) => (
                  <Text key={key} variant="bodySmall" style={{ color: colors.textSecondary, lineHeight: 18 }}>
                    {key}: {formatValue(value)}
                  </Text>
                ))}
              </View>
            )}

            {item.new_values && Object.keys(item.new_values).length > 0 && (
              <View style={styles.diffSection}>
                <Text variant="labelSmall" style={{ color: colors.income, fontWeight: '600', marginBottom: 4 }}>
                  Valores nuevos
                </Text>
                {Object.entries(item.new_values).map(([key, value]) => (
                  <Text key={key} variant="bodySmall" style={{ color: colors.textSecondary, lineHeight: 18 }}>
                    {key}: {formatValue(value)}
                  </Text>
                ))}
              </View>
            )}

            {!item.old_values && !item.new_values && (
              <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                Sin detalles adicionales
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  // ── Componente principal ──────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Registro de Auditoria' }} />

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.filtersContainer}>
            {/* Filtro por accion */}
            <Text variant="labelMedium" style={{ color: colors.textSecondary, marginBottom: spacing.xs }}>
              Accion
            </Text>
            <View style={styles.chipRow}>
              {ACTION_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  selected={actionFilter === f.key}
                  onPress={() => setActionFilter(f.key)}
                  compact
                  style={[
                    styles.chip,
                    {
                      backgroundColor: actionFilter === f.key
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                  textStyle={{
                    color: actionFilter === f.key ? colors.primary : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {f.label}
                </Chip>
              ))}
            </View>

            {/* Filtro por tabla */}
            <Text variant="labelMedium" style={{ color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs }}>
              Tabla
            </Text>
            <View style={styles.chipRow}>
              {TABLE_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  selected={tableFilter === f.key}
                  onPress={() => setTableFilter(f.key)}
                  compact
                  style={[
                    styles.chip,
                    {
                      backgroundColor: tableFilter === f.key
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                  textStyle={{
                    color: tableFilter === f.key ? colors.primary : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {f.label}
                </Chip>
              ))}
            </View>

            {/* Filtro por fecha */}
            <Text variant="labelMedium" style={{ color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs }}>
              Periodo
            </Text>
            <View style={styles.chipRow}>
              {DATE_FILTERS.map((f) => (
                <Chip
                  key={f.key}
                  selected={dateFilter === f.key}
                  onPress={() => setDateFilter(f.key)}
                  compact
                  style={[
                    styles.chip,
                    {
                      backgroundColor: dateFilter === f.key
                        ? colors.primaryContainer
                        : colors.surfaceVariant,
                    },
                  ]}
                  textStyle={{
                    color: dateFilter === f.key ? colors.primary : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {f.label}
                </Chip>
              ))}
            </View>

            {/* Contador de resultados */}
            {logs && (
              <Text variant="labelSmall" style={{ color: colors.textTertiary, marginTop: spacing.sm }}>
                {logs.length} registro{logs.length !== 1 ? 's' : ''} encontrado{logs.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="text-box-search-outline"
              title="Sin registros"
              description="No se encontraron registros de auditoria con los filtros seleccionados"
            />
          )
        }
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="labelSmall" style={{ color: colors.textTertiary, width: 90 }}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.text, flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    marginBottom: 2,
  },
  logItem: {
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.smd,
    gap: spacing.sm,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSection: {
    padding: spacing.smd,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  diffSection: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
