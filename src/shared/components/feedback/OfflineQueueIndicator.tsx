import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getQueueSize } from '@/src/sync';
import { spacing } from '@/src/shared/theme';

/**
 * Muestra un banner si hay mutaciones pendientes en la cola offline.
 * Se refresca cada 10 segundos.
 */
export function OfflineQueueIndicator() {
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const size = await getQueueSize();
      if (mounted) setQueueSize(size);
    }

    check();
    const interval = setInterval(check, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (queueSize === 0) return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="cloud-sync-outline" size={16} color="#fff" />
      <Text variant="labelSmall" style={styles.text}>
        {queueSize} {queueSize === 1 ? 'cambio pendiente' : 'cambios pendientes'} de sincronizar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.smd,
    gap: spacing.xs,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});
