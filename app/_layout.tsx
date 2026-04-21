import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { initSentry } from '@/src/core/config/sentry';
import { QueryProvider } from '@/src/core/providers/QueryProvider';
import { ThemeProvider } from '@/src/core/providers/ThemeProvider';
import { AuthProvider } from '@/src/core/providers/AuthProvider';
import { RealtimeProvider } from '@/src/core/providers/RealtimeProvider';
import { OfflineBanner } from '@/src/shared/components/feedback/OfflineBanner';
import { OfflineQueueIndicator } from '@/src/shared/components/feedback/OfflineQueueIndicator';
import { SnackbarHost } from '@/src/shared/components/feedback/SnackbarHost';
import { AppErrorBoundary } from '@/src/shared/components/feedback/AppErrorBoundary';
import { queryClient } from '@/src/core/config/queryClient';
import { restoreQueryCache, persistQueryCache } from '@/src/sync/queryPersister';
import { startSyncListener } from '@/src/sync/SyncManager';
import { usePushNotifications } from '@/src/core/hooks/usePushNotifications';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Inicializar Sentry para error tracking
initSentry();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Si la fuente ya estaba registrada (CTFontManagerError 104) la app puede continuar igual
  useEffect(() => {
    if (fontError) console.warn('[Fonts]', fontError.message);
  }, [fontError]);

  // Hide splash screen once fonts are loaded (o si hubo error de registro previo)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Restaurar cache persistido al iniciar
  useEffect(() => {
    restoreQueryCache(queryClient);
  }, []);

  // Persistir cache periodicamente y al desmontar
  useEffect(() => {
    const interval = setInterval(() => {
      persistQueryCache(queryClient);
    }, 60_000); // Cada minuto

    return () => {
      clearInterval(interval);
      persistQueryCache(queryClient);
    };
  }, []);

  // Iniciar listener de sincronizacion
  useEffect(() => {
    const unsubscribe = startSyncListener(queryClient);
    return unsubscribe;
  }, []);

  // Registrar push notifications
  usePushNotifications();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
          <AppErrorBoundary>
            <View style={styles.root}>
              <StatusBar style="auto" />
              <OfflineBanner />
              <OfflineQueueIndicator />
              <Stack screenOptions={{ headerShown: false }} />
              <SnackbarHost />
            </View>
          </AppErrorBoundary>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
