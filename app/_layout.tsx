import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { QueryProvider } from '@/src/core/providers/QueryProvider';
import { ThemeProvider } from '@/src/core/providers/ThemeProvider';
import { AuthProvider } from '@/src/core/providers/AuthProvider';
import { OfflineBanner } from '@/src/shared/components/feedback/OfflineBanner';
import { queryClient } from '@/src/core/config/queryClient';
import { restoreQueryCache, persistQueryCache } from '@/src/sync/queryPersister';
import { startSyncListener } from '@/src/sync/SyncManager';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Propagate font loading errors
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={styles.root}>
            <StatusBar style="auto" />
            <OfflineBanner />
            <Slot />
          </View>
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
