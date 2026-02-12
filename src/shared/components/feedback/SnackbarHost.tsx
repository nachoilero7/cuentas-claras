import { useState, useEffect, useCallback } from 'react';
import { Snackbar } from 'react-native-paper';
import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { subscribeSnackbar, type SnackbarMessage, type SnackbarType } from '@/src/shared/lib/snackbar';

const DURATIONS: Record<SnackbarType, number> = {
  success: 2500,
  error: 4000,
  info: 3000,
};

export function SnackbarHost() {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<SnackbarMessage | null>(null);

  useEffect(() => {
    return subscribeSnackbar((msg) => {
      setMessage(msg);
      setVisible(true);
    });
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!message) return null;

  const bgColor =
    message.type === 'error'
      ? colors.error
      : message.type === 'success'
        ? colors.success
        : colors.primary;

  return (
    <Snackbar
      visible={visible}
      onDismiss={handleDismiss}
      duration={message.duration ?? DURATIONS[message.type]}
      style={{ backgroundColor: bgColor }}
      action={
        message.type === 'error'
          ? { label: 'OK', textColor: '#fff', onPress: handleDismiss }
          : undefined
      }
    >
      {message.text}
    </Snackbar>
  );
}
