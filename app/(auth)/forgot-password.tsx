import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { supabase } from '@/src/core/config/supabase';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME } from '@/src/core/config/constants';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electronico.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: undefined },
      );
      if (error) {
        Alert.alert(
          'Error al enviar enlace',
          error.message ?? 'Ocurrio un error inesperado.',
        );
      } else {
        setSent(true);
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor. Intenta mas tarde.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Encabezado / Logo ──────────────────────────────────────── */}
          <View style={styles.header}>
            <Text
              variant="displaySmall"
              style={[styles.appName, { color: colors.primary }]}
            >
              {APP_NAME}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: colors.textSecondary }]}
            >
              Recupera tu contrasena
            </Text>
          </View>

          {/* ── Tarjeta del formulario / estado exitoso ────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            {sent ? (
              /* ── Estado de exito ───────────────────────────────────── */
              <View style={styles.successContainer}>
                <MaterialCommunityIcons
                  name="email-check-outline"
                  size={64}
                  color={colors.primary}
                />
                <Text
                  variant="headlineSmall"
                  style={[styles.successTitle, { color: colors.text }]}
                >
                  Correo enviado
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.successMessage, { color: colors.textSecondary }]}
                >
                  Revisa tu bandeja de entrada y sigue las instrucciones para
                  restablecer tu contrasena. Si no lo ves, revisa tu carpeta de
                  spam.
                </Text>
              </View>
            ) : (
              /* ── Estado del formulario ─────────────────────────────── */
              <>
                <Text
                  variant="headlineSmall"
                  style={[styles.formTitle, { color: colors.text }]}
                >
                  Restablecer contrasena
                </Text>

                <Text
                  variant="bodyMedium"
                  style={[styles.description, { color: colors.textSecondary }]}
                >
                  Ingresa tu correo electronico y te enviaremos un enlace para
                  restablecer tu contrasena.
                </Text>

                <Input
                  label="Correo electronico"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@correo.com"
                  leftIcon="email-outline"
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  testID="forgot-password-email"
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                  onPress={handleResetPassword}
                  icon="email-send"
                  testID="forgot-password-button"
                >
                  Enviar enlace
                </Button>
              </>
            )}

            {/* ── Enlace para volver ──────────────────────────────────── */}
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => router.replace('/(auth)/login')}
              icon="arrow-left"
              testID="forgot-password-back"
            >
              Volver a inicio de sesion
            </Button>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appName: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
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
  description: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  successTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
