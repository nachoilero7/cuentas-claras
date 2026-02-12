import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME } from '@/src/core/config/constants';

// ── Esquema de validacion ───────────────────────────────────────────────────

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(100, 'El nombre es demasiado largo.'),
    email: z
      .string()
      .min(1, 'El correo electronico es obligatorio.')
      .email('Ingresa un correo electronico valido.'),
    password: z
      .string()
      .min(6, 'La contrasena debe tener al menos 6 caracteres.')
      .max(72, 'La contrasena es demasiado larga.'),
    confirmPassword: z.string().min(1, 'Confirma tu contrasena.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const { colors } = useAppTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const validate = useCallback((): boolean => {
    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [fullName, email, password, confirmPassword]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const { error, needsConfirmation } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
      );
      if (error) {
        const messages: Record<string, string> = {
          'User already registered': 'Ya existe una cuenta con este correo electronico.',
          'Signup requires a valid password':
            'La contrasena debe tener al menos 6 caracteres.',
        };
        Alert.alert(
          'Error al crear cuenta',
          messages[error.message] ?? error.message ?? 'Ocurrio un error inesperado.',
        );
      } else if (needsConfirmation) {
        setRegistered(true);
      }
      // Si no necesita confirmacion, el onAuthStateChange del AuthProvider
      // se encarga de redirigir automaticamente al inicio
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor. Intenta mas tarde.');
    } finally {
      setLoading(false);
    }
  }, [validate, email, password, fullName, signUp]);

  const handleGoogleSignUp = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert(
          'Error con Google',
          error.message ?? 'No se pudo registrar con Google.',
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar con Google. Intenta mas tarde.');
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle]);

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

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
          {/* ── Encabezado ────────────────────────────────────────────── */}
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
              {registered ? 'Registro exitoso' : 'Crea tu cuenta para comenzar'}
            </Text>
          </View>

          {/* ── Contenido ─────────────────────────────────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            {registered ? (
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
                  Revisa tu correo
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.successMessage, { color: colors.textSecondary }]}
                >
                  Te enviamos un enlace de confirmacion a{' '}
                  <Text style={{ fontWeight: '700', color: colors.text }}>
                    {email}
                  </Text>
                  . Confirma tu correo para poder iniciar sesion.
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.successHint, { color: colors.textTertiary }]}
                >
                  Si no lo ves, revisa tu carpeta de spam.
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  icon="login"
                >
                  Ir a iniciar sesion
                </Button>
              </View>
            ) : (
              /* ── Formulario ─────────────────────────────────────────── */
              <>
                <Text
                  variant="headlineSmall"
                  style={[styles.formTitle, { color: colors.text }]}
                >
                  Crear Cuenta
                </Text>

                {/* ── Boton de Google ────────────────────────────────── */}
                <Pressable
                  style={[styles.googleButton, { borderColor: colors.outline }]}
                  onPress={handleGoogleSignUp}
                  disabled={googleLoading || loading}
                >
                  {googleLoading ? (
                    <ActivityIndicator size={20} color={colors.text} />
                  ) : (
                    <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
                  )}
                  <Text
                    variant="labelLarge"
                    style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '600' }}
                  >
                    Registrarse con Google
                  </Text>
                </Pressable>

                {/* ── Separador ──────────────────────────────────────── */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.textTertiary, marginHorizontal: spacing.smd }}
                  >
                    o
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
                </View>

                <Input
                  label="Nombre completo"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    clearError('fullName');
                  }}
                  placeholder="Juan Perez"
                  leftIcon="account-outline"
                  error={errors.fullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  testID="register-name"
                />

                <Input
                  label="Correo electronico"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearError('email');
                  }}
                  placeholder="tu@correo.com"
                  leftIcon="email-outline"
                  error={errors.email}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  returnKeyType="next"
                  testID="register-email"
                />

                <Input
                  label="Contrasena"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError('password');
                  }}
                  placeholder="Minimo 6 caracteres"
                  leftIcon="lock-outline"
                  error={errors.password}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                  testID="register-password"
                />

                <Input
                  label="Confirmar contrasena"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearError('confirmPassword');
                  }}
                  placeholder="Repite tu contrasena"
                  leftIcon="lock-check-outline"
                  error={errors.confirmPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  testID="register-confirm-password"
                />

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={loading || googleLoading}
                  onPress={handleRegister}
                  icon="account-plus"
                  testID="register-button"
                >
                  Crear Cuenta
                </Button>

                <Link href="/(auth)/login" asChild>
                  <Text
                    variant="bodyMedium"
                    style={[styles.link, { color: colors.primary }]}
                  >
                    Ya tienes cuenta? Iniciar sesion
                  </Text>
                </Link>
              </>
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  link: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
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
  successHint: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
