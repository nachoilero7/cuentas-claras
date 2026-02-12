import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useBiometric } from '@/src/features/security';
import {
  usePendingApprovals,
  useAllApprovals,
  useApproveRequest,
  useRejectRequest,
} from '@/src/features/approvals/hooks/useApprovals';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { AttachmentGallery } from '@/src/features/attachments/components';
import { formatCurrency } from '@/src/core/utils/currency';
import { formatDate } from '@/src/core/utils/date';
import { hapticSuccess, hapticError, hapticWarning } from '@/src/shared/lib/haptics';
import { spacing, borderRadius } from '@/src/shared/theme';
import type { ApprovalWithDetails } from '@/src/features/approvals/services/approvalService';
import type { CurrencyCode } from '@/src/core/types/database';

// ── Componente principal ────────────────────────────────────────────────────

export default function ApprovalsListScreen() {
  const { colors } = useAppTheme();
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  const {
    data: pendingApprovals,
    isLoading: isPendingLoading,
    isError: isPendingError,
    error: pendingError,
    refetch: refetchPending,
    isRefetching: isPendingRefetching,
  } = usePendingApprovals();

  const {
    data: allApprovals,
    refetch: refetchAll,
    isRefetching: isAllRefetching,
  } = useAllApprovals(20);

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const { authenticate } = useBiometric();

  // Modal de rechazo (Alert.prompt solo funciona en iOS)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  // ── Aprobaciones revisadas recientemente (no pendientes) ────────────────

  const reviewedApprovals = useMemo(() => {
    if (!allApprovals) return [];
    return allApprovals.filter(
      (approval) => approval.status !== 'pending',
    );
  }, [allApprovals]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    refetchPending();
    refetchAll();
  }, [refetchPending, refetchAll]);

  // ── Aprobar solicitud ─────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (approvalId: string) => {
      // Verificacion biometrica antes de aprobar
      const authenticated = await authenticate('Confirma tu identidad para aprobar la transaccion');
      if (!authenticated) return;

      hapticWarning();
      Alert.alert(
        'Confirmar aprobacion',
        'Esta seguro de que desea aprobar esta transaccion?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Aprobar',
            onPress: () => {
              approveMutation.mutate(
                { id: approvalId },
                {
                  onSuccess: () => {
                    hapticSuccess();
                    Alert.alert('Exito', 'Transaccion aprobada');
                  },
                  onError: (err) => {
                    hapticError();
                    Alert.alert(
                      'Error',
                      err instanceof Error ? err.message : 'No se pudo aprobar la transaccion.',
                    );
                  },
                },
              );
            },
          },
        ],
      );
    },
    [approveMutation, authenticate],
  );

  // ── Rechazar solicitud ────────────────────────────────────────────────────

  const openRejectModal = useCallback((approvalId: string) => {
    setRejectingId(approvalId);
    setRejectComment('');
    setRejectModalVisible(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectingId) return;

    const comment = rejectComment.trim();
    if (!comment) {
      Alert.alert('Error', 'Debes ingresar un comentario para rechazar.');
      return;
    }

    // Verificacion biometrica antes de rechazar
    const authenticated = await authenticate('Confirma tu identidad para rechazar la transaccion');
    if (!authenticated) return;

    rejectMutation.mutate(
      { id: rejectingId, comment },
      {
        onSuccess: () => {
          hapticSuccess();
          setRejectModalVisible(false);
          setRejectingId(null);
          Alert.alert('Listo', 'Transaccion rechazada');
        },
        onError: (err) => {
          hapticError();
          Alert.alert(
            'Error',
            err instanceof Error ? err.message : 'No se pudo rechazar la transaccion.',
          );
        },
      },
    );
  }, [rejectingId, rejectComment, rejectMutation, authenticate]);

  // ── Guard: solo admin o manager pueden acceder ────────────────────────────

  if (!isProfileLoading && !isAdmin && !isManager) {
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
          No tienes permisos para acceder a las aprobaciones.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={() => router.back()}>
            Volver
          </Button>
        </View>
      </View>
    );
  }

  // ── Estado de carga ───────────────────────────────────────────────────────

  if (isPendingLoading || isProfileLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando aprobaciones...
        </Text>
      </View>
    );
  }

  // ── Estado de error ───────────────────────────────────────────────────────

  if (isPendingError) {
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
          Error al cargar aprobaciones
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}
        >
          {pendingError instanceof Error
            ? pendingError.message
            : 'Ocurrio un error inesperado.'}
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button variant="primary" size="md" onPress={handleRefresh}>
            Reintentar
          </Button>
        </View>
      </View>
    );
  }

  // ── Renderizar cada aprobacion pendiente ──────────────────────────────────

  const renderPendingItem = ({ item }: { item: ApprovalWithDetails }) => {
    const tx = item.transaction;
    const amountColor = tx?.type === 'income' ? colors.income : tx?.type === 'expense' ? colors.expense : tx?.type === 'transfer' ? colors.transfer : colors.textSecondary;
    const formattedAmount = formatCurrency(tx?.amount ?? 0, (tx?.currency as CurrencyCode) ?? 'ARS');
    const formattedDate = tx?.transaction_date ? formatDate(tx.transaction_date) : '';

    const cardStyle: import('react-native').ViewStyle = {
      marginBottom: spacing.smd,
    };

    return (
      <Card variant="elevated" padding="md" style={cardStyle}>
        <View style={styles.cardContent}>
          {/* Descripcion y monto */}
          <View style={styles.cardHeader}>
            <Text
              variant="titleSmall"
              style={{ color: colors.text, flex: 1, fontWeight: '600' }}
              numberOfLines={2}
            >
              {tx?.description ?? 'Sin descripcion'}
            </Text>
            <Text
              variant="titleMedium"
              style={{ color: amountColor, fontWeight: '700', marginLeft: spacing.sm }}
            >
              {formattedAmount}
            </Text>
          </View>

          {/* Categoria con icono */}
          {tx?.category?.name ? (
            <View style={styles.categoryRow}>
              <MaterialCommunityIcons
                name={(tx.category.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'tag-outline'}
                size={16}
                color={colors.textSecondary}
              />
              <Text
                variant="bodySmall"
                style={{ color: colors.textSecondary, marginLeft: spacing.xs }}
              >
                {tx.category.name}
              </Text>
            </View>
          ) : null}

          {/* Fecha de la transaccion */}
          {formattedDate ? (
            <View style={styles.dateRow}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                variant="bodySmall"
                style={{ color: colors.textSecondary, marginLeft: spacing.xs }}
              >
                {formattedDate}
              </Text>
            </View>
          ) : null}

          {/* Solicitante */}
          <View style={styles.requesterRow}>
            <MaterialCommunityIcons
              name="account-outline"
              size={16}
              color={colors.textTertiary}
            />
            <Text
              variant="bodySmall"
              style={{ color: colors.textTertiary, marginLeft: spacing.xs }}
            >
              Solicitado por: {item.requester?.full_name ?? 'Desconocido'}
            </Text>
          </View>

          {/* Comprobantes adjuntos */}
          <AttachmentGallery transactionId={item.transaction_id} />

          {/* Botones de accion (solo admin) */}
          {isAdmin ? (
            <View style={styles.actionsRow}>
              <Button
                variant="primary"
                size="sm"
                icon="check"
                onPress={() => handleApprove(item.id)}
                loading={approveMutation.isPending}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                style={{ ...styles.approveButton, backgroundColor: colors.income, borderColor: colors.income }}
                labelStyle={{ color: '#ffffff' }}
              >
                Aprobar
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon="close"
                onPress={() => openRejectModal(item.id)}
                loading={rejectMutation.isPending}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                style={{ ...styles.rejectButton, borderColor: colors.expense }}
                labelStyle={{ color: colors.expense }}
              >
                Rechazar
              </Button>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  // ── Renderizar cada aprobacion revisada ───────────────────────────────────

  const renderReviewedItem = ({ item }: { item: ApprovalWithDetails }) => {
    const tx = item.transaction;
    const amountColor = tx?.type === 'income' ? colors.income : tx?.type === 'expense' ? colors.expense : tx?.type === 'transfer' ? colors.transfer : colors.textSecondary;
    const formattedAmount = formatCurrency(tx?.amount ?? 0, (tx?.currency as CurrencyCode) ?? 'ARS');

    const isApproved = item.status === 'approved';
    const statusLabel = isApproved ? 'Aprobada' : 'Rechazada';
    const statusColor = isApproved ? colors.success : colors.error;
    const statusIcon = isApproved ? 'check-circle-outline' : 'close-circle-outline';

    const cardStyle: import('react-native').ViewStyle = {
      marginBottom: spacing.sm,
    };

    return (
      <Card variant="outlined" padding="sm" style={cardStyle}>
        <View style={styles.reviewedCardContent}>
          <View style={styles.reviewedInfo}>
            <Text
              variant="bodyMedium"
              style={{ color: colors.text, fontWeight: '600' }}
              numberOfLines={1}
            >
              {tx?.description ?? 'Sin descripcion'}
            </Text>
            <View style={styles.reviewedMeta}>
              <MaterialCommunityIcons
                name={statusIcon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={14}
                color={statusColor}
              />
              <Text
                variant="labelSmall"
                style={{ color: statusColor, marginLeft: spacing.xxs, fontWeight: '600' }}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: amountColor, fontWeight: '700' }}
          >
            {formattedAmount}
          </Text>
        </View>
      </Card>
    );
  };

  // ── Cabecera de la lista ──────────────────────────────────────────────────

  const ListHeaderComponent = useMemo(() => {
    return (
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={20}
          color={colors.primary}
        />
        <Text
          variant="titleMedium"
          style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}
        >
          Pendientes de aprobacion
        </Text>
      </View>
    );
  }, [colors]);

  // ── Pie de la lista (aprobaciones revisadas) ──────────────────────────────

  const ListFooterComponent = useMemo(() => {
    if (reviewedApprovals.length === 0) return null;

    return (
      <View style={[styles.reviewedSection, { borderTopColor: colors.outlineVariant }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="history"
            size={20}
            color={colors.textSecondary}
          />
          <Text
            variant="titleMedium"
            style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}
          >
            Revisadas recientemente
          </Text>
        </View>
        {reviewedApprovals.map((item) => (
          <View key={item.id}>
            {renderReviewedItem({ item })}
          </View>
        ))}
      </View>
    );
  }, [reviewedApprovals, colors]);

  // ── Pantalla principal ────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pendingApprovals ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderPendingItem}
        contentContainerStyle={[
          styles.listContent,
          (!pendingApprovals || pendingApprovals.length === 0) && styles.emptyListContent,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        refreshControl={
          <RefreshControl
            refreshing={isPendingRefetching || isAllRefetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-check-outline"
            title="Sin aprobaciones pendientes"
            description="No hay transacciones pendientes de revision en este momento."
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── Modal de rechazo ─────────────────────────────────────────────── */}
      <Portal>
        <Modal
          visible={rejectModalVisible}
          onDismiss={() => setRejectModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text
            variant="titleMedium"
            style={{ color: colors.text, fontWeight: '700', marginBottom: spacing.md }}
          >
            Rechazar transaccion
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginBottom: spacing.smd }}
          >
            Ingresa un comentario explicando el motivo del rechazo:
          </Text>
          <TextInput
            style={[
              styles.rejectInput,
              {
                borderColor: colors.outline,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={rejectComment}
            onChangeText={setRejectComment}
            placeholder="Motivo del rechazo..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.modalActions}>
            <Button
              variant="outline"
              size="md"
              onPress={() => setRejectModalVisible(false)}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              onPress={confirmReject}
              loading={rejectMutation.isPending}
              style={{ flex: 1, backgroundColor: colors.expense, borderColor: colors.expense }}
              labelStyle={{ color: '#ffffff' }}
            >
              Rechazar
            </Button>
          </View>
        </Modal>
      </Portal>
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
    marginTop: spacing.sm,
  },
  cardContent: {
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  approveButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
  reviewedSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  reviewedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewedInfo: {
    flex: 1,
    gap: spacing.xxs,
    marginRight: spacing.sm,
  },
  reviewedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContent: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  rejectInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.smd,
    minHeight: 80,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
