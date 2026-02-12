import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = '@cuentas_claras:biometric_enabled';

type BiometricType = 'fingerprint' | 'facial' | 'iris';

interface BiometricState {
  /** El dispositivo tiene hardware biometrico */
  isAvailable: boolean;
  /** El usuario ha registrado biometria en el dispositivo */
  isEnrolled: boolean;
  /** El usuario ha habilitado biometria en la app */
  isEnabled: boolean;
  /** Tipo de biometria disponible */
  biometricType: BiometricType | null;
  /** Cargando estado inicial */
  isLoading: boolean;
}

interface UseBiometricReturn extends BiometricState {
  /** Habilitar/deshabilitar biometria en la app */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Solicitar autenticacion biometrica. Retorna true si fue exitosa o si no esta habilitada. */
  authenticate: (reason?: string) => Promise<boolean>;
}

function mapBiometricType(types: LocalAuthentication.AuthenticationType[]): BiometricType | null {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'facial';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'iris';
  }
  return null;
}

export function useBiometric(): UseBiometricReturn {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnrolled: false,
    isEnabled: false,
    biometricType: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const [hasHardware, enrolledLevel, types, storedEnabled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
          SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
        ]);

        if (!mounted) return;

        setState({
          isAvailable: hasHardware,
          isEnrolled: enrolledLevel,
          isEnabled: storedEnabled === 'true',
          biometricType: mapBiometricType(types),
          isLoading: false,
        });
      } catch {
        if (!mounted) return;
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Verificar biometria antes de habilitar
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma tu identidad para activar la biometria',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!result.success) return;
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    setState((prev) => ({ ...prev, isEnabled: enabled }));
  }, []);

  const authenticate = useCallback(
    async (reason = 'Confirma tu identidad para continuar') => {
      // Si la biometria no esta habilitada, permitir la accion directamente
      if (!state.isEnabled) return true;

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: reason,
          cancelLabel: 'Cancelar',
          disableDeviceFallback: false,
        });

        return result.success;
      } catch {
        return false;
      }
    },
    [state.isEnabled],
  );

  return {
    ...state,
    setEnabled,
    authenticate,
  };
}

/** Labels para mostrar en la UI */
export const BIOMETRIC_LABELS: Record<BiometricType, string> = {
  fingerprint: 'Huella digital',
  facial: 'Reconocimiento facial',
  iris: 'Escaneo de iris',
};
