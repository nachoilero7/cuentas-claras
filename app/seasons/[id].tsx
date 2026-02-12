import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Switch, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import type { SeasonStatus } from '@/src/core/types/database';

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const seasonSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().nullable().optional(),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
  end_date: z.string().nullable().optional(),
  status: z.enum(['active', 'closed', 'planning']),
});

// ── Configuracion de estados ────────────────────────────────────────────────

const STATUS_OPTIONS: { value: SeasonStatus; label: string; icon: string; color: string }[] = [
  { value: 'active', label: 'Activa', icon: 'play-circle', color: '#16a34a' },
  { value: 'planning', label: 'Planificacion', icon: 'calendar-clock', color: '#3b82f6' },
  { value: 'closed', label: 'Cerrada', icon: 'lock', color: '#6b7280' },
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
  const [startDate, setStartDate] = useState('');
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
      setStartDate(season.start_date ?? '');
      setEndDate(season.end_date ?? '');
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

    setErrors({});
    return true;
  }, [name, description, startDate, endDate, status]);

  // ── Enviar formulario ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate.trim(),
      end_date: endDate.trim() || null,
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text
          variant="bodyMedium"
          style={{ color: colors.textSecondary }}
        >
          Cargando temporada...
        </Text>
      </View>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
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
        <View style={styles.fieldGroup}>
          <Text variant="labelLarge" style={{ color: colors.text, marginBottom: spacing.xs }}>
            Nombre *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: errors.name ? colors.error : colors.outline,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Temporada 2026"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
          {errors.name ? (
            <Text variant="bodySmall" style={{ color: colors.error, marginTop: spacing.xxs }}>
              {errors.name}
            </Text>
          ) : null}
        </View>

        {/* ── Descripcion ──────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text variant="labelLarge" style={{ color: colors.text, marginBottom: spacing.xs }}>
            Descripcion
          </Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textInputMultiline,
              {
                borderColor: colors.outline,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripcion opcional de la temporada"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            maxLength={500}
            autoCapitalize="sentences"
            textAlignVertical="top"
          />
        </View>

        {/* ── Fecha de inicio ──────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text variant="labelLarge" style={{ color: colors.text, marginBottom: spacing.xs }}>
            Fecha de inicio *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: errors.start_date ? colors.error : colors.outline,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
          {errors.start_date ? (
            <Text variant="bodySmall" style={{ color: colors.error, marginTop: spacing.xxs }}>
              {errors.start_date}
            </Text>
          ) : null}
        </View>

        {/* ── Fecha de fin ─────────────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text variant="labelLarge" style={{ color: colors.text, marginBottom: spacing.xs }}>
            Fecha de fin
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: colors.outline,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD (opcional)"
            placeholderTextColor={colors.textTertiary}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* ── Selector de estado ───────────────────────────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text variant="labelLarge" style={{ color: colors.text, marginBottom: spacing.sm }}>
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
                      borderColor: isSelected ? option.color : colors.outline,
                      backgroundColor: isSelected ? option.color + '1A' : colors.background,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setStatus(option.value)}
                >
                  <MaterialCommunityIcons
                    name={option.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={24}
                    color={isSelected ? option.color : colors.textSecondary}
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
            <Text variant="bodySmall" style={{ color: colors.error, marginTop: spacing.xxs }}>
              {errors.status}
            </Text>
          ) : null}
        </View>

        {/* ── Marcar como temporada actual (solo edicion) ─────────────────── */}
        {!isCreateMode && (
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <MaterialCommunityIcons
                name="star-outline"
                size={20}
                color={colors.text}
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
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
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
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    borderRadius: 8,
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
  submitSection: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.sm,
  },
});
