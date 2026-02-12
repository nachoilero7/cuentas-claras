import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import {
  useRecurringTransactions,
  useCreateRecurring,
  useUpdateRecurring,
} from '@/src/features/recurring';
import { TRANSACTION_TYPE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from '@/src/core/config/constants';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import type {
  TransactionType,
  CurrencyCode,
  PaymentMethod,
  RecurrenceFrequency,
} from '@/src/core/types/database';

// ── Constantes ──────────────────────────────────────────────────────────────

const FINANCIAL_COLORS = {
  income: '#16a34a',
  expense: '#ef4444',
  transfer: '#3b82f6',
} as const;

const TYPE_OPTIONS: { key: TransactionType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }[] = [
  { key: 'income', label: 'Ingreso', icon: 'trending-up', color: FINANCIAL_COLORS.income },
  { key: 'expense', label: 'Egreso', icon: 'trending-down', color: FINANCIAL_COLORS.expense },
  { key: 'transfer', label: 'Transferencia', icon: 'swap-horizontal', color: FINANCIAL_COLORS.transfer },
];

const CURRENCY_OPTIONS: CurrencyCode[] = ['ARS', 'USD'];

const FREQUENCY_OPTIONS: { key: RecurrenceFrequency; label: string }[] = [
  { key: 'daily', label: 'Diaria' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'biweekly', label: 'Quincenal' },
  { key: 'monthly', label: 'Mensual' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'yearly', label: 'Anual' },
];

const PAYMENT_METHOD_OPTIONS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: PAYMENT_METHOD_LABELS.cash, icon: PAYMENT_METHOD_ICONS.cash },
  { key: 'bank_transfer', label: PAYMENT_METHOD_LABELS.bank_transfer, icon: PAYMENT_METHOD_ICONS.bank_transfer },
  { key: 'digital_wallet', label: PAYMENT_METHOD_LABELS.digital_wallet, icon: PAYMENT_METHOD_ICONS.digital_wallet },
  { key: 'check', label: PAYMENT_METHOD_LABELS.check, icon: PAYMENT_METHOD_ICONS.check },
];

// ── Validacion ──────────────────────────────────────────────────────────────

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
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
  description: z.string().min(2, 'La descripcion debe tener al menos 2 caracteres'),
  category_id: z.string().uuid('Selecciona un rubro'),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  next_execution: z
    .string()
    .min(1, 'La fecha es obligatoria')
    .refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 3) return false;
        const [d, m, y] = parts.map(Number);
        const date = new Date(y, m - 1, d);
        return date.getDate() === d && date.getMonth() === m - 1;
      },
      { message: 'Fecha invalida (DD/MM/YYYY)' },
    ),
});

function getTodayFormatted(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function RecurringFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: categories } = useCategories();
  const { data: allRecurring } = useRecurringTransactions();

  const isCreateMode = id === 'new';
  const existing = useMemo(
    () => (isCreateMode ? null : allRecurring?.find((r) => r.id === id) ?? null),
    [isCreateMode, id, allRecurring],
  );

  const createMutation = useCreateRecurring();
  const updateMutation = useUpdateRecurring();

  // Form state
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferToCategoryId, setTransferToCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextExecution, setNextExecution] = useState(getTodayFormatted());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill in edit mode
  useEffect(() => {
    if (existing) {
      setType(existing.type);
      setAmount(existing.amount.toString());
      setCurrency(existing.currency);
      setDescription(existing.description);
      setNotes(existing.notes ?? '');
      setCategoryId(existing.category_id);
      setTransferToCategoryId(existing.transfer_to_category_id ?? '');
      setFrequency(existing.frequency);
      setPaymentMethod(existing.payment_method ?? 'cash');
      if (existing.next_execution) {
        const d = new Date(existing.next_execution);
        setNextExecution(
          `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        );
      }
    }
  }, [existing]);

  const activeCategories = useMemo(
    () => categories?.filter((c) => c.is_active) ?? [],
    [categories],
  );

  const handleSubmit = useCallback(async () => {
    setErrors({});

    const validation = schema.safeParse({
      type,
      amount,
      currency,
      description,
      category_id: categoryId,
      frequency,
      next_execution: nextExecution,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((e) => {
        const field = e.path[0] as string;
        fieldErrors[field] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Parse date DD/MM/YYYY to YYYY-MM-DD
    const parts = nextExecution.split('/');
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    const parsedAmount = parseFloat(amount.replace(',', '.'));

    try {
      if (isCreateMode) {
        await createMutation.mutateAsync({
          type,
          amount: parsedAmount,
          currency,
          description: description.trim(),
          notes: notes.trim() || undefined,
          payment_method: paymentMethod,
          category_id: categoryId,
          transfer_to_category_id: type === 'transfer' ? transferToCategoryId || undefined : undefined,
          frequency,
          next_execution: isoDate,
        });
        Alert.alert('Recurrente creada', 'La transaccion recurrente fue creada exitosamente.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      } else {
        await updateMutation.mutateAsync({
          id: id!,
          updates: {
            type,
            amount: parsedAmount,
            currency,
            description: description.trim(),
            notes: notes.trim() || undefined,
            payment_method: paymentMethod,
            category_id: categoryId,
            transfer_to_category_id: type === 'transfer' ? transferToCategoryId || undefined : undefined,
            frequency,
            next_execution: isoDate,
          },
        });
        Alert.alert('Recurrente actualizada', 'Los cambios fueron guardados.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrio un error inesperado.';
      Alert.alert('Error', msg);
    }
  }, [
    type, amount, currency, description, notes, categoryId,
    transferToCategoryId, frequency, nextExecution, paymentMethod,
    isCreateMode, id, createMutation, updateMutation,
  ]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo */}
        <Text variant="labelLarge" style={[styles.label, { color: colors.text }]}>
          Tipo de movimiento
        </Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => {
            const isActive = type === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: isActive ? opt.color + '18' : colors.surface,
                    borderColor: isActive ? opt.color : colors.outline,
                  },
                ]}
                onPress={() => setType(opt.key)}
              >
                <MaterialCommunityIcons name={opt.icon} size={22} color={isActive ? opt.color : colors.textSecondary} />
                <Text
                  variant="labelMedium"
                  style={{ color: isActive ? opt.color : colors.textSecondary, fontWeight: isActive ? '600' : '400' }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Monto y moneda */}
        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <Input
              label="Monto"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              error={errors.amount}
            />
          </View>
          <View style={styles.currencyChips}>
            {CURRENCY_OPTIONS.map((c) => (
              <Chip
                key={c}
                mode={currency === c ? 'flat' : 'outlined'}
                selected={currency === c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.chip,
                  currency === c
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={{ color: currency === c ? colors.onPrimary : colors.textSecondary, fontSize: 13 }}
                showSelectedOverlay={false}
                showSelectedCheck={false}
              >
                {c}
              </Chip>
            ))}
          </View>
        </View>

        {/* Descripcion */}
        <Input
          label="Descripcion"
          value={description}
          onChangeText={setDescription}
          error={errors.description}
        />

        {/* Notas */}
        <Input
          label="Notas (opcional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
        />

        {/* Rubro */}
        <Text variant="labelLarge" style={[styles.label, { color: colors.text }]}>
          Rubro
        </Text>
        {errors.category_id && (
          <Text variant="bodySmall" style={{ color: colors.error, marginBottom: spacing.xs }}>
            {errors.category_id}
          </Text>
        )}
        <View style={styles.categoriesGrid}>
          {activeCategories.map((cat) => {
            const isActive = categoryId === cat.id;
            return (
              <Chip
                key={cat.id}
                mode={isActive ? 'flat' : 'outlined'}
                selected={isActive}
                onPress={() => setCategoryId(cat.id)}
                style={[
                  styles.chip,
                  isActive
                    ? { backgroundColor: cat.color ?? colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={{
                  color: isActive ? '#fff' : colors.textSecondary,
                  fontSize: 13,
                }}
                showSelectedOverlay={false}
                showSelectedCheck={false}
              >
                {cat.name}
              </Chip>
            );
          })}
        </View>

        {/* Destino (transfer) */}
        {type === 'transfer' && (
          <>
            <Text variant="labelLarge" style={[styles.label, { color: colors.text }]}>
              Rubro destino
            </Text>
            <View style={styles.categoriesGrid}>
              {activeCategories
                .filter((c) => c.id !== categoryId)
                .map((cat) => {
                  const isActive = transferToCategoryId === cat.id;
                  return (
                    <Chip
                      key={cat.id}
                      mode={isActive ? 'flat' : 'outlined'}
                      selected={isActive}
                      onPress={() => setTransferToCategoryId(cat.id)}
                      style={[
                        styles.chip,
                        isActive
                          ? { backgroundColor: cat.color ?? colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.outline },
                      ]}
                      textStyle={{ color: isActive ? '#fff' : colors.textSecondary, fontSize: 13 }}
                      showSelectedOverlay={false}
                      showSelectedCheck={false}
                    >
                      {cat.name}
                    </Chip>
                  );
                })}
            </View>
          </>
        )}

        {/* Frecuencia */}
        <Text variant="labelLarge" style={[styles.label, { color: colors.text }]}>
          Frecuencia
        </Text>
        {errors.frequency && (
          <Text variant="bodySmall" style={{ color: colors.error, marginBottom: spacing.xs }}>
            {errors.frequency}
          </Text>
        )}
        <View style={styles.categoriesGrid}>
          {FREQUENCY_OPTIONS.map((opt) => {
            const isActive = frequency === opt.key;
            return (
              <Chip
                key={opt.key}
                mode={isActive ? 'flat' : 'outlined'}
                selected={isActive}
                onPress={() => setFrequency(opt.key)}
                icon={isActive ? 'check' : 'repeat'}
                style={[
                  styles.chip,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={{ color: isActive ? colors.onPrimary : colors.textSecondary, fontSize: 13 }}
                showSelectedOverlay={false}
                showSelectedCheck={false}
              >
                {opt.label}
              </Chip>
            );
          })}
        </View>

        {/* Metodo de pago */}
        <Text variant="labelLarge" style={[styles.label, { color: colors.text }]}>
          Metodo de pago
        </Text>
        <View style={styles.categoriesGrid}>
          {PAYMENT_METHOD_OPTIONS.map((opt) => {
            const isActive = paymentMethod === opt.key;
            return (
              <Chip
                key={opt.key}
                mode={isActive ? 'flat' : 'outlined'}
                selected={isActive}
                onPress={() => setPaymentMethod(opt.key)}
                icon={opt.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                style={[
                  styles.chip,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.outline },
                ]}
                textStyle={{ color: isActive ? colors.onPrimary : colors.textSecondary, fontSize: 13 }}
                showSelectedOverlay={false}
                showSelectedCheck={false}
              >
                {opt.label}
              </Chip>
            );
          })}
        </View>

        {/* Proxima ejecucion */}
        <Input
          label="Proxima ejecucion (DD/MM/YYYY)"
          value={nextExecution}
          onChangeText={setNextExecution}
          keyboardType="numeric"
          error={errors.next_execution}
        />

        {/* Botones */}
        <View style={styles.buttonsRow}>
          <Button
            variant="outline"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            style={{ flex: 1 }}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={isCreateMode ? 'plus' : 'content-save'}
          >
            {isCreateMode ? 'Crear' : 'Guardar'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 100,
    gap: spacing.smd,
  },
  label: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.smd,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  currencyChips: {
    flexDirection: 'column',
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
