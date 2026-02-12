import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import {
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/src/features/transactions/hooks/useTransactions';
import { useCreateApproval } from '@/src/features/approvals/hooks/useApprovals';
import { sendPushToAdmins } from '@/src/core/services/pushNotifications';
import { formatCurrency } from '@/src/core/utils/currency';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { DatePickerInput } from '@/src/shared/components/ui/DatePickerInput';
import { AttachmentSection } from '@/src/features/attachments/components';
import { uploadAttachment } from '@/src/features/attachments/services';
import type { PendingImage } from '@/src/features/attachments/components';
import {
  TRANSACTION_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICONS,
} from '@/src/core/config/constants';
import { useBiometric } from '@/src/features/security';
import { spacing } from '@/src/shared/theme';
import type { TransactionType, CurrencyCode, PaymentMethod } from '@/src/core/types/database';

// ── Configuracion de tipos ──────────────────────────────────────────────────

interface TypeOption {
  key: TransactionType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const TYPE_OPTIONS_BASE: Omit<TypeOption, 'color'>[] = [
  { key: 'income', label: 'Ingreso', icon: 'trending-up' },
  { key: 'expense', label: 'Egreso', icon: 'trending-down' },
  { key: 'transfer', label: 'Transferencia', icon: 'swap-horizontal' },
];

const CURRENCY_OPTIONS: CurrencyCode[] = ['ARS', 'USD'];

const PAYMENT_METHOD_OPTIONS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: PAYMENT_METHOD_LABELS.cash, icon: PAYMENT_METHOD_ICONS.cash },
  { key: 'bank_transfer', label: PAYMENT_METHOD_LABELS.bank_transfer, icon: PAYMENT_METHOD_ICONS.bank_transfer },
  { key: 'digital_wallet', label: PAYMENT_METHOD_LABELS.digital_wallet, icon: PAYMENT_METHOD_ICONS.digital_wallet },
  { key: 'check', label: PAYMENT_METHOD_LABELS.check, icon: PAYMENT_METHOD_ICONS.check },
];

// ── Esquema de validacion con Zod ───────────────────────────────────────────

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer'], {
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
      { message: 'El monto debe ser un numero positivo' }
    ),
  currency: z.enum(['ARS', 'USD']),
  exchange_rate: z.string().optional(),
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
  transfer_to_category_id: z.string().optional(),
  transaction_date: z.string().min(1, 'La fecha es obligatoria'),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function TransactionFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();

  const isCreateMode = id === 'new';
  const role = profile?.role ?? 'viewer';
  const isAdmin = role === 'admin';

  // Opciones de tipo con colores del tema
  const TYPE_OPTIONS = useMemo(() => TYPE_OPTIONS_BASE.map((opt) => ({
    ...opt,
    color: colors[opt.key as 'income' | 'expense' | 'transfer'],
  })), [colors]);

  // Hooks de datos
  const { data: transaction, isLoading: isTransactionLoading } = useTransaction(
    isCreateMode ? '' : id!
  );
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const createApproval = useCreateApproval();
  const { authenticate } = useBiometric();

  // Estado del formulario
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('ARS');
  const [exchangeRate, setExchangeRate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferToCategoryId, setTransferToCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  // Estado de errores
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!isCreateMode && transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCurrency(transaction.currency);
      setExchangeRate(
        transaction.exchange_rate !== null ? String(transaction.exchange_rate) : ''
      );
      setDescription(transaction.description ?? '');
      setNotes(transaction.notes ?? '');
      setCategoryId(transaction.category_id ?? '');
      setTransferToCategoryId(transaction.transfer_to_category_id ?? '');
      setTransactionDate(new Date(transaction.transaction_date + 'T12:00:00'));
      setPaymentMethod(transaction.payment_method ?? 'cash');
    }
  }, [isCreateMode, transaction]);

  // Categorias activas
  const activeCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.is_active);
  }, [categories]);

  // ── Validacion ────────────────────────────────────────────────────────────

  const validate = useCallback((): boolean => {
    const dateISO = dateToISO(transactionDate);
    const dataToValidate = {
      type,
      amount,
      currency,
      exchange_rate: exchangeRate,
      description,
      notes,
      category_id: categoryId,
      transfer_to_category_id: transferToCategoryId,
      transaction_date: dateISO,
    };

    const result = transactionSchema.safeParse(dataToValidate);

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

    // Validaciones adicionales
    const newErrors: Record<string, string> = {};

    // Validar tipo de cambio obligatorio para USD
    if (currency === 'USD') {
      if (!exchangeRate.trim()) {
        newErrors.exchange_rate = 'El tipo de cambio es obligatorio para transacciones en USD';
      } else {
        const parsed = parseFloat(exchangeRate.replace(',', '.'));
        if (isNaN(parsed) || parsed <= 0) {
          newErrors.exchange_rate = 'El tipo de cambio debe ser un numero positivo';
        }
      }
    }

    // Validar rubro destino en transferencias
    if (type === 'transfer') {
      if (!transferToCategoryId) {
        newErrors.transfer_to_category_id = 'Selecciona un rubro destino para la transferencia';
      } else if (transferToCategoryId === categoryId) {
        newErrors.transfer_to_category_id = 'El rubro destino debe ser diferente al rubro origen';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [type, amount, currency, exchangeRate, description, notes, categoryId, transferToCategoryId, transactionDate]);

  // ── Enviar formulario ─────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    const parsedExchangeRate = exchangeRate.trim()
      ? parseFloat(exchangeRate.replace(',', '.'))
      : null;

    const payload = {
      type,
      amount: parsedAmount,
      currency,
      exchange_rate: parsedExchangeRate,
      amount_in_ars: currency === 'USD' && parsedExchangeRate
        ? parsedAmount * parsedExchangeRate
        : currency === 'ARS'
          ? parsedAmount
          : null,
      description: description.trim(),
      notes: notes.trim() || null,
      payment_method: paymentMethod,
      category_id: categoryId,
      transfer_to_category_id: type === 'transfer' ? transferToCategoryId : null,
      transaction_date: dateToISO(transactionDate),
    };

    try {
      if (isCreateMode) {
        // Admin: aprobacion directa. No-admin: pendiente + solicitud de aprobacion
        const status = isAdmin ? 'approved' : 'pending';
        const result = await createTransaction.mutateAsync({ ...payload, status });

        // Subir comprobantes pendientes si los hay
        if (result && pendingImages.length > 0) {
          for (const img of pendingImages) {
            try {
              await uploadAttachment(result.id, img.uri, img.fileName, img.mimeType);
            } catch {
              // Silenciar errores individuales de adjuntos (la transaccion ya se creo)
            }
          }
          setPendingImages([]);
        }

        if (!isAdmin && result) {
          // Crear solicitud de aprobacion para administradores
          await createApproval.mutateAsync({ transactionId: result.id, thresholdAmount: 0 });

          // Enviar push notification a todos los administradores
          const formattedAmount = formatCurrency(parsedAmount, currency);
          sendPushToAdmins(
            'Nueva transaccion pendiente',
            `${profile?.full_name ?? 'Un usuario'} registro: ${description.trim()} por ${formattedAmount}`,
            { type: 'approval_pending', transactionId: result.id },
          );

          Alert.alert(
            'Movimiento enviado',
            'Tu movimiento fue enviado para aprobacion. Te notificaremos cuando sea revisado por un administrador.',
            [{ text: 'Aceptar', onPress: () => router.back() }],
          );
        } else {
          Alert.alert('Movimiento registrado', 'El movimiento se registro correctamente.', [
            { text: 'Aceptar', onPress: () => router.back() },
          ]);
        }
      } else {
        await updateTransaction.mutateAsync({ id: id!, ...payload });
        Alert.alert('Movimiento actualizado', 'Los cambios se guardaron correctamente.', [
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
    type,
    amount,
    currency,
    exchangeRate,
    description,
    notes,
    categoryId,
    transferToCategoryId,
    transactionDate,
    isCreateMode,
    isAdmin,
    id,
    profile,
    pendingImages,
    createTransaction,
    createApproval,
    updateTransaction,
  ]);

  // ── Eliminar movimiento ───────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    // Verificacion biometrica antes de eliminar
    const authenticated = await authenticate('Confirma tu identidad para eliminar este movimiento');
    if (!authenticated) return;

    Alert.alert(
      'Eliminar movimiento',
      'Estas seguro que deseas eliminar este movimiento? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(id!);
              Alert.alert('Movimiento eliminado', 'El movimiento se elimino correctamente.', [
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
  }, [id, deleteTransaction, authenticate]);

  // ── Estado de carga ───────────────────────────────────────────────────────

  const isSubmitting = createTransaction.isPending || updateTransaction.isPending;
  const isDeleting = deleteTransaction.isPending;

  // ── Cargando en modo edicion ──────────────────────────────────────────────

  if (!isCreateMode && isTransactionLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Editar Movimiento',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: colors.textSecondary, marginTop: spacing.sm }}
          >
            Cargando movimiento...
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
          title: isCreateMode ? 'Nuevo Movimiento' : 'Editar Movimiento',
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
              {isCreateMode ? 'Nuevo Movimiento' : 'Editar Movimiento'}
            </Text>

            {/* ── Selector de tipo (solo en creacion) ────────────────── */}
            {isCreateMode && (
              <View style={styles.section}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  Tipo de movimiento
                </Text>
                <View style={styles.typeSelector}>
                  {TYPE_OPTIONS.map((option) => {
                    const isSelected = type === option.key;
                    return (
                      <Pressable
                        key={option.key}
                        style={[
                          styles.typeCard,
                          {
                            backgroundColor: isSelected
                              ? option.color + '18'
                              : colors.surfaceVariant,
                            borderColor: isSelected ? option.color : colors.outlineVariant,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => setType(option.key)}
                      >
                        <View
                          style={[
                            styles.typeIconContainer,
                            { backgroundColor: isSelected ? option.color + '25' : colors.surface },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={option.icon}
                            size={24}
                            color={isSelected ? option.color : colors.textTertiary}
                          />
                        </View>
                        <Text
                          variant="labelMedium"
                          style={{
                            color: isSelected ? option.color : colors.textSecondary,
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
            )}

            {/* ── Tipo (solo lectura en edicion) ─────────────────────── */}
            {!isCreateMode && (
              <View style={styles.section}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  Tipo de movimiento
                </Text>
                <View style={styles.readOnlyType}>
                  <View
                    style={[
                      styles.typeIconSmall,
                      { backgroundColor: colors[type as 'income' | 'expense' | 'transfer'] + '18' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={TYPE_OPTIONS.find((o) => o.key === type)?.icon ?? 'help'}
                      size={20}
                      color={colors[type as 'income' | 'expense' | 'transfer']}
                    />
                  </View>
                  <Text
                    variant="titleSmall"
                    style={{ color: colors[type as 'income' | 'expense' | 'transfer'], fontWeight: '600' }}
                  >
                    {TRANSACTION_TYPE_LABELS[type]}
                  </Text>
                </View>
              </View>
            )}

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

            {/* ── Tipo de cambio (solo USD) ───────────────────────────── */}
            {currency === 'USD' && (
              <Input
                label="Tipo de cambio"
                value={exchangeRate}
                onChangeText={setExchangeRate}
                placeholder="Ej: 1050,00"
                leftIcon="currency-usd"
                error={errors.exchange_rate}
                keyboardType="numeric"
                helperText="Cotizacion del dolar para convertir a pesos"
              />
            )}

            {/* ── Descripcion ────────────────────────────────────────── */}
            <Input
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              onBlur={() => validateField('description')}
              placeholder="Ej: Compra de materiales"
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

            {/* ── Metodo de pago ──────────────────────────────────── */}
            <View style={styles.section}>
              <Text
                variant="labelLarge"
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Metodo de pago
              </Text>
              <View style={styles.paymentMethodGrid}>
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
                    >
                      <MaterialCommunityIcons
                        name={option.icon as keyof typeof MaterialCommunityIcons.glyphMap}
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
                Rubro {type === 'transfer' ? '(origen)' : ''}
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

            {/* ── Rubro destino (solo transferencias) ─────────────────── */}
            {type === 'transfer' && (
              <View style={styles.section}>
                <Text
                  variant="labelLarge"
                  style={[styles.sectionLabel, { color: colors.textSecondary }]}
                >
                  Rubro destino
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsContainer}
                >
                  {activeCategories
                    .filter((cat) => cat.id !== categoryId)
                    .map((cat) => {
                      const isSelected = transferToCategoryId === cat.id;
                      const catColor = cat.color ?? colors.primary;
                      return (
                        <Chip
                          key={cat.id}
                          mode={isSelected ? 'flat' : 'outlined'}
                          selected={isSelected}
                          icon={isSelected ? 'check' : cat.icon ?? 'tag'}
                          onPress={() => setTransferToCategoryId(cat.id)}
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
                {errors.transfer_to_category_id ? (
                  <Text variant="bodySmall" style={[styles.errorText, { color: colors.error }]}>
                    {errors.transfer_to_category_id}
                  </Text>
                ) : null}
              </View>
            )}

            {/* ── Fecha ──────────────────────────────────────────────── */}
            <DatePickerInput
              label="Fecha"
              value={transactionDate}
              onChange={setTransactionDate}
              error={errors.transaction_date}
              maximumDate={new Date()}
              minimumDate={new Date(2020, 0, 1)}
            />

            {/* ── Comprobantes ─────────────────────────────────────── */}
            <AttachmentSection
              transactionId={isCreateMode ? undefined : id}
              pendingImages={pendingImages}
              onPendingImagesChange={setPendingImages}
            />

            {/* ── Nota de aprobacion para usuarios no-admin ────────── */}
            {isCreateMode && !isAdmin && (
              <View style={[styles.approvalNote, { backgroundColor: colors.warning + '15' }]}>
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.warning} />
                <Text
                  variant="bodySmall"
                  style={{ color: colors.warning, flex: 1, marginLeft: spacing.sm }}
                >
                  Tu movimiento sera enviado para aprobacion de un administrador antes de registrarse.
                </Text>
              </View>
            )}

            {/* ── Boton de enviar ────────────────────────────────────── */}
            <View style={styles.submitSection}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting || isDeleting}
                onPress={handleSubmit}
                icon={isCreateMode
                  ? (isAdmin ? 'plus-circle-outline' : 'send-outline')
                  : 'content-save-outline'}
              >
                {isCreateMode
                  ? (isAdmin ? 'Registrar Movimiento' : 'Enviar para Aprobacion')
                  : 'Guardar Cambios'}
              </Button>
            </View>

            {/* ── Boton de eliminar (solo edicion y admin) ────────────── */}
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
                  Eliminar Movimiento
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
  readOnlyType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  categoryChipsContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
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
  categoryChip: {
    borderRadius: 20,
  },
  errorText: {
    marginTop: spacing.xxs,
    fontSize: 12,
  },
  approvalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.smd,
    borderRadius: 10,
    marginTop: spacing.xs,
  },
  submitSection: {
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.sm,
  },
});
