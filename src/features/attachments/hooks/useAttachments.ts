import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAttachmentsByTransaction,
  uploadAttachment,
  deleteAttachment,
} from '../services/attachmentService';
import type { Attachment } from '@/src/core/types/database';

const ONE_MINUTE = 1000 * 60;

// ─── Listar adjuntos de una transaccion ──────────────────────────────────────

export function useAttachments(transactionId: string) {
  return useQuery<Attachment[]>({
    queryKey: ['attachments', transactionId],
    queryFn: async () => {
      const { data, error } = await getAttachmentsByTransaction(transactionId);
      if (error) throw error;
      return data;
    },
    enabled: !!transactionId,
    staleTime: ONE_MINUTE,
  });
}

// ─── Subir adjunto ───────────────────────────────────────────────────────────

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      uri: string;
      fileName: string;
      mimeType: string;
    }) => {
      const { data, error } = await uploadAttachment(
        input.transactionId,
        input.uri,
        input.fileName,
        input.mimeType,
      );
      if (error) throw error;
      return data;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.transactionId] });
    },
  });
}

// ─── Eliminar adjunto ────────────────────────────────────────────────────────

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; filePath: string; transactionId: string }) => {
      const { data, error } = await deleteAttachment(input.id, input.filePath);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar la lista de adjuntos de la transaccion afectada
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.transactionId] });
    },
  });
}
