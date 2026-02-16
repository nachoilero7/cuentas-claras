import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  Switch,
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
  useSeason,
  useCreateSeason,
  useUpdateSeason,
  useDeleteSeason,
  useSetCurrentSeason,
} from '@/src/features/seasons/hooks/useSeasons';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { DatePickerInput } from '@/src/shared/components/ui/DatePickerInput';
import { dateToISO } from '@/src/core/utils/date';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { spacing } from '@/src/shared/theme';
import type { SeasonStatus } from '@/src/core/types/database';

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const seasonSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().nullable().optional(),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
  end_date: z.string().nullable().optional(),
  status: z.enum(['active', 'closed', 'planning']),
});

// ── Configuracion de estados ────────────────────────────────────────────────

const STATUS_OPTIONS: { value: SeasonStatus; label: string; icon: string; colorKey: 'success' | 'info' | 'textSecondary' }[] = [
  { value: 'active', label: 'Activa', icon: 'play-circle', colorKey: 'success' },
  { value: 'planning', label: 'Planificacion', icon: 'calendar-clock', colorKey: 'info' },
  { value: 'closed', label: 'Cerrada', icon: 'lock', colorKey: 'textSecondary' },
];

// ── Componente ──────────────────────────────────────────────────────────────

export default function SeasonFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();

  const isCreateMode = id === 'new';
  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // ── Hooks de datos ────────────────────────────────────────────────────────

  const { data: season, isLoading: isSeasonLoading, error: seasonError } = useSeason(
    isCreateMode ? '' : id!
  );
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const deleteSeason = useDeleteSeason();
  const setCurrentSeason = useSetCurrentSeason();

  // ── Estado del formulario ─────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<SeasonStatus>('planning');
  const [isCurrent, setIsCurrent] = useState(false);

  // ── Estado de errores ─────────────────────────────────────────────────────

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Navegacion y cambios sin guardar ────────────────────────────────────────
  const navigation = useNavigation();
  const savedRef = useRef(false);

  // Determinar si hay cambios sin guardar comparando valores actuales vs originales
  const hasUnsavedChanges = useCallback(() => {
    if (savedRef.current) return false;
    if (isCreateMode) {
      return name.trim() !== '' || description.trim() !== '';
    }
    if (!season) return false;
    return (
      name !== (season.name ?? '') ||
      description !== (season.description ?? '') ||
      status !== (season.status ?? 'planning') ||
      isCurrent !== (season.is_current ?? false)
    );
  }, [isCreateMode, season, name, description, status, isCurrent]);

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

  // ── Pre-rellenar en modo edicion ──────────────────────────────────────────

  useEffect(() => {
    if (!isCreateMode && season) {
      setName(season.name ?? '');
      setDescription(season.description ?? '');
      setStartDate(
        season.start_date ? new Date(season.start_date + 'T12:00:00') : new Date()
      );
      setEndDate(
        season.end_date ? new Date(season.end_date + 'T12:00:00') : null
      );
      setStatus(season.status ?? 'planning');
      setIsCurrent(season.is_current ?? false);
    }
  }, [isCreateMode, season]);

  // ── Validacion ────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const startISO = dateToISO(startDate);
    const endISO = endDate ? dateToISO(endDate) : null;

    const result = seasonSchema.safeParse({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startISO,
      end_date: endISO,
      status,
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

    // Validacion adicional: fecha fin posterior a fecha inicio
    if (endISO && endISO < startISO) {
      setErrors({ end_date: 'La fecha de fin debe ser posterior a la fecha de inicio' });
      return false;
    }

    setErrors({});
    return true;
  }, [name, description, startDate, endDate, status]);

  // ── Enviar formulario ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: dateToISO(startDate),
      end_date: endDate ? dateToISO(endDate) : null,
      status,
    };

    try {
      if (isCreateMode) {
        const result = await createSeason.mutateAsync(payload);
        savedRef.current = true;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Temporada creada exitosamente', 'success');
        }
        router.back();
      } else {
        const result = await updateSeason.mutateAsync({ id: id!, updates: payload });

        // Si se marco como temporada actual, actualizar tambien
        if (isCurrent && !season?.is_current) {
          await setCurrentSeason.mutateAsync(id!);
        }

        savedRef.current = true;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Temporada actualizada exitosamente', 'success');
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
    startDate,
    endDate,
    status,
    isCreateMode,
    id,
    isCurrent,
    season,
    createSeason,
    updateSeason,
    setCurrentSeason,
  ]);

  // ── Eliminar temporada ────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    // No permitir borrar la temporada actual
    if (season?.is_current) {
      Alert.alert(
        'No se puede eliminar',
        'Esta temporada esta marcada como actual. Primero marca otra temporada como actual antes de eliminarla.',
      );
      return;
    }

    Alert.alert(
      'Eliminar temporada',
      'Estas seguro que deseas eliminar esta temporada? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSeason.mutateAsync(id!);
              showSnackbar('Temporada eliminada exitosamente', 'success');
              router.back();
            } catch {
              // El error se muestra globalmente via MutationCache.onError (snackbar sanitizado)
            }
          },
        },
      ]
    );
  }, [id, deleteSeason, season]);

  // ── Determinar si el formulario esta procesando ───────────────────────────

  const isSubmitting = createSeason.isPending || updateSeason.isPending || setCurrentSeason.isPending;
  const isDeleting = deleteSeason.isPending;

  // ── Estado de carga en modo edicion ───────────────────────────────────────

  if (!isCreateMode && isSeasonLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Editar Temporada' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginTop: spacing.sm }}
          >
            Cargando temporada...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isCreateMode && seasonError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
          <Text variant="bodyMedium" style={{ color: colors.error, marginTop: spacing.sm }}>
            No se pudo cargar la temporada
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
          title: isCreateMode ? 'Nueva Temporada' : 'Editar Temporada',
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
          {/* ── Tarjeta del formulario ─────────────────────────────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text
              variant="headlineSmall"
              style={[styles.formTitle, { color: colors.text }]}
            >
              {isCreateMode ? 'Nueva Temporada' : 'Editar Temporada'}
            </Text>

            {/* ── Nombre ───────────────────────────────────────────────────────── */}
            <Input
              label="Nombre *"
              value={name}
              onChangeText={setName}
              placeholder="Ej: Temporada 2026"
              leftIcon="tag-outline"
              error={errors.name}
              maxLength={100}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* ── Descripcion ──────────────────────────────────────────────────── */}
            <Input
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              placeholder="Descripcion opcional de la temporada"
              leftIcon="text-box-outline"
              error={errors.description}
              multiline
              numberOfLines={3}
              maxLength={500}
              autoCapitalize="sentences"
            />

            {/* ── Fecha de inicio ──────────────────────────────────────────────── */}
            <DatePickerInput
              label="Fecha de inicio *"
              value={startDate}
              onChange={setStartDate}
              error={errors.start_date}
            />

            {/* ── Fecha de fin ─────────────────────────────────────────────────── */}
            <DatePickerInput
              label="Fecha de fin"
              value={endDate ?? startDate}
              onChange={setEndDate}
              minimumDate={startDate}
              error={errors.end_date}
              helperText={!endDate ? 'Toca para establecer fecha de fin' : undefined}
            />

            {/* ── Selector de estado ───────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Estado
              </Text>
              <View style={styles.statusRow} accessibilityRole="radiogroup">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.statusCard,
                        {
                          borderColor: isSelected ? colors[option.colorKey] : colors.outlineVariant,
                          backgroundColor: isSelected ? colors[option.colorKey] + '1A' : colors.surfaceVariant,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setStatus(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={24}
                        color={isSelected ? colors[option.colorKey] : colors.textTertiary}
                      />
                      <Text
                        variant="labelSmall"
                        style={{
                          color: isSelected ? colors[option.colorKey] : colors.textSecondary,
                          marginTop: spacing.xxs,
                          fontWeight: isSelected ? '700' : '500',
                          textAlign: 'center',
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.status ? (
                <Text variant="bodySmall" style={[styles.errorText, { color: colors.error }]}>
                  {errors.status}
                </Text>
              ) : null}
            </View>

            {/* ── Marcar como temporada actual (solo edicion y admin) ─────────── */}
            {!isCreateMode && isAdmin && (
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <MaterialCommunityIcons
                    name="star-outline"
                    size={20}
                    color={isCurrent ? colors.warning : colors.text}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{ color: colors.text, marginLeft: spacing.sm, flex: 1 }}
                  >
                    Marcar como temporada actual
                  </Text>
                </View>
                <Switch
                  value={isCurrent}
                  onValueChange={setIsCurrent}
                  trackColor={{ false: colors.outline, true: colors.primary + '80' }}
                  thumbColor={isCurrent ? colors.primary : colors.textTertiary}
                />
              </View>
            )}

            {/* ── Boton de guardar ─────────────────────────────────────────────── */}
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
                {isCreateMode ? 'Crear Temporada' : 'Guardar Cambios'}
              </Button>
            </View>

            {/* ── Boton de eliminar (solo edicion y admin) ─────────────────────── */}
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
                  Eliminar Temporada
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
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.smd,
    marginTop: spacing.xs,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xxs,
    fontSize: 12,
  },
  submitSection: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.sm,
  },
});
