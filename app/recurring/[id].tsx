import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import {
  useRecurringTransactions,
  useCreateRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
} from '@/src/features/recurring';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
} from '@/src/core/config/constants';
import { useBiometric } from '@/src/features/security';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { DatePickerInput } from '@/src/shared/components/ui/DatePickerInput';
import { showSnackbar } from '@/src/shared/lib/snackbar';
import { spacing } from '@/src/shared/theme';
import type {
  TransactionType,
  CurrencyCode,
  PaymentMethod,
  RecurrenceFrequency,
} from '@/src/core/types/database';

// ── Configuracion de tipos ──────────────────────────────────────────────────

interface TypeOption {
  key: TransactionType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const TYPE_OPTIONS: TypeOption[] = [
  { key: 'income', label: 'Ingreso', icon: 'trending-up' },
  { key: 'expense', label: 'Egreso', icon: 'trending-down' },
];

const CURRENCY_OPTIONS: CurrencyCode[] = ['ARS', 'USD'];

const PAYMENT_METHOD_OPTIONS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: PAYMENT_METHOD_LABELS.cash, icon: PAYMENT_METHOD_ICONS.cash },
  { key: 'bank_transfer', label: PAYMENT_METHOD_LABELS.bank_transfer, icon: PAYMENT_METHOD_ICONS.bank_transfer },
  { key: 'digital_wallet', label: PAYMENT_METHOD_LABELS.digital_wallet, icon: PAYMENT_METHOD_ICONS.digital_wallet },
  { key: 'check', label: PAYMENT_METHOD_LABELS.check, icon: PAYMENT_METHOD_ICONS.check },
];

interface FrequencyOption {
  key: RecurrenceFrequency;
  label: string;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { key: 'daily', label: 'Diaria' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'biweekly', label: 'Quincenal' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'yearly', label: 'Anual' },
];

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const recurringSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'Selecciona un tipo de movimiento',
  }),
  amount: z
    .string()
    .min(1, 'El monto es obligatorio')
    .refine(
      (val) => {
        const num = parseFloat(val.replace(',', '.'));
        return !isNaN(num) && num > 0;
      },
      { message: 'El monto debe ser un numero positivo' },
    ),
  currency: z.enum(['ARS', 'USD']),
  description: z
    .string()
    .min(2, 'La descripcion debe tener al menos 2 caracteres')
    .max(200, 'La descripcion no puede exceder 200 caracteres'),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  category_id: z.string().uuid('Selecciona un rubro'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'], {
    required_error: 'Selecciona una frecuencia',
  }),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: categories } = useCategories();

  const isCreateMode = id === 'new';

  // Hooks de datos
  const { data: recurringItems, isLoading: isRecurringLoading, error: recurringError } = useRecurringTransactions();
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const { authenticate } = useBiometric();

  // Buscar item existente en modo edicion
  const existingItem = useMemo(() => {
    if (isCreateMode || !recurringItems) return null;
    return recurringItems.find((item) => item.id === id) ?? null;
  }, [isCreateMode, recurringItems, id]);

  // Estado del formulario
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDate, setShowEndDate] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

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
  }, [type, amount, currency, description, notes, categoryId, frequency, startDate, endDate, paymentMethod]);

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

  // Validacion inline por campo
  const validateField = useCallback(
    (field: string) => {
      let fieldError = '';
      switch (field) {
        case 'amount': {
          if (!amount.trim()) {
            fieldError = 'El monto es obligatorio';
          } else {
            const num = parseFloat(amount.replace(',', '.'));
            if (isNaN(num) || num <= 0) fieldError = 'El monto debe ser un numero positivo';
          }
          break;
        }
        case 'description': {
          if (description.length > 0 && description.length < 2)
            fieldError = 'La descripcion debe tener al menos 2 caracteres';
          if (description.length > 200)
            fieldError = 'La descripcion no puede exceder 200 caracteres';
          break;
        }
      }
      setErrors((prev) => {
        if (!fieldError) {
          const { [field]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [field]: fieldError };
      });
    },
    [amount, description],
  );

  // Pre-rellenar en modo edicion
  useEffect(() => {
    if (!isCreateMode && existingItem) {
      setType(existingItem.type);
      setAmount(String(existingItem.amount));
      setCurrency(existingItem.currency);
      setDescription(existingItem.description ?? '');
      setNotes(existingItem.notes ?? '');
      setCategoryId(existingItem.category_id ?? '');
      setFrequency(existingItem.frequency);
      setStartDate(new Date(existingItem.next_execution + 'T12:00:00'));
      setPaymentMethod(existingItem.payment_method ?? 'cash');
      // Prefill no cuenta como cambio del usuario
      setTimeout(() => { hasUnsavedChanges.current = false; }, 0);
    }
  }, [isCreateMode, existingItem]);

  // Categorias activas
  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.is_active);
  }, [categories]);

  // ── Validacion ────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const dateISO = dateToISO(startDate);
    const dataToValidate = {
      type,
      amount,
      currency,
      description,
      notes,
      category_id: categoryId,
      frequency,
      start_date: dateISO,
    };

    const result = recurringSchema.safeParse(dataToValidate);

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
  }, [type, amount, currency, description, notes, categoryId, frequency, startDate]);

  // ── Enviar formulario ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));

    const payload = {
      type,
      amount: parsedAmount,
      currency,
      description: description.trim(),
      notes: notes.trim() || undefined,
      payment_method: paymentMethod,
      category_id: categoryId,
      frequency,
      next_execution: dateToISO(startDate),
    };

    try {
      if (isCreateMode) {
        const result = await createRecurring.mutateAsync(payload);
        hasUnsavedChanges.current = false;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Recurrente creada exitosamente', 'success');
        }
        router.back();
      } else {
        const result = await updateRecurring.mutateAsync({
          id: id!,
          updates: payload,
        });
        hasUnsavedChanges.current = false;
        if (result) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSnackbar('Recurrente actualizada exitosamente', 'success');
        }
        router.back();
      }
    } catch {
      // El error se muestra globalmente via MutationCache.onError (snackbar sanitizado)
    }
  }, [
    validate,
    type,
    amount,
    currency,
    description,
    notes,
    categoryId,
    frequency,
    startDate,
    paymentMethod,
    isCreateMode,
    id,
    createRecurring,
    updateRecurring,
  ]);

  // ── Eliminar recurrente ───────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    const authenticated = await authenticate('Confirma tu identidad para eliminar');
    if (!authenticated) return;

    Alert.alert(
      'Eliminar recurrente',
      'Estas seguro que deseas eliminar esta transaccion recurrente? No se eliminaran las transacciones ya creadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurring.mutateAsync(id!);
              showSnackbar('Recurrente eliminada exitosamente', 'success');
              router.back();
            } catch {
              // El error se muestra globalmente via MutationCache.onError (snackbar sanitizado)
            }
          },
        },
      ],
    );
  }, [id, deleteRecurring, authenticate]);

  // ── Estado de carga ───────────────────────────────────────────────────────

  const isSubmitting = createRecurring.isPending || updateRecurring.isPending;
  const isDeleting = deleteRecurring.isPending;

  // ── Cargando en modo edicion ──────────────────────────────────────────────

  if (!isCreateMode && isRecurringLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Editar Recurrente' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginTop: spacing.sm }}
          >
            Cargando recurrente...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isCreateMode && recurringError) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.error} />
          <Text variant="bodyMedium" style={{ color: colors.error, marginTop: spacing.sm }}>
            No se pudo cargar el recurrente
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
          title: isCreateMode ? 'Nueva Recurrente' : 'Editar Recurrente',
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
              {isCreateMode ? 'Nueva Recurrente' : 'Editar Recurrente'}
            </Text>

            {/* ── Selector de tipo ────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Tipo de movimiento
              </Text>
              <View style={styles.typeSelector} accessibilityRole="radiogroup">
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = type === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: isSelected
                            ? colors[option.key] + '18'
                            : colors.surfaceVariant,
                          borderColor: isSelected ? colors[option.key] : colors.outlineVariant,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setType(option.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                    >
                      <View
                        style={[
                          styles.typeIconContainer,
                          { backgroundColor: isSelected ? colors[option.key] + '25' : colors.surface },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={option.icon}
                          size={24}
                          color={isSelected ? colors[option.key] : colors.textTertiary}
                        />
                      </View>
                      <Text
                        variant="labelMedium"
                        style={{
                          color: isSelected ? colors[option.key] : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.type ? (
                <Text variant="bodySmall" style={[styles.errorText, { color: colors.error }]}>
                  {errors.type}
                </Text>
              ) : null}
            </View>

            {/* ── Monto ──────────────────────────────────────────────── */}
            <Input
              label="Monto"
              value={amount}
              onChangeText={setAmount}
              onBlur={() => validateField('amount')}
              placeholder="0,00"
              leftIcon="cash"
              error={errors.amount}
              keyboardType="numeric"
              inputStyle={styles.amountInput}
            />

            {/* ── Moneda ─────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Moneda
              </Text>
              <View style={styles.currencyChips}>
                {CURRENCY_OPTIONS.map((curr) => {
                  const isSelected = currency === curr;
                  return (
                    <Chip
                      key={curr}
                      mode={isSelected ? 'flat' : 'outlined'}
                      selected={isSelected}
                      onPress={() => setCurrency(curr)}
                      style={[
                        styles.currencyChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.outline },
                      ]}
                      textStyle={{
                        color: isSelected ? colors.onPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      }}
                      showSelectedOverlay={false}
                      showSelectedCheck={false}
                    >
                      {curr}
                    </Chip>
                  );
                })}
              </View>
            </View>

            {/* ── Descripcion ────────────────────────────────────────── */}
            <Input
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              onBlur={() => validateField('description')}
              placeholder="Ej: Cuota mensual del gimnasio"
              leftIcon="text-box-outline"
              error={errors.description}
              maxLength={200}
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            {/* ── Notas ──────────────────────────────────────────────── */}
            <Input
              label="Notas"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas adicionales (opcional)"
              leftIcon="note-text-outline"
              error={errors.notes}
              multiline
              numberOfLines={3}
              maxLength={500}
              autoCapitalize="sentences"
            />

            {/* ── Frecuencia ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Frecuencia
              </Text>
              <View style={styles.frequencyChips}>
                {FREQUENCY_OPTIONS.map((option) => {
                  const isSelected = frequency === option.key;
                  return (
                    <Chip
                      key={option.key}
                      mode={isSelected ? 'flat' : 'outlined'}
                      selected={isSelected}
                      onPress={() => setFrequency(option.key)}
                      style={[
                        styles.frequencyChip,
                        isSelected
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.outline },
                      ]}
                      textStyle={{
                        color: isSelected ? colors.onPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      }}
                      showSelectedOverlay={false}
                      showSelectedCheck={false}
                    >
                      {option.label}
                    </Chip>
                  );
                })}
              </View>
              {errors.frequency ? (
                <Text variant="bodySmall" style={[styles.errorText, { color: colors.error }]}>
                  {errors.frequency}
                </Text>
              ) : null}
            </View>

            {/* ── Metodo de pago ──────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Metodo de pago
              </Text>
              <View style={styles.paymentMethodGrid} accessibilityRole="radiogroup">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const isSelected = paymentMethod === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={[
                        styles.paymentMethodCard,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + '15'
                            : colors.surfaceVariant,
                          borderColor: isSelected ? colors.primary : colors.outlineVariant,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setPaymentMethod(option.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={option.label}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={20}
                        color={isSelected ? colors.primary : colors.textTertiary}
                      />
                      <Text
                        variant="labelSmall"
                        style={{
                          color: isSelected ? colors.primary : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                          textAlign: 'center',
                        }}
                        numberOfLines={2}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Rubro ──────────────────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Rubro
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsContainer}
              >
                {activeCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  const catColor = cat.color ?? colors.primary;
                  return (
                    <Chip
                      key={cat.id}
                      mode={isSelected ? 'flat' : 'outlined'}
                      selected={isSelected}
                      icon={isSelected ? 'check' : cat.icon ?? 'tag'}
                      onPress={() => setCategoryId(cat.id)}
                      style={[
                        styles.categoryChip,
                        isSelected
                          ? { backgroundColor: catColor + '25', borderColor: catColor, borderWidth: 1.5 }
                          : { backgroundColor: colors.surface, borderColor: colors.outline },
                      ]}
                      textStyle={{
                        color: isSelected ? catColor : colors.textSecondary,
                        fontWeight: isSelected ? '600' : '400',
                      }}
                      showSelectedOverlay={false}
                      showSelectedCheck={false}
                    >
                      {cat.name}
                    </Chip>
                  );
                })}
              </ScrollView>
              {errors.category_id ? (
                <Text variant="bodySmall" style={[styles.errorText, { color: colors.error }]}>
                  {errors.category_id}
                </Text>
              ) : null}
            </View>

            {/* ── Fecha de inicio ────────────────────────────────────── */}
            <DatePickerInput
              label="Fecha de inicio"
              value={startDate}
              onChange={setStartDate}
              error={errors.start_date}
              minimumDate={new Date(2020, 0, 1)}
            />

            {/* ── Fecha de fin (opcional) ────────────────────────────── */}
            <View style={styles.section}>
              <Pressable
                style={styles.endDateToggle}
                onPress={() => {
                  if (showEndDate) {
                    setEndDate(null);
                    setShowEndDate(false);
                  } else {
                    const defaultEnd = new Date();
                    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
                    setEndDate(defaultEnd);
                    setShowEndDate(true);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={showEndDate ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
                  size={22}
                  color={showEndDate ? colors.primary : colors.textTertiary}
                />
                <Text
                  variant="labelLarge"
                  style={{ color: showEndDate ? colors.primary : colors.textSecondary, fontWeight: '600' }}
                >
                  Fecha de finalizacion (opcional)
                </Text>
              </Pressable>
              {showEndDate && endDate && (
                <DatePickerInput
                  label="Fecha de fin"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={startDate}
                />
              )}
            </View>

            {/* ── Boton de enviar ────────────────────────────────────── */}
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
                {isCreateMode ? 'Crear Recurrente' : 'Guardar Cambios'}
              </Button>
            </View>

            {/* ── Boton de eliminar (solo edicion) ────────────────────── */}
            {!isCreateMode && (
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
                  Eliminar Recurrente
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
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
  },
  currencyChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currencyChip: {
    borderRadius: 20,
  },
  frequencyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  frequencyChip: {
    borderRadius: 20,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentMethodCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.smd,
    borderRadius: 10,
  },
  categoryChipsContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    borderRadius: 20,
  },
  endDateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
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
