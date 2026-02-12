import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPendingApprovals,
  getAllApprovals,
  approveRequest,
  rejectRequest,
  createApprovalRequest,
} from '../services/approvalService';
import type { ApprovalWithDetails } from '../services/approvalService';

const ONE_MINUTE = 1000 * 60;

// ─── Obtener aprobaciones pendientes ────────────────────────────────────────

export function usePendingApprovals() {
  return useQuery<ApprovalWithDetails[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await getPendingApprovals();
      if (error) throw error;
      return data;
    },
    staleTime: ONE_MINUTE,
  });
}

// ─── Obtener todas las aprobaciones (cualquier estado) ──────────────────────

export function useAllApprovals(limit?: number) {
  return useQuery<ApprovalWithDetails[]>({
    queryKey: ['approvals', 'all', limit],
    queryFn: async () => {
      const { data, error } = await getAllApprovals(limit);
      if (error) throw error;
      return data;
    },
  });
}

// ─── Aprobar una solicitud ──────────────────────────────────────────────────

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data, error } = await approveRequest(id, comment);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar aprobaciones, transacciones y dashboard para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Rechazar una solicitud ─────────────────────────────────────────────────

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { data, error } = await rejectRequest(id, comment);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar aprobaciones, transacciones y dashboard para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Crear nueva solicitud de aprobacion ────────────────────────────────────

export function useCreateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, thresholdAmount }: { transactionId: string; thresholdAmount: number }) => {
      const { data, error } = await createApprovalRequest(transactionId, thresholdAmount);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar aprobaciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
