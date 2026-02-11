/**
 * Componente Input personalizado para Cuentas Claras
 *
 * Envuelve el TextInput de React Native Paper con soporte para
 * estados de error, iconos, y campo de contrasena.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';
import type { TextInputProps as PaperTextInputProps } from 'react-native-paper';

import { spacing, borderRadius } from '@/src/shared/theme/spacing';
import { typography } from '@/src/shared/theme/typography';

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface InputProps {
  /** Etiqueta del campo (en espanol) */
  label: string;
  /** Valor actual del campo */
  value: string;
  /** Funcion al cambiar el texto */
  onChangeText: (text: string) => void;
  /** Texto de ayuda o placeholder */
  placeholder?: string;
  /** Mensaje de error (se muestra si existe) */
  error?: string;
  /** Texto de ayuda debajo del campo */
  helperText?: string;
  /** Si es campo de contrasena (muestra toggle de visibilidad) */
  secureTextEntry?: boolean;
  /** Nombre del icono a la izquierda (MaterialCommunityIcons) */
  leftIcon?: string;
  /** Nombre del icono a la derecha (MaterialCommunityIcons) */
  rightIcon?: string;
  /** Handler al presionar el icono derecho */
  onRightIconPress?: () => void;
  /** Tipo de teclado */
  keyboardType?: PaperTextInputProps['keyboardType'];
  /** Tipo de autocompletado */
  autoComplete?: PaperTextInputProps['autoComplete'];
  /** Capitalizacion automatica */
  autoCapitalize?: PaperTextInputProps['autoCapitalize'];
  /** Multilinea */
  multiline?: boolean;
  /** Numero de lineas visibles (para multilinea) */
  numberOfLines?: number;
  /** Maximo de caracteres */
  maxLength?: number;
  /** Campo desactivado */
  disabled?: boolean;
  /** Editable */
  editable?: boolean;
  /** Estilo del contenedor */
  style?: ViewStyle;
  /** Estilo del input */
  inputStyle?: TextStyle;
  /** Clases de NativeWind */
  className?: string;
  /** Referencia al input nativo */
  inputRef?: React.Ref<any>;
  /** Tipo de retorno del teclado */
  returnKeyType?: PaperTextInputProps['returnKeyType'];
  /** Handler al presionar el boton de retorno */
  onSubmitEditing?: () => void;
  /** Se dispara al enfocar */
  onFocus?: () => void;
  /** Se dispara al desenfocar */
  onBlur?: () => void;
  /** ID para pruebas */
  testID?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  keyboardType,
  autoComplete,
  autoCapitalize,
  multiline = false,
  numberOfLines,
  maxLength,
  disabled = false,
  editable = true,
  style,
  inputStyle,
  className,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  onFocus,
  onBlur,
  testID,
}: InputProps) {
  const theme = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const hasError = !!error;

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  // Determinar si debemos ocultar el texto
  const shouldHideText = secureTextEntry && !isPasswordVisible;

  // Construir el icono izquierdo
  const leftAdornment = leftIcon ? (
    <TextInput.Icon icon={leftIcon} />
  ) : undefined;

  // Construir el icono derecho
  const rightAdornment = secureTextEntry ? (
    <TextInput.Icon
      icon={isPasswordVisible ? 'eye-off' : 'eye'}
      onPress={togglePasswordVisibility}
      forceTextInputFocus={false}
    />
  ) : rightIcon ? (
    <TextInput.Icon
      icon={rightIcon}
      onPress={onRightIconPress}
      forceTextInputFocus={false}
    />
  ) : undefined;

  // Texto debajo del campo
  const bottomText = hasError ? error : helperText;
  const bottomTextType = hasError ? 'error' : 'info';

  return (
    <View style={[styles.container, style]} className={className}>
      <TextInput
        ref={inputRef}
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={hasError}
        secureTextEntry={shouldHideText}
        left={leftAdornment}
        right={rightAdornment}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        disabled={disabled}
        editable={editable}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.input, inputStyle]}
        outlineStyle={styles.outline}
        contentStyle={styles.content}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        textColor={theme.colors.onSurface}
        testID={testID}
      />
      {bottomText ? (
        <HelperText
          type={bottomTextType}
          visible={!!bottomText}
          style={styles.helperText}
        >
          {bottomText}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    fontSize: typography.body1.fontSize,
  },
  outline: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  content: {
    paddingHorizontal: spacing.md,
  },
  helperText: {
    paddingHorizontal: spacing.xs,
    fontSize: typography.caption.fontSize,
  },
});
