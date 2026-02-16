import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/src/features/categories/hooks/useCategories';
import { suggestIcon, pickUnusedColor } from '@/src/features/categories/utils/categoryDefaults';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { spacing } from '@/src/shared/theme';

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z
    .string()
    .max(500, 'La descripcion no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  budget_limit_ars: z
    .string()
    .optional()
    .or(z.literal('')),
  budget_limit_usd: z
    .string()
    .optional()
    .or(z.literal('')),
});

// ── Componente ──────────────────────────────────────────────────────────────

export default function CategoryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();

  const isCreateMode = id === 'new';
  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // Hooks de datos
  const { data: categories } = useCategories();
  const { data: category, isLoading: isCategoryLoading, error: categoryError } = useCategory(
    isCreateMode ? '' : id!
  );
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Colores en uso por categorias existentes
  const usedColors = useMemo(
    () => (categories ?? []).map((c) => c.color).filter(Boolean) as string[],
    [categories],
  );

  // Estado del formulario
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [budgetArs, setBudgetArs] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');

  // Estado de errores
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Navegacion y cambios sin guardar ────────────────────────────────────────
  const navigation = useNavigation();
  const savedRef = useRef(false);
  const colorAssignedRef = useRef(false);

  // Detectar cambios comparando contra valores originales (inmune a Strict Mode)
  const hasUnsavedChanges = useCallback((): boolean => {
    if (savedRef.current) return false;
    if (isCreateMode) {
      // Solo considerar campos editables por el usuario (nombre, descripcion, presupuestos)
      return name.trim() !== '' || description.trim() !== '' ||
        budgetArs.trim() !== '' || budgetUsd.trim() !== '';
    }
    if (!category) return false;
    return name !== (category.name ?? '') ||
      description !== (category.description ?? '') ||
      budgetArs !== (category.budget_limit_ars !== null ? String(category.budget_limit_ars) : '') ||
      budgetUsd !== (category.budget_limit_usd !== null ? String(category.budget_limit_usd) : '');
  }, [isCreateMode, category, name, description, budgetArs, budgetUsd]);

  // Advertir al usuario si navega con cambios sin guardar
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges()) return;

      e.preventDefault();
      Alert.alert(
        'Descartar cambios?',
        'Tenés cambios sin guardar. ¿Querés descartarlos?',
        [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Auto-asignar color en modo creacion (una sola vez)
  useEffect(() => {
    if (isCreateMode && !colorAssignedRef.current) {
      colorAssignedRef.current = true;
      setColor(pickUnusedColor(usedColors));
    }
  }, [isCreateMode, usedColors]);

  // Auto-sugerir icono cuando cambia el nombre (solo en modo creacion)
  useEffect(() => {
    if (!isCreateMode) return;
    const suggested = suggestIcon(name);
    if (suggested) {
      setIcon(suggested);
    } else if (name.trim().length < 2) {
      setIcon('');
    }
  }, [isCreateMode, name]);

  // Pre-rellenar en modo edicion
  useEffect(() => {
    if (!isCreateMode && category) {
      setName(category.name ?? '');
      setDescription(category.description ?? '');
      setIcon(category.icon ?? '');
      setColor(category.color ?? '');
      setBudgetArs(
        category.budget_limit_ars !== null
          ? String(category.budget_limit_ars)
          : ''
      );
      setBudgetUsd(
        category.budget_limit_usd !== null
          ? String(category.budget_limit_usd)
          : ''
      );
    }
  }, [isCreateMode, category]);

  // ── Validacion ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const result = categorySchema.safeParse({
      name,
      description,
      budget_limit_ars: budgetArs,
      budget_limit_usd: budgetUsd,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    // Validar montos numericos manualmente
    const newErrors: Record<string, string> = {};

    if (budgetArs.trim() !== '') {
      const parsed = parseFloat(budgetArs);
      if (isNaN(parsed) || parsed < 0) {
        newErrors.budget_limit_ars = 'Debe ser un numero positivo';
      }
    }

    if (budgetUsd.trim() !== '') {
      const parsed = parseFloat(budgetUsd);
      if (isNaN(parsed) || parsed < 0) {
        newErrors.budget_limit_usd = 'Debe ser un numero positivo';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [name, description, budgetArs, budgetUsd]);

  // ── Enviar formulario ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      color: color.trim() || null,
      budget_limit_ars: budgetArs.trim() ? parseFloat(budgetArs) : null,
      budget_limit_usd: budgetUsd.trim() ? parseFloat(budgetUsd) : null,
    };

    try {
      if (isCreateMode) {
        const result = await createCategory.mutateAsync(payload);
        savedRef.current = true;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Rubro creado exitosamente', 'success');
        }
        router.back();
      } else {
        const result = await updateCategory.mutateAsync({ id: id!, ...payload });
        savedRef.current = true;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Rubro actualizado exitosamente', 'success');
        }
        router.back();
      }
    } catch {
      // El error se muestra globalmente via MutationCache.onError (snackbar sanitizado)
    }
  }, [
    validate,
    name,
    description,
    icon,
    color,
    budgetArs,
    budgetUsd,
    isCreateMode,
    id,
    createCategory,
    updateCategory,
  ]);

  // ── Eliminar categoria ────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar rubro',
      'El rubro se desactivara y dejara de aparecer en las listas. Las transacciones asociadas se mantendran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(id!);
              showSnackbar('Rubro eliminado exitosamente', 'success');
              router.back();
            } catch {
              // El error se muestra globalmente via MutationCache.onError (snackbar sanitizado)
            }
          },
        },
      ]
    );
  }, [id, deleteCategory]);

  // ── Determinar si el formulario esta cargando ──────────────────────────────

  const isSubmitting = createCategory.isPending || updateCategory.isPending;
  const isDeleting = deleteCategory.isPending;

  // ── Estado de carga en modo edicion ───────────────────────────────────────

  if (!isCreateMode && isCategoryLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Editar Rubro' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginTop: spacing.sm }}
          >
            Cargando rubro...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isCreateMode && categoryError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
          <Text variant="bodyMedium" style={{ color: colors.error, marginTop: spacing.sm }}>
            No se pudo cargar el rubro
          </Text>
          <Button variant="outline" onPress={() => router.back()} style={{ marginTop: spacing.md }}>
            Volver
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          title: isCreateMode ? 'Nuevo Rubro' : 'Editar Rubro',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Tarjeta de formulario ──────────────────────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text
              variant="headlineSmall"
              style={[styles.formTitle, { color: colors.text }]}
            >
              {isCreateMode ? 'Nuevo Rubro' : 'Editar Rubro'}
            </Text>

            {/* Preview de icono y color auto-asignados */}
            <View style={styles.autoPreviewRow}>
              <View
                style={[
                  styles.autoPreviewIcon,
                  { backgroundColor: color || colors.surfaceVariant },
                ]}
              >
                <MaterialCommunityIcons
                  name={icon ? (icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']) : 'tag-outline'}
                  size={32}
                  color="#fff"
                />
              </View>
              <View style={styles.autoPreviewText}>
                <Text variant="labelMedium" style={{ color: colors.textSecondary }}>
                  {isCreateMode ? 'Icono y color automaticos' : 'Icono y color del rubro'}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                  {isCreateMode
                    ? 'Se asignan segun el nombre del rubro'
                    : 'Se actualizan al cambiar el nombre'}
                </Text>
              </View>
            </View>

            {/* Nombre */}
            <Input
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="Ej: Alimentos, Transporte..."
              leftIcon="tag-outline"
              error={errors.name}
              maxLength={100}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* Descripcion */}
            <Input
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripcion opcional del rubro"
              leftIcon="text-box-outline"
              error={errors.description}
              multiline
              numberOfLines={3}
              maxLength={500}
              autoCapitalize="sentences"
            />

            {/* Presupuesto ARS */}
            <Input
              label="Presupuesto ARS"
              value={budgetArs}
              onChangeText={setBudgetArs}
              placeholder="Ej: 50000"
              leftIcon="currency-usd"
              error={errors.budget_limit_ars}
              keyboardType="numeric"
              helperText="Limite de presupuesto en pesos argentinos"
            />

            {/* Presupuesto USD */}
            <Input
              label="Presupuesto USD"
              value={budgetUsd}
              onChangeText={setBudgetUsd}
              placeholder="Ej: 500"
              leftIcon="currency-usd"
              error={errors.budget_limit_usd}
              keyboardType="numeric"
              helperText="Limite de presupuesto en dolares"
            />

            {/* Boton de enviar */}
            <View style={styles.submitSection}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting || isDeleting}
                onPress={handleSubmit}
                icon={isCreateMode ? 'plus-circle-outline' : 'content-save-outline'}
              >
                {isCreateMode ? 'Crear Rubro' : 'Guardar Cambios'}
              </Button>
            </View>

            {/* Boton de eliminar (solo en edicion y solo admin) */}
            {!isCreateMode && isAdmin && (
              <View style={styles.deleteSection}>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  loading={isDeleting}
                  disabled={isSubmitting || isDeleting}
                  onPress={handleDelete}
                  icon="delete-outline"
                >
                  Eliminar Rubro
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  form: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  autoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  autoPreviewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoPreviewText: {
    flex: 1,
    gap: 2,
  },
  submitSection: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.sm,
  },
});
