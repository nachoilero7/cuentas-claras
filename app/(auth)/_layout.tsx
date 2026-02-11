import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/core/providers/AuthProvider';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Mientras se verifica la sesion, no renderizar nada
  if (isLoading) {
    return null;
  }

  // Si ya esta autenticado, redirigir al inicio
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
