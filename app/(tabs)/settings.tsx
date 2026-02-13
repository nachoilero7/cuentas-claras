export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, TextInput, Image } from 'react-native';
import { Text, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme, type ThemeMode } from '@/src/core/providers/ThemeProvider';
import { useProfile, useUpdateProfile } from '@/src/features/auth/hooks/useProfile';
import { uploadAvatar } from '@/src/features/auth/services/profileService';
import { useBiometric, BIOMETRIC_LABELS } from '@/src/features/security';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME, APP_VERSION, USER_ROLE_LABELS } from '@/src/core/config/constants';
import type { UserRole } from '@/src/core/types/database';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { colors, themeMode, setThemeMode } = useAppTheme();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const biometric = useBiometric();
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Usar datos del perfil de DB, con fallback a metadata de auth
  const displayName =
    profile?.display_name ??
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Usuario';

  const displayEmail = profile?.email ?? user?.email ?? 'Sin correo';
  const role: UserRole = profile?.role ?? 'viewer';
  const roleLabel = USER_ROLE_LABELS[role] ?? role;

  // ── Manejo de avatar ──────────────────────────────────────────────────────

  const handlePickAvatar = useCallback(() => {
    Alert.alert('Cambiar foto de perfil', 'Selecciona una opcion', [
      {
        text: 'Camara',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la camara para tomar una foto.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets?.length) {
            await handleUploadAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Galeria',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galeria para seleccionar una foto.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets?.length) {
            await handleUploadAvatar(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [user?.id]);

  const handleUploadAvatar = useCallback(async (imageUri: string) => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    try {
      const { url, error } = await uploadAvatar(user.id, imageUri);
      if (error) {
        Alert.alert('Error', 'No se pudo subir la foto de perfil. Intenta nuevamente.');
        return;
      }
      // Invalidar la query del perfil para refrescar los datos
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch {
      Alert.alert('Error', 'Ocurrio un error inesperado al subir la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [user?.id, queryClient]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Cerrar sesion',
      'Estas seguro que deseas cerrar tu sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesion',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  }, [signOut]);

  const handleEditAlias = useCallback(() => {
    setAliasValue(profile?.payment_alias ?? '');
    setEditingAlias(true);
  }, [profile?.payment_alias]);

  const handleSaveAlias = useCallback(async () => {
    try {
      await updateProfile.mutateAsync({
        payment_alias: aliasValue.trim() || null,
      });
      setEditingAlias(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el alias de pago.');
    }
  }, [aliasValue, updateProfile]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Tarjeta de perfil ──────────────────────────────────────────── */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={[styles.avatar, styles.avatarImage]}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="account"
                size={40}
                color={colors.primary}
              />
            </View>
          )}

          {/* Badge de camara para cambiar avatar */}
          <Pressable
            style={[styles.cameraBadge, { backgroundColor: colors.primary }]}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size={14} color={colors.onPrimary} />
            ) : (
              <MaterialCommunityIcons
                name="camera"
                size={14}
                color={colors.onPrimary}
              />
            )}
          </Pressable>
        </View>

        {profileLoading ? (
          <ActivityIndicator size="small" style={{ marginVertical: spacing.sm }} />
        ) : (
          <>
            <Text
              variant="titleLarge"
              style={[styles.name, { color: colors.text }]}
            >
              {displayName}
            </Text>

            <Text
              variant="bodyMedium"
              style={{ color: colors.textSecondary }}
            >
              {displayEmail}
            </Text>

            <View style={[styles.roleBadge, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="shield-account"
                size={14}
                color={colors.primary}
              />
              <Text
                variant="labelSmall"
                style={{ color: colors.primary, marginLeft: 4, fontWeight: '600' }}
              >
                {roleLabel}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ── Informacion de la app ─────────────────────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
        <InfoRow
          icon="information-outline"
          label="Version"
          value={`${APP_NAME} v${APP_VERSION}`}
          colors={colors}
        />
        <Divider style={{ backgroundColor: colors.outlineVariant }} />
        <InfoRow
          icon="identifier"
          label="ID de usuario"
          value={user?.id?.substring(0, 8) ?? '---'}
          colors={colors}
        />
        {profile?.phone && (
          <>
            <Divider style={{ backgroundColor: colors.outlineVariant }} />
            <InfoRow
              icon="phone-outline"
              label="Telefono"
              value={profile.phone}
              colors={colors}
            />
          </>
        )}
      </View>

      {/* ── Alias de pago ───────────────────────────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
        <View style={styles.themeSectionHeader}>
          <MaterialCommunityIcons
            name="bank-transfer"
            size={20}
            color={colors.primary}
          />
          <Text variant="bodyMedium" style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '600' }}>
            Alias de pago
          </Text>
        </View>
        <Divider style={{ backgroundColor: colors.outlineVariant }} />
        {editingAlias ? (
          <View style={styles.aliasEditContainer}>
            <TextInput
              style={[
                styles.aliasInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.primary,
                },
              ]}
              value={aliasValue}
              onChangeText={setAliasValue}
              placeholder="Ej: mi.alias.uala o CBU/CVU"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.aliasActions}>
              <Pressable
                style={[styles.aliasActionBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setEditingAlias(false)}
              >
                <Text variant="labelMedium" style={{ color: colors.textSecondary }}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                style={[styles.aliasActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAlias}
              >
                <Text variant="labelMedium" style={{ color: colors.onPrimary, fontWeight: '600' }}>
                  {updateProfile.isPending ? 'Guardando...' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.infoRow} onPress={handleEditAlias}>
            <MaterialCommunityIcons
              name="wallet-outline"
              size={20}
              color={colors.textTertiary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                CBU / CVU / Alias
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: profile?.payment_alias ? colors.text : colors.textTertiary }}
              >
                {profile?.payment_alias ?? 'No configurado - Toca para agregar'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.smd }}>
          <Text variant="bodySmall" style={{ color: colors.textTertiary, lineHeight: 18 }}>
            Este alias sera visible para otros usuarios cuando necesiten realizarte una transferencia.
          </Text>
        </View>
      </View>

      {/* ── Selector de tema ────────────────────────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
        <View style={styles.themeSectionHeader}>
          <MaterialCommunityIcons
            name="theme-light-dark"
            size={20}
            color={colors.primary}
          />
          <Text variant="bodyMedium" style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '600' }}>
            Apariencia
          </Text>
        </View>
        <Divider style={{ backgroundColor: colors.outlineVariant }} />
        <View style={styles.themeOptions}>
          {([
            { mode: 'system' as ThemeMode, icon: 'cellphone' as const, label: 'Sistema' },
            { mode: 'light' as ThemeMode, icon: 'white-balance-sunny' as const, label: 'Claro' },
            { mode: 'dark' as ThemeMode, icon: 'moon-waning-crescent' as const, label: 'Oscuro' },
          ]).map((option) => {
            const isActive = themeMode === option.mode;
            return (
              <Pressable
                key={option.mode}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: isActive ? colors.primaryContainer : 'transparent',
                    borderColor: isActive ? colors.primary : colors.outline,
                  },
                ]}
                onPress={() => setThemeMode(option.mode)}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  variant="labelMedium"
                  style={{
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Seguridad biometrica ──────────────────────────────────────── */}
      {biometric.isAvailable && biometric.isEnrolled && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <View style={styles.themeSectionHeader}>
            <MaterialCommunityIcons
              name="fingerprint"
              size={20}
              color={colors.primary}
            />
            <Text variant="bodyMedium" style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '600' }}>
              Seguridad
            </Text>
          </View>
          <Divider style={{ backgroundColor: colors.outlineVariant }} />
          <Pressable
            style={styles.infoRow}
            onPress={() => biometric.setEnabled(!biometric.isEnabled)}
          >
            <MaterialCommunityIcons
              name={biometric.isEnabled ? 'shield-check' : 'shield-off-outline'}
              size={20}
              color={biometric.isEnabled ? colors.primary : colors.textTertiary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                {biometric.biometricType
                  ? BIOMETRIC_LABELS[biometric.biometricType]
                  : 'Autenticacion biometrica'}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                {biometric.isEnabled
                  ? 'Activa - Se pedira confirmacion para acciones sensibles'
                  : 'Inactiva - Toca para activar'}
              </Text>
            </View>
            <View
              style={[
                styles.biometricToggle,
                {
                  backgroundColor: biometric.isEnabled ? colors.primary : colors.surfaceVariant,
                },
              ]}
            >
              <View
                style={[
                  styles.biometricToggleThumb,
                  {
                    backgroundColor: colors.surface,
                    transform: [{ translateX: biometric.isEnabled ? 16 : 0 }],
                  },
                ]}
              />
            </View>
          </Pressable>
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.smd }}>
            <Text variant="bodySmall" style={{ color: colors.textTertiary, lineHeight: 18 }}>
              Protege operaciones como eliminar transacciones y aprobar/rechazar solicitudes.
            </Text>
          </View>
        </View>
      )}

      {/* ── Administracion (solo admin) ──────────────────────────────── */}
      {role === 'admin' && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push('/users')}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Gestionar usuarios
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Roles y permisos por rubro
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant }} />
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push('/approvals')}
          >
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={20}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Aprobaciones
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Revisar transacciones pendientes
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant }} />
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push('/seasons')}
          >
            <MaterialCommunityIcons
              name="calendar-range"
              size={20}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Temporadas
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Gestionar periodos deportivos
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant }} />
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push('/budget-alerts')}
          >
            <MaterialCommunityIcons
              name="alert-decagram-outline"
              size={20}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Alertas de presupuesto
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Configurar alertas por categoria
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>
      )}

      {/* ── Auditoria (admin y manager) ──────────────────────────── */}
      {(role === 'admin' || role === 'manager') && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Pressable
            style={styles.infoRow}
            onPress={() => router.push('/audit')}
          >
            <MaterialCommunityIcons
              name="text-box-search-outline"
              size={20}
              color={colors.primary}
            />
            <View style={styles.infoContent}>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                Registro de auditoria
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Historial de acciones del sistema
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        </View>
      )}

      {/* ── Herramientas (todos los usuarios) ──────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
        <Pressable
          style={styles.infoRow}
          onPress={() => router.push('/recurring')}
        >
          <MaterialCommunityIcons
            name="repeat"
            size={20}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              Transacciones recurrentes
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Cuotas, suscripciones y pagos periodicos
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.textTertiary}
          />
        </Pressable>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.outlineVariant }} />
        <Pressable
          style={styles.infoRow}
          onPress={() => router.push('/notifications')}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              Notificaciones
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Ver alertas y actualizaciones
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors.textTertiary}
          />
        </Pressable>
      </View>

      {/* ── Boton de cerrar sesion ────────────────────────────────────── */}
      <View style={styles.logoutSection}>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          loading={loggingOut}
          disabled={loggingOut}
          onPress={handleSignOut}
          icon="logout"
        >
          Cerrar Sesion
        </Button>
      </View>
    </ScrollView>
  );
}

// ── Componente auxiliar ─────────────────────────────────────────────────────

interface InfoRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function InfoRow({ icon, label, value, colors }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={colors.textTertiary}
      />
      <View style={styles.infoContent}>
        <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
          {label}
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.text }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.smd,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  infoSection: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.smd,
  },
  infoContent: {
    flex: 1,
  },
  themeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  themeOptions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
  },
  aliasEditContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  aliasInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  aliasActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  aliasActionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  biometricToggle: {
    width: 44,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  biometricToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  logoutSection: {
    marginTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
