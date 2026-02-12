import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useAttachments } from '../hooks/useAttachments';
import { getAttachmentUrl } from '../services/attachmentService';
import { ImageViewer } from '@/src/shared/components/ui/ImageViewer';
import { spacing, borderRadius } from '@/src/shared/theme';
import type { Attachment } from '@/src/core/types/database';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AttachmentGalleryProps {
  transactionId: string;
}

// ─── Componente interno: thumbnail de galeria ────────────────────────────────

function GalleryThumbnail({
  attachment,
  onPress,
}: {
  attachment: Attachment;
  onPress: (signedUrl: string) => void;
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

  const handlePress = useCallback(() => {
    if (signedUrl) {
      onPress(signedUrl);
    }
  }, [signedUrl, onPress]);

  return (
    <Pressable
      style={[styles.thumbnail, { backgroundColor: colors.surfaceVariant }]}
      onPress={handlePress}
      disabled={!signedUrl}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : signedUrl ? (
        <Image source={{ uri: signedUrl }} style={styles.thumbnailImage} />
      ) : (
        <MaterialCommunityIcons
          name="file-image-outline"
          size={24}
          color={colors.textTertiary}
        />
      )}
    </Pressable>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function AttachmentGallery({ transactionId }: AttachmentGalleryProps) {
  const { colors } = useAppTheme();
  const { data: attachments, isLoading } = useAttachments(transactionId);

  // Estado para el visor de imagen a pantalla completa
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerFileName, setViewerFileName] = useState<string | undefined>();

  // No mostrar nada si esta cargando o no hay adjuntos
  if (isLoading || !attachments || attachments.length === 0) {
    return null;
  }

  const count = attachments.length;

  const handleThumbnailPress = (signedUrl: string, fileName?: string) => {
    setViewerUrl(signedUrl);
    setViewerFileName(fileName);
    setViewerVisible(true);
  };

  const handleCloseViewer = () => {
    setViewerVisible(false);
    setViewerUrl('');
    setViewerFileName(undefined);
  };

  return (
    <View style={styles.container}>
      {/* Cabecera compacta */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="paperclip"
          size={16}
          color={colors.textSecondary}
        />
        <Text
          variant="labelSmall"
          style={[styles.headerText, { color: colors.textSecondary }]}
        >
          {count} comprobante{count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Fila horizontal de thumbnails */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailsRow}
      >
        {attachments.map((att) => (
          <GalleryThumbnail
            key={att.id}
            attachment={att}
            onPress={(url) => handleThumbnailPress(url, att.file_name)}
          />
        ))}
      </ScrollView>

      {/* Visor de imagen a pantalla completa */}
      <ImageViewer
        visible={viewerVisible}
        imageUrl={viewerUrl}
        fileName={viewerFileName}
        onClose={handleCloseViewer}
      />
    </View>
  );
}

export default AttachmentGallery;

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontWeight: '600',
  },
  thumbnailsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
  },
});
