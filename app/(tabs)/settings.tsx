import { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme, type ThemeMode } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME, APP_VERSION, USER_ROLE_LABELS } from '@/src/core/config/constants';
import type { UserRole } from '@/src/core/types/database';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { colors, themeMode, setThemeMode } = useAppTheme();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Tarjeta de perfil ──────────────────────────────────────────── */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name="account"
            size={40}
            color={colors.primary}
          />
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

      {/* ── Notificaciones (todos los usuarios) ──────────────────────── */}
      <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
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
    </View>
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
    padding: spacing.md,
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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.smd,
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
  logoutSection: {
    marginTop: 'auto',
    paddingBottom: spacing.md,
  },
});
