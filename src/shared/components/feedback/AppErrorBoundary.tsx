import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

import { Button } from '../ui/Button';
import { spacing } from '@/src/shared/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <MaterialCommunityIcons
              name="alert-decagram-outline"
              size={72}
              color="#ef4444"
            />

            <Text variant="headlineSmall" style={styles.title}>
              Algo salio mal
            </Text>

            <Text variant="bodyMedium" style={styles.description}>
              Ocurrio un error inesperado. Puedes intentar recargar la pantalla
              o volver atras.
            </Text>

            {this.state.error && (
              <View style={styles.errorBox}>
                <Text variant="labelSmall" style={styles.errorLabel}>
                  Detalle del error
                </Text>
                <Text variant="bodySmall" style={styles.errorMessage} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={this.handleRetry}
                icon="refresh"
              >
                Reintentar
              </Button>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  description: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorLabel: {
    color: '#991b1b',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  errorMessage: {
    color: '#b91c1c',
    fontSize: 12,
  },
  actions: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
