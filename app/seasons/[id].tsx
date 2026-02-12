import { useState, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

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
import { spacing } from '@/src/shared/theme';
import type { SeasonStatus } from '@/src/core/types/database';

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const seasonSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().nullable().optional(),
  start_date: z
    .string()
    .min(1, 'La fecha de inicio es obligatoria')
    .refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return false;
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      },
      { message: 'Ingresa una fecha valida en formato DD/MM/AAAA' }
    ),
  end_date: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const parts = val.split('/');
        if (parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) return false;
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      },
      { message: 'Ingresa una fecha valida en formato DD/MM/AAAA' }
    ),
  status: z.enum(['active', 'closed', 'planning']),
});

// ── Configuracion de estados ────────────────────────────────────────────────

const STATUS_OPTIONS: { value: SeasonStatus; label: string; icon: string; color: string }[] = [
  { value: 'active', label: 'Activa', icon: 'play-circle', color: '#16a34a' },
  { value: 'planning', label: 'Planificacion', icon: 'calendar-clock', color: '#3b82f6' },
  { value: 'closed', label: 'Cerrada', icon: 'lock', color: '#6b7280' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseDateToISO(dateStr: string): string {
  const parts = dateStr.split('/');
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

function formatISOToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function SeasonFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();

  const isCreateMode = id === 'new';
  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // ── Hooks de datos ────────────────────────────────────────────────────────

  const { data: season, isLoading: isSeasonLoading } = useSeason(
    isCreateMode ? '' : id!
  );
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const deleteSeason = useDeleteSeason();
  const setCurrentSeason = useSetCurrentSeason();

  // ── Estado del formulario ─────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(getTodayFormatted());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SeasonStatus>('planning');
  const [isCurrent, setIsCurrent] = useState(false);

  // ── Estado de errores ─────────────────────────────────────────────────────

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Pre-rellenar en modo edicion ──────────────────────────────────────────

  useEffect(() => {
    if (!isCreateMode && season) {
      setName(season.name ?? '');
      setDescription(season.description ?? '');
      setStartDate(season.start_date ? formatISOToDisplay(season.start_date) : '');
      setEndDate(season.end_date ? formatISOToDisplay(season.end_date) : '');
      setStatus(season.status ?? 'planning');
      setIsCurrent(season.is_current ?? false);
    }
  }, [isCreateMode, season]);

  // ── Validacion ────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const result = seasonSchema.safeParse({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate.trim(),
      end_date: endDate.trim() || null,
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
    if (startDate.trim() && endDate.trim()) {
      const startISO = parseDateToISO(startDate.trim());
      const endISO = parseDateToISO(endDate.trim());
      if (endISO < startISO) {
        setErrors({ end_date: 'La fecha de fin debe ser posterior a la fecha de inicio' });
        return false;
      }
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
      start_date: parseDateToISO(startDate.trim()),
      end_date: endDate.trim() ? parseDateToISO(endDate.trim()) : null,
      status,
    };

    try {
      if (isCreateMode) {
        await createSeason.mutateAsync(payload);
        Alert.alert('Temporada creada', 'La temporada se creo correctamente.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      } else {
        await updateSeason.mutateAsync({ id: id!, updates: payload });

        // Si se marco como temporada actual, actualizar tambien
        if (isCurrent && !season?.is_current) {
          await setCurrentSeason.mutateAsync(id!);
        }

        Alert.alert('Temporada actualizada', 'Los cambios se guardaron correctamente.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
      Alert.alert('Error', message);
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
              Alert.alert('Temporada eliminada', 'La temporada se elimino correctamente.', [
                { text: 'Aceptar', onPress: () => router.back() },
              ]);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  }, [id, deleteSeason]);

  // ── Determinar si el formulario esta procesando ───────────────────────────

  const isSubmitting = createSeason.isPending || updateSeason.isPending || setCurrentSeason.isPending;
  const isDeleting = deleteSeason.isPending;

  // ── Estado de carga en modo edicion ───────────────────────────────────────

  if (!isCreateMode && isSeasonLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Editar Temporada',
          }}
        />
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
            <Input
              label="Fecha de inicio *"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="DD/MM/AAAA"
              leftIcon="calendar"
              error={errors.start_date}
              helperText="Formato: DD/MM/AAAA"
              keyboardType="default"
              maxLength={10}
            />

            {/* ── Fecha de fin ─────────────────────────────────────────────────── */}
            <Input
              label="Fecha de fin"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="DD/MM/AAAA (opcional)"
              leftIcon="calendar-end"
              error={errors.end_date}
              helperText="Dejar vacio si la temporada aun no finaliza"
              keyboardType="default"
              maxLength={10}
            />

            {/* ── Selector de estado ───────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Estado
              </Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.statusCard,
                        {
                          borderColor: isSelected ? option.color : colors.outlineVariant,
                          backgroundColor: isSelected ? option.color + '1A' : colors.surfaceVariant,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setStatus(option.value)}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={24}
                        color={isSelected ? option.color : colors.textTertiary}
                      />
                      <Text
                        variant="labelSmall"
                        style={{
                          color: isSelected ? option.color : colors.textSecondary,
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
                    color={isCurrent ? '#f59e0b' : colors.text}
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
