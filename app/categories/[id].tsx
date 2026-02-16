import { useState, useEffect, useCallback, useRef } from 'react';
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
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/src/features/categories/hooks/useCategories';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { IconPicker } from '@/src/shared/components/ui/IconPicker';
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
  icon: z
    .string()
    .max(50, 'El icono no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal valido (ej: #FF5722)')
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
  const { data: category, isLoading: isCategoryLoading, error: categoryError } = useCategory(
    isCreateMode ? '' : id!
  );
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

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
  const hasUnsavedChanges = useRef(false);
  const isInitialMount = useRef(true);

  // Marcar formulario como modificado cuando cambian los campos (skip inicial)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    hasUnsavedChanges.current = true;
  }, [name, description, icon, color, budgetArs, budgetUsd]);

  // Advertir al usuario si navega con cambios sin guardar
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges.current) return;

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
  }, [navigation]);

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
      // Prefill no cuenta como cambio del usuario
      setTimeout(() => { hasUnsavedChanges.current = false; }, 0);
    }
  }, [isCreateMode, category]);

  // ── Validacion ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const result = categorySchema.safeParse({
      name,
      description,
      icon,
      color,
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
  }, [name, description, icon, color, budgetArs, budgetUsd]);

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
        hasUnsavedChanges.current = false;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Rubro creado exitosamente', 'success');
        }
        router.back();
      } else {
        const result = await updateCategory.mutateAsync({ id: id!, ...payload });
        hasUnsavedChanges.current = false;
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
  const isColorValid = color.trim() === '' || /^#[0-9A-Fa-f]{6}$/.test(color.trim());

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

            {/* Icono */}
            <IconPicker
              label="Icono"
              value={icon}
              onSelect={setIcon}
              error={errors.icon}
            />

            {/* Color */}
            <View style={styles.colorRow}>
              <View style={styles.colorInputWrapper}>
                <Input
                  label="Color"
                  value={color}
                  onChangeText={setColor}
                  placeholder="#FF5722"
                  leftIcon="palette-outline"
                  error={errors.color}
                  helperText="Color hexadecimal (ej: #FF5722)"
                  maxLength={7}
                  autoCapitalize="characters"
                />
              </View>
              {color.trim() !== '' && isColorValid && (
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: color.trim() },
                  ]}
                />
              )}
            </View>

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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.smd,
  },
  colorInputWrapper: {
    flex: 1,
  },
  colorPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  submitSection: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.sm,
  },
});
