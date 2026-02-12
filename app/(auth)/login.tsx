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

import { useAuth } from '@/src/core/providers/AuthProvider';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { Input } from '@/src/shared/components/ui/Input';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME } from '@/src/core/config/constants';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useAppTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    // Validacion basica
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu correo electronico.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Por favor ingresa tu contrasena.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        const messages: Record<string, string> = {
          'Invalid login credentials':
            'Credenciales invalidas. Verifica tu correo y contrasena.',
          'Email not confirmed':
            'Debes confirmar tu correo electronico antes de iniciar sesion.',
        };
        Alert.alert(
          'Error al iniciar sesion',
          messages[error.message] ?? error.message ?? 'Ocurrio un error inesperado.',
        );
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor. Intenta mas tarde.');
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

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
              Gestion financiera simple y transparente
            </Text>
          </View>

          {/* ── Formulario ────────────────────────────────────────────── */}
          <View style={[styles.form, { backgroundColor: colors.surface }]}>
            <Text
              variant="headlineSmall"
              style={[styles.formTitle, { color: colors.text }]}
            >
              Iniciar Sesion
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
              returnKeyType="next"
              testID="login-email"
            />

            <Input
              label="Contrasena"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contrasena"
              leftIcon="lock-outline"
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="login-password"
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading}
              onPress={handleLogin}
              icon="login"
              testID="login-button"
            >
              Iniciar Sesion
            </Button>

            {/* ── Enlaces ─────────────────────────────────────────────── */}
            <Link href="/(auth)/register" asChild>
              <Text
                variant="bodyMedium"
                style={[styles.link, { color: colors.primary }]}
              >
                No tienes cuenta? Crear cuenta
              </Text>
            </Link>

            <Text
              variant="bodySmall"
              style={[styles.forgotPassword, { color: colors.textTertiary }]}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              Olvidaste tu contrasena?
            </Text>
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
  link: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
