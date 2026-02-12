import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { Text, Switch as PaperSwitch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import {
  useUpdateUserRole,
  useToggleUserStatus,
  useUserPermissions,
  useSavePermissions,
} from '@/src/features/users/hooks/useUsers';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { USER_ROLE_LABELS } from '@/src/core/config/constants';
import { formatDate } from '@/src/core/utils/date';
import type { UserRole } from '@/src/core/types/database';
import { hapticWarning, hapticSuccess, hapticError } from '@/src/shared/lib/haptics';
import type { UpsertPermissionData } from '@/src/features/users/services/userService';

// ── Configuracion de roles ──────────────────────────────────────────────────

const ROLE_CONFIG: { role: UserRole; icon: string; label: string; description: string }[] = [
  { role: 'admin', icon: 'shield-crown', label: 'Administrador', description: 'Acceso total al sistema' },
  { role: 'manager', icon: 'shield-account', label: 'Gestor', description: 'Puede crear y editar movimientos' },
  { role: 'viewer', icon: 'eye-outline', label: 'Visualizador', description: 'Solo puede ver informacion' },
];

// ── Tipo del estado local de permisos ───────────────────────────────────────

type PermissionFlags = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

type PermissionsState = Record<string, PermissionFlags>;

// ── Componente ──────────────────────────────────────────────────────────────

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  // Perfil del usuario actual (admin que esta viendo)
  const { data: currentProfile } = useProfile();
  const isAdmin = currentProfile?.role === 'admin';

  // Perfil del usuario que se esta editando
  const { data: targetUser, isLoading: isUserLoading } = useProfile(id);

  // Hooks de datos
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: permissions = [], isLoading: isPermissionsLoading } = useUserPermissions(id!);
  const updateRoleMutation = useUpdateUserRole();
  const toggleStatusMutation = useToggleUserStatus();
  const savePermissionsMutation = useSavePermissions();

  // Estado local
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [permissionsState, setPermissionsState] = useState<PermissionsState>({});

  // ── Inicializar rol seleccionado desde datos del usuario ──────────────────

  useEffect(() => {
    if (targetUser?.role) {
      setSelectedRole(targetUser.role);
    }
  }, [targetUser?.role]);

  // ── Inicializar permisos desde datos cargados ─────────────────────────────

  useEffect(() => {
    if (!categories.length) return;

    const initial: PermissionsState = {};

    // Primero, poner todos los rubros en false por defecto
    for (const cat of categories) {
      initial[cat.id] = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    }

    // Sobreescribir con los permisos existentes
    for (const perm of permissions) {
      if (initial[perm.category_id]) {
        initial[perm.category_id] = {
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        };
      }
    }

    setPermissionsState(initial);
  }, [categories, permissions]);

  // ── Iniciales para el avatar ──────────────────────────────────────────────

  const initials = useMemo(() => {
    const name = targetUser?.full_name ?? targetUser?.display_name ?? '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || '??').toUpperCase();
  }, [targetUser]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTogglePermission = useCallback(
    (categoryId: string, field: keyof PermissionFlags) => {
      setPermissionsState((prev) => ({
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          [field]: !prev[categoryId]?.[field],
        },
      }));
    },
    [],
  );

  const handleSaveRole = useCallback(async () => {
    if (!id || !selectedRole) return;

    try {
      await updateRoleMutation.mutateAsync({ userId: id, role: selectedRole });
      Alert.alert('Rol actualizado', 'El rol del usuario se actualizo correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
      Alert.alert('Error', message);
    }
  }, [id, selectedRole, updateRoleMutation]);

  const handleSavePermissions = useCallback(async () => {
    if (!id) return;

    const payload: UpsertPermissionData[] = Object.entries(permissionsState).map(
      ([categoryId, flags]) => ({
        user_id: id,
        category_id: categoryId,
        can_view: flags.can_view,
        can_create: flags.can_create,
        can_edit: flags.can_edit,
        can_delete: flags.can_delete,
      }),
    );

    try {
      await savePermissionsMutation.mutateAsync({ userId: id, permissions: payload });
      Alert.alert('Permisos guardados', 'Los permisos se guardaron correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
      Alert.alert('Error', message);
    }
  }, [id, permissionsState, savePermissionsMutation]);

  // ── Handler: activar/desactivar usuario ────────────────────────────────────

  const isSelf = currentProfile?.id === id;

  const handleToggleStatus = useCallback(() => {
    if (!id || !targetUser) return;

    if (isSelf) {
      hapticError();
      Alert.alert('Accion no permitida', 'No puedes desactivar tu propia cuenta.');
      return;
    }

    const newStatus = !targetUser.is_active;
    const actionLabel = newStatus ? 'Activar' : 'Desactivar';
    const userName = targetUser.display_name ?? targetUser.full_name ?? 'este usuario';

    hapticWarning();
    Alert.alert(
      `${actionLabel} usuario`,
      `¿${actionLabel} a ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await toggleStatusMutation.mutateAsync({ userId: id, isActive: newStatus });
              hapticSuccess();
              Alert.alert(
                'Estado actualizado',
                `El usuario fue ${newStatus ? 'activado' : 'desactivado'} correctamente.`,
              );
            } catch (err) {
              hapticError();
              const message = err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  }, [id, targetUser, isSelf, toggleStatusMutation]);

  // ── Guard: solo admin ─────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="lock-outline" size={64} color={colors.textTertiary} />
        <Text
          variant="titleMedium"
          style={[styles.lockText, { color: colors.textSecondary }]}
        >
          No tienes permisos para acceder a esta seccion.
        </Text>
        <Button variant="primary" size="md" onPress={() => router.back()} icon="arrow-left">
          Volver
        </Button>
      </View>
    );
  }

  // ── Estado de carga ───────────────────────────────────────────────────────

  if (isUserLoading || isCategoriesLoading || isPermissionsLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary, marginTop: spacing.sm }}
        >
          Cargando usuario...
        </Text>
      </View>
    );
  }

  // ── Usuario no encontrado ─────────────────────────────────────────────────

  if (!targetUser) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="account-off-outline" size={64} color={colors.textTertiary} />
        <Text
          variant="titleMedium"
          style={[styles.lockText, { color: colors.textSecondary }]}
        >
          Usuario no encontrado.
        </Text>
        <Button variant="primary" size="md" onPress={() => router.back()} icon="arrow-left">
          Volver
        </Button>
      </View>
    );
  }

  const roleHasChanged = selectedRole !== targetUser.role;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Seccion 1: Informacion del usuario ──────────────────────────── */}
      <Card variant="elevated" padding="lg">
        <View style={styles.userInfoContainer}>
          {/* Avatar con iniciales */}
          <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
            <Text
              variant="headlineMedium"
              style={{ color: colors.primary, fontWeight: '700' }}
            >
              {initials}
            </Text>
          </View>

          {/* Nombre */}
          <Text
            variant="titleLarge"
            style={[styles.userName, { color: colors.text }]}
          >
            {targetUser.display_name ?? targetUser.full_name}
          </Text>

          {/* Email */}
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary }}
          >
            {targetUser.email}
          </Text>

          {/* Estado activo con toggle */}
          <View style={styles.statusToggleContainer}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: targetUser.is_active ? colors.success : colors.textTertiary },
                ]}
              />
              <Text
                variant="bodySmall"
                style={{ color: targetUser.is_active ? colors.success : colors.textTertiary }}
              >
                {targetUser.is_active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <PaperSwitch
              value={targetUser.is_active}
              onValueChange={handleToggleStatus}
              disabled={toggleStatusMutation.isPending || isSelf}
              color={colors.success}
            />
          </View>
          {isSelf && (
            <Text
              variant="labelSmall"
              style={{ color: colors.textTertiary, marginTop: spacing.xxs }}
            >
              No puedes cambiar tu propio estado
            </Text>
          )}

          {/* Miembro desde */}
          <Text
            variant="bodySmall"
            style={{ color: colors.textTertiary, marginTop: spacing.xs }}
          >
            Miembro desde {formatDate(targetUser.created_at)}
          </Text>
        </View>
      </Card>

      {/* ── Seccion 2: Gestion de rol ───────────────────────────────────── */}
      <View style={styles.section}>
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Rol del usuario
        </Text>

        <View style={styles.roleList}>
          {ROLE_CONFIG.map((config) => {
            const isSelected = selectedRole === config.role;
            return (
              <Card
                key={config.role}
                variant={isSelected ? 'elevated' : 'outlined'}
                padding="md"
                onPress={() => setSelectedRole(config.role)}
                style={
                  isSelected
                    ? { ...styles.roleCard, borderColor: colors.primary, borderWidth: 2 }
                    : styles.roleCard
                }
              >
                <View style={styles.roleCardContent}>
                  <MaterialCommunityIcons
                    name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={28}
                    color={isSelected ? colors.primary : colors.textTertiary}
                  />
                  <View style={styles.roleTextContainer}>
                    <Text
                      variant="titleSmall"
                      style={{
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: '600',
                      }}
                    >
                      {config.label}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textSecondary }}
                    >
                      {config.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={updateRoleMutation.isPending}
          disabled={updateRoleMutation.isPending || !roleHasChanged}
          onPress={handleSaveRole}
          icon="content-save-outline"
        >
          Guardar rol
        </Button>
      </View>

      {/* ── Seccion 3: Permisos por rubro ───────────────────────────────── */}
      <View style={styles.section}>
        <Text
          variant="titleMedium"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Permisos por rubro
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.sectionDescription, { color: colors.textSecondary }]}
        >
          Configura que puede hacer este usuario en cada rubro.
        </Text>

        {categories.map((category) => {
          const flags = permissionsState[category.id];
          if (!flags) return null;

          return (
            <Card
              key={category.id}
              variant="outlined"
              padding="md"
              style={styles.permissionCard}
            >
              {/* Encabezado del rubro */}
              <View style={styles.categoryHeader}>
                {category.color && (
                  <View
                    style={[styles.categoryColorDot, { backgroundColor: category.color }]}
                  />
                )}
                <MaterialCommunityIcons
                  name={(category.icon as keyof typeof MaterialCommunityIcons.glyphMap) ?? 'folder-outline'}
                  size={22}
                  color={category.color ?? colors.textSecondary}
                />
                <Text
                  variant="titleSmall"
                  style={[styles.categoryName, { color: colors.text }]}
                >
                  {category.name}
                </Text>
              </View>

              {/* Toggles de permisos */}
              <View style={styles.toggleGrid}>
                <PermissionToggle
                  label="Ver"
                  value={flags.can_view}
                  onToggle={() => handleTogglePermission(category.id, 'can_view')}
                  colors={colors}
                />
                <PermissionToggle
                  label="Crear"
                  value={flags.can_create}
                  onToggle={() => handleTogglePermission(category.id, 'can_create')}
                  colors={colors}
                />
                <PermissionToggle
                  label="Editar"
                  value={flags.can_edit}
                  onToggle={() => handleTogglePermission(category.id, 'can_edit')}
                  colors={colors}
                />
                <PermissionToggle
                  label="Eliminar"
                  value={flags.can_delete}
                  onToggle={() => handleTogglePermission(category.id, 'can_delete')}
                  colors={colors}
                />
              </View>
            </Card>
          );
        })}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={savePermissionsMutation.isPending}
          disabled={savePermissionsMutation.isPending}
          onPress={handleSavePermissions}
          icon="content-save-outline"
          style={styles.savePermissionsButton}
        >
          Guardar permisos
        </Button>
      </View>
    </ScrollView>
  );
}

// ── Componente auxiliar: toggle de permiso ─────────────────────────────────

interface PermissionToggleProps {
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function PermissionToggle({ label, value, onToggle, colors }: PermissionToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <Text
        variant="bodyMedium"
        style={{ color: colors.text, flex: 1 }}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  lockText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // ── Seccion 1: Informacion del usuario ──────────────────────────────────
  userInfoContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.smd,
  },
  userName: {
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  statusToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // ── Seccion 2: Gestion de rol ───────────────────────────────────────────
  section: {
    gap: spacing.smd,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionDescription: {
    marginBottom: spacing.xs,
  },
  roleList: {
    gap: spacing.sm,
  },
  roleCard: {
    overflow: 'hidden',
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  roleTextContainer: {
    flex: 1,
  },

  // ── Seccion 3: Permisos por rubro ───────────────────────────────────────
  permissionCard: {
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontWeight: '600',
    flex: 1,
  },
  toggleGrid: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  savePermissionsButton: {
    marginTop: spacing.xs,
  },
});
