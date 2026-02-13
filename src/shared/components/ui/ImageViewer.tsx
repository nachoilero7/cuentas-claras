/**
 * Visor de imagenes a pantalla completa
 *
 * Modal que muestra una imagen centrada con fondo oscuro,
 * boton de cerrar y boton de compartir/descargar.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { File as ExpoFile, Paths } from 'expo-file-system';

import { spacing } from '@/src/shared/theme';

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface ImageViewerProps {
  /** Si el modal esta visible */
  visible: boolean;
  /** URL de la imagen a mostrar */
  imageUrl: string;
  /** Nombre del archivo (para compartir) */
  fileName?: string;
  /** Callback al cerrar el modal */
  onClose: () => void;
}

// ── Dimensiones de pantalla ─────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Componente ──────────────────────────────────────────────────────────────

export function ImageViewer({
  visible,
  imageUrl,
  fileName,
  onClose,
}: ImageViewerProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  // ── Compartir imagen ────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!imageUrl) return;

    setSharing(true);
    try {
      // Verificar que se pueda compartir
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Compartir no esta disponible en este dispositivo');
        return;
      }

      // Descargar imagen a archivo temporal en cache
      const tempFileName = fileName ?? `comprobante_${Date.now()}.jpg`;
      const tempFile = new ExpoFile(Paths.cache, tempFileName);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      await tempFile.write(new Uint8Array(buffer));

      await Sharing.shareAsync(tempFile.uri);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al compartir imagen';
      Alert.alert('Error', msg);
    } finally {
      setSharing(false);
    }
  };

  // ── Resetear estado al cerrar ───────────────────────────────────────────

  const handleClose = () => {
    setImageLoading(true);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          {/* Barra superior con botones */}
          <View style={styles.topBar}>
            {/* Boton compartir (izquierda) */}
            <Pressable
              style={styles.actionButton}
              onPress={handleShare}
              disabled={sharing}
              hitSlop={12}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color="#fff"
                />
              )}
            </Pressable>

            {/* Boton cerrar (derecha) */}
            <Pressable
              style={styles.actionButton}
              onPress={handleClose}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </Pressable>
          </View>

          {/* Imagen centrada */}
          <View style={styles.imageContainer}>
            {imageLoading && (
              <ActivityIndicator
                size="large"
                color="#fff"
                style={styles.loader}
              />
            )}
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
