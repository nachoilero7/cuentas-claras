import { File as ExpoFile } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/src/core/config/supabase';
import type { Attachment } from '@/src/core/types/database';

// ─── Obtener adjuntos de una transaccion ─────────────────────────────────────

export async function getAttachmentsByTransaction(transactionId: string) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  return { data: (data as Attachment[] | null) ?? [], error };
}

// ─── Subir adjunto al bucket de Storage y crear registro ─────────────────────

export async function uploadAttachment(
  transactionId: string,
  uri: string,
  fileName: string,
  mimeType: string,
) {
  // Obtener el usuario autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  // Leer el archivo como ArrayBuffer usando la nueva API de expo-file-system v19
  const file = new ExpoFile(uri);
  const arrayBuffer = await file.arrayBuffer();

  // Ruta dentro del bucket: {userId}/{transactionId}/{fileName}
  const filePath = `${user.id}/${transactionId}/${fileName}`;

  // Subir el archivo al bucket 'receipts'
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filePath, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Crear el registro en la tabla de adjuntos
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      transaction_id: transactionId,
      file_name: fileName,
      file_path: filePath,
      file_size: arrayBuffer.byteLength,
      mime_type: mimeType,
      uploaded_by: user.id,
    })
    .select('*')
    .single();

  return { data: data as Attachment | null, error };
}

// ─── Eliminar adjunto del storage y de la tabla ──────────────────────────────

export async function deleteAttachment(id: string, filePath: string) {
  // Eliminar el archivo del bucket de Storage
  const { error: storageError } = await supabase.storage
    .from('receipts')
    .remove([filePath]);

  if (storageError) {
    return { data: null, error: storageError };
  }

  // Eliminar el registro de la tabla
  const { data, error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as Attachment | null, error };
}

// ─── Obtener URL firmada para mostrar un adjunto (bucket privado) ────────────

export async function getAttachmentUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(filePath, 3600); // 1 hora de validez

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

// ─── Tomar foto con la camara ────────────────────────────────────────────────

export async function pickImageFromCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== 'granted') {
    return { asset: null, error: new Error('Se requiere permiso para acceder a la cámara') };
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { asset: null, error: null };
  }

  return { asset: result.assets[0], error: null };
}

// ─── Seleccionar imagen de la galeria ────────────────────────────────────────

export async function pickImageFromGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    return { asset: null, error: new Error('Se requiere permiso para acceder a la galería') };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { asset: null, error: null };
  }

  return { asset: result.assets[0], error: null };
}
