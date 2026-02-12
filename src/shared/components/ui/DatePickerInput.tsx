import { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/shared/theme';

interface DatePickerInputProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  error?: string;
  helperText?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function DatePickerInput({
  label,
  value,
  onChange,
  error,
  helperText,
  maximumDate,
  minimumDate,
}: DatePickerInputProps) {
  const { colors } = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handlePress = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      // En Android, dismiss cierra el picker
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }

      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }

      // En iOS, el picker queda abierto -> cerrar al confirmar
      if (Platform.OS === 'ios' && event.type === 'set') {
        setShowPicker(false);
      }
    },
    [onChange],
  );

  const handleDismissIOS = useCallback(() => {
    setShowPicker(false);
  }, []);

  const hasError = !!error;
  const borderColor = hasError ? colors.error : colors.outline;

  return (
    <View style={styles.container}>
      <Text
        variant="labelLarge"
        style={[styles.label, { color: colors.textSecondary }]}
      >
        {label}
      </Text>

      <Pressable
        onPress={handlePress}
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDateDisplay(value)}. Toca para cambiar.`}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={hasError ? colors.error : colors.textTertiary}
        />
        <Text
          variant="bodyLarge"
          style={[styles.dateText, { color: colors.text }]}
        >
          {formatDateDisplay(value)}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={colors.textTertiary}
        />
      </Pressable>

      {hasError && (
        <Text variant="bodySmall" style={[styles.helperText, { color: colors.error }]}>
          {error}
        </Text>
      )}

      {!hasError && helperText && (
        <Text variant="bodySmall" style={[styles.helperText, { color: colors.textTertiary }]}>
          {helperText}
        </Text>
      )}

      {showPicker && (
        <>
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            locale="es-AR"
          />
          {Platform.OS === 'ios' && (
            <View style={styles.iosActions}>
              <Pressable onPress={handleDismissIOS}>
                <Text
                  variant="labelLarge"
                  style={{ color: colors.primary, fontWeight: '600' }}
                >
                  Listo
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.smd,
    height: 48,
    gap: spacing.sm,
  },
  dateText: {
    flex: 1,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: spacing.xxs,
  },
  iosActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
