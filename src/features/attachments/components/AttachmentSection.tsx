import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '../hooks/useAttachments';
import {
  pickImageFromCamera,
  pickImageFromGallery,
  getAttachmentUrl,
} from '../services/attachmentService';
import { spacing } from '@/src/shared/theme';
import { ImageViewer } from '@/src/shared/components/ui/ImageViewer';
import type { Attachment } from '@/src/core/types/database';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PendingImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface AttachmentSectionProps {
  /** ID de la transaccion (undefined en modo creacion) */
  transactionId?: string;
  /** Imagenes pendientes de subir (modo creacion) */
  pendingImages: PendingImage[];
  /** Callback para actualizar imagenes pendientes */
  onPendingImagesChange: (images: PendingImage[]) => void;
}

// ─── Componente de thumbnail para adjunto existente ──────────────────────────

function AttachmentThumbnail({
  attachment,
  onDelete,
  isDeleting,
  onView,
}: {
  attachment: Attachment;
  onDelete: () => void;
  isDeleting: boolean;
  onView: (url: string) => void;
}) {
  const { colors } = useAppTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAttachmentUrl(attachment.file_path).then((url) => {
      if (mounted) {
        setSignedUrl(url);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [attachment.file_path]);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar comprobante',
      `¿Eliminar "${attachment.file_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <View style={[styles.thumbnailContainer, { backgroundColor: colors.surfaceVariant }]}>
      {/* Imagen con tap para ver a pantalla completa */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => signedUrl && onView(signedUrl)}
        disabled={loading || !signedUrl}
      >
        {loading ? (
          <View style={styles.thumbnailCentered}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : signedUrl ? (
          <Image source={{ uri: signedUrl }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailCentered}>
            <MaterialCommunityIcons name="file-image-outline" size={32} color={colors.textTertiary} />
          </View>
        )}
      </Pressable>

      {/* Boton eliminar */}
      <Pressable
        style={[styles.deleteButton, { backgroundColor: colors.error }]}
        onPress={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size={12} color="#fff" />
        ) : (
          <MaterialCommunityIcons name="close" size={14} color="#fff" />
        )}
      </Pressable>

      <Text
        variant="labelSmall"
        style={[styles.thumbnailLabel, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {attachment.file_name}
      </Text>
    </View>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function AttachmentSection({
  transactionId,
  pendingImages,
  onPendingImagesChange,
}: AttachmentSectionProps) {
  const { colors } = useAppTheme();

  // Estado del visor de imagenes a pantalla completa
  const [viewerImage, setViewerImage] = useState<{ url: string; fileName: string } | null>(null);

  // Solo cargar adjuntos existentes en modo edicion
  const { data: existingAttachments, isLoading } = useAttachments(transactionId ?? '');
  const uploadMutation = useUploadAttachment();
  const deleteMutation = useDeleteAttachment();

  const [uploadingCount, setUploadingCount] = useState(0);

  // ── Agregar imagen ─────────────────────────────────────────────────────────

  const handleAddImage = useCallback(() => {
    Alert.alert('Agregar comprobante', 'Selecciona una opcion', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const { asset, error } = await pickImageFromCamera();
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          if (!asset) return;

          const fileName = asset.fileName ?? `comprobante_${Date.now()}.jpg`;
          const mimeType = asset.mimeType ?? 'image/jpeg';

          if (transactionId) {
            // Modo edicion: subir directamente
            setUploadingCount((c) => c + 1);
            try {
              await uploadMutation.mutateAsync({
                transactionId,
                uri: asset.uri,
                fileName,
                mimeType,
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Error al subir imagen';
              Alert.alert('Error', msg);
            } finally {
              setUploadingCount((c) => c - 1);
            }
          } else {
            // Modo creacion: agregar a pendientes
            onPendingImagesChange([...pendingImages, { uri: asset.uri, fileName, mimeType }]);
          }
        },
      },
      {
        text: 'Elegir de galeria',
        onPress: async () => {
          const { asset, error } = await pickImageFromGallery();
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          if (!asset) return;

          const fileName = asset.fileName ?? `comprobante_${Date.now()}.jpg`;
          const mimeType = asset.mimeType ?? 'image/jpeg';

          if (transactionId) {
            setUploadingCount((c) => c + 1);
            try {
              await uploadMutation.mutateAsync({
                transactionId,
                uri: asset.uri,
                fileName,
                mimeType,
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Error al subir imagen';
              Alert.alert('Error', msg);
            } finally {
              setUploadingCount((c) => c - 1);
            }
          } else {
            onPendingImagesChange([...pendingImages, { uri: asset.uri, fileName, mimeType }]);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [transactionId, pendingImages, onPendingImagesChange, uploadMutation]);

  // ── Eliminar adjunto existente ─────────────────────────────────────────────

  const handleDeleteAttachment = useCallback(
    async (attachment: Attachment) => {
      try {
        await deleteMutation.mutateAsync({
          id: attachment.id,
          filePath: attachment.file_path,
          transactionId: transactionId!,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar';
        Alert.alert('Error', msg);
      }
    },
    [transactionId, deleteMutation],
  );

  // ── Eliminar imagen pendiente ──────────────────────────────────────────────

  const handleRemovePending = useCallback(
    (index: number) => {
      const updated = pendingImages.filter((_, i) => i !== index);
      onPendingImagesChange(updated);
    },
    [pendingImages, onPendingImagesChange],
  );

  // ── Conteo total ───────────────────────────────────────────────────────────

  const existingCount = existingAttachments?.length ?? 0;
  const totalCount = existingCount + pendingImages.length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          variant="labelLarge"
          style={[styles.sectionLabel, { color: colors.textSecondary }]}
        >
          Comprobantes
        </Text>
        {totalCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text variant="labelSmall" style={{ color: colors.primary, fontWeight: '700' }}>
              {totalCount}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailsRow}
      >
        {/* Adjuntos existentes (modo edicion) */}
        {transactionId && !isLoading && existingAttachments?.map((att) => (
          <AttachmentThumbnail
            key={att.id}
            attachment={att}
            onDelete={() => handleDeleteAttachment(att)}
            isDeleting={deleteMutation.isPending}
            onView={(url) => setViewerImage({ url, fileName: att.file_name })}
          />
        ))}

        {/* Imagenes pendientes (modo creacion) */}
        {pendingImages.map((img, index) => (
          <View
            key={`pending-${index}`}
            style={[styles.thumbnailContainer, { backgroundColor: colors.surfaceVariant }]}
          >
            {/* Tap para ver imagen pendiente a pantalla completa */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setViewerImage({ url: img.uri, fileName: img.fileName })}
            >
              <Image source={{ uri: img.uri }} style={styles.thumbnailImage} />
            </Pressable>
            <Pressable
              style={[styles.deleteButton, { backgroundColor: colors.error }]}
              onPress={() => handleRemovePending(index)}
            >
              <MaterialCommunityIcons name="close" size={14} color="#fff" />
            </Pressable>
            <Text
              variant="labelSmall"
              style={[styles.thumbnailLabel, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {img.fileName}
            </Text>
          </View>
        ))}

        {/* Indicador de subida en progreso */}
        {uploadingCount > 0 && (
          <View style={[styles.thumbnailContainer, styles.uploadingThumbnail, { backgroundColor: colors.surfaceVariant }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="labelSmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
              Subiendo...
            </Text>
          </View>
        )}

        {/* Indicador de carga inicial */}
        {transactionId && isLoading && (
          <View style={[styles.thumbnailContainer, { backgroundColor: colors.surfaceVariant }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* Boton agregar */}
        <Pressable
          style={[styles.addButton, { borderColor: colors.outline, backgroundColor: colors.surface }]}
          onPress={handleAddImage}
        >
          <MaterialCommunityIcons name="camera-plus-outline" size={24} color={colors.primary} />
          <Text variant="labelSmall" style={{ color: colors.primary, marginTop: 4 }}>
            Agregar
          </Text>
        </Pressable>
      </ScrollView>

      {/* Visor de imagen a pantalla completa */}
      <ImageViewer
        visible={!!viewerImage}
        imageUrl={viewerImage?.url ?? ''}
        fileName={viewerImage?.fileName}
        onClose={() => setViewerImage(null)}
      />
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  thumbnailsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumbnailContainer: {
    width: 88,
    height: 88,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 88,
    height: 88,
    borderRadius: 10,
  },
  thumbnailCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    right: 4,
    fontSize: 9,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    borderRadius: 4,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingThumbnail: {
    gap: 4,
  },
  addButton: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
