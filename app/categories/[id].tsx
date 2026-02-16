import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
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
import { useCurrentSeason } from '@/src/features/seasons/hooks/useSeasons';
import { useCategoryBalances } from '@/src/features/dashboard/hooks/useDashboard';
import { suggestIcon, pickUnusedColor } from '@/src/features/categories/utils/categoryDefaults';
import { formatCurrency } from '@/src/core/utils/currency';
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
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function CategoryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();

  const isCreateMode = id === 'new';
  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // Hooks de datos
  const { data: currentSeason } = useCurrentSeason();
  const { data: categories } = useCategories();
  const { data: category, isLoading: isCategoryLoading, error: categoryError } = useCategory(
    isCreateMode ? '' : id!
  );
  const { data: categoryBalances } = useCategoryBalances(currentSeason?.id);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Balance de esta categoria (solo en edicion)
  const balance = useMemo(() => {
    if (isCreateMode || !categoryBalances || !id) return null;
    return categoryBalances.find((b) => b.category_id === id) ?? null;
  }, [isCreateMode, categoryBalances, id]);

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
      return name.trim() !== '' || description.trim() !== '';
    }
    if (!category) return false;
    return name !== (category.name ?? '') ||
      description !== (category.description ?? '');
  }, [isCreateMode, category, name, description]);

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
    setIcon(suggested ?? '');
  }, [isCreateMode, name]);

  // Pre-rellenar en modo edicion
  useEffect(() => {
    if (!isCreateMode && category) {
      setName(category.name ?? '');
      setDescription(category.description ?? '');
      setIcon(category.icon ?? '');
      setColor(category.color ?? '');
    }
  }, [isCreateMode, category]);

  // ── Validacion ──────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const result = categorySchema.safeParse({ name, description });

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

    setErrors({});
    return true;
  }, [name, description]);

  // ── Enviar formulario ───────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      color: color.trim() || null,
    };

    try {
      if (isCreateMode) {
        const result = await createCategory.mutateAsync({
          ...payload,
          season_id: currentSeason?.id ?? null,
        });
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
    isCreateMode,
    id,
    createCategory,
    updateCategory,
    currentSeason,
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

  // Color del balance
  const balanceColor = (balance?.balance_ars ?? 0) >= 0 ? colors.income : colors.expense;

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
          {/* ── Balance del rubro (solo edicion) ───────────────────────── */}
          {!isCreateMode && balance && (
            <View style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
              <View style={styles.balanceHeader}>
                <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.primary} />
                <Text variant="titleSmall" style={{ color: colors.text, fontWeight: '600' }}>
                  Balance del rubro
                </Text>
              </View>

              <Text
                variant="headlineMedium"
                style={[styles.balanceAmount, { color: balanceColor }]}
              >
                {formatCurrency(balance.balance_ars)}
              </Text>

              <View style={styles.balanceDetails}>
                <View style={styles.balanceDetailItem}>
                  <MaterialCommunityIcons name="trending-up" size={14} color={colors.income} />
                  <Text variant="bodySmall" style={{ color: colors.textSecondary, flex: 1 }}>
                    Ingresos
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.income, fontWeight: '600' }}>
                    +{formatCurrency(balance.total_income_ars)}
                  </Text>
                </View>
                {balance.net_transfers_ars !== 0 && (
                  <View style={styles.balanceDetailItem}>
                    <MaterialCommunityIcons
                      name="swap-horizontal"
                      size={14}
                      color={balance.net_transfers_ars >= 0 ? colors.income : colors.expense}
                    />
                    <Text variant="bodySmall" style={{ color: colors.textSecondary, flex: 1 }}>
                      Transferencias
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: balance.net_transfers_ars >= 0 ? colors.income : colors.expense,
                        fontWeight: '600',
                      }}
                    >
                      {balance.net_transfers_ars >= 0 ? '+' : ''}{formatCurrency(balance.net_transfers_ars)}
                    </Text>
                  </View>
                )}
                <View style={styles.balanceDetailItem}>
                  <MaterialCommunityIcons name="trending-down" size={14} color={colors.expense} />
                  <Text variant="bodySmall" style={{ color: colors.textSecondary, flex: 1 }}>
                    Egresos
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.expense, fontWeight: '600' }}>
                    -{formatCurrency(balance.total_expenses_ars)}
                  </Text>
                </View>
              </View>

              <View style={[styles.balanceDivider, { backgroundColor: colors.outlineVariant }]} />

              <Pressable
                style={styles.balanceAction}
                onPress={() => router.push({
                  pathname: '/(tabs)/transactions',
                  params: { categoryId: id },
                })}
                accessibilityRole="button"
                accessibilityLabel="Ver movimientos de este rubro"
              >
                <Text variant="labelMedium" style={{ color: colors.primary }}>
                  Ver {balance.transaction_count} movimiento{balance.transaction_count !== 1 ? 's' : ''}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
              </Pressable>
            </View>
          )}

          {/* ── Tarjeta de formulario ──────────────────────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text
              variant="headlineSmall"
              style={[styles.formTitle, { color: colors.text }]}
            >
              {isCreateMode ? 'Nuevo Rubro' : 'Editar Rubro'}
            </Text>

            {/* Preview de icono/iniciales y color */}
            <View style={styles.autoPreviewRow}>
              <View
                style={[
                  styles.autoPreviewIcon,
                  { backgroundColor: color || colors.surfaceVariant },
                ]}
              >
                {icon ? (
                  <MaterialCommunityIcons
                    name={icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                    size={32}
                    color="#fff"
                  />
                ) : (
                  <Text style={styles.autoPreviewInitials}>
                    {getInitials(name)}
                  </Text>
                )}
              </View>
              <View style={styles.autoPreviewText}>
                <Text variant="labelMedium" style={{ color: colors.textSecondary }}>
                  {icon ? 'Icono asignado automaticamente' : 'Color asignado automaticamente'}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textTertiary }}>
                  {name.trim().length >= 2
                    ? (icon ? 'Basado en el nombre del rubro' : 'Las iniciales se muestran como identificador')
                    : 'Escribi un nombre para ver la preview'}
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
    gap: spacing.md,
  },

  // Balance del rubro
  balanceCard: {
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: spacing.smd,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceAmount: {
    fontWeight: '700',
    textAlign: 'center',
  },
  balanceDetails: {
    gap: spacing.xs,
  },
  balanceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
  },
  balanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  // Formulario
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
  autoPreviewInitials: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
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
