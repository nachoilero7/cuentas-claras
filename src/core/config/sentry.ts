import * as Sentry from '@sentry/react-native';

// ─── Configuracion de Sentry para error tracking ───────────────────────────

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!SENTRY_DSN) {
    if (__DEV__) console.warn('Sentry DSN no configurado. Error tracking desactivado.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      // No enviar errores de red en modo offline
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
