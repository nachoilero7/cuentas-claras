import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { useCompleteOnboarding } from '@/src/features/onboarding/hooks/useOnboarding';
import { Button } from '@/src/shared/components/ui/Button';
import { spacing } from '@/src/shared/theme';
import { APP_NAME } from '@/src/core/config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Datos de cada pagina ────────────────────────────────────────────────────

interface OnboardingPage {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    title: `Bienvenido a ${APP_NAME}`,
    description:
      'Gestiona las finanzas de la sub-comision de basquet infantil del Club Independiente de forma simple y transparente.',
    icon: 'hand-wave',
    iconColor: '#FFD700',
  },
  {
    id: '2',
    title: 'Registra movimientos',
    description:
      'Crea ingresos, egresos y transferencias organizados por rubros. Adjunta comprobantes y registra metodos de pago.',
    icon: 'swap-horizontal-variant',
    iconColor: '#4CAF50',
  },
  {
    id: '3',
    title: 'Reportes y control',
    description:
      'Visualiza el estado financiero con graficos, genera reportes en PDF, y recibe alertas de presupuesto.',
    icon: 'chart-line',
    iconColor: '#2196F3',
  },
  {
    id: '4',
    title: 'Listo para comenzar',
    description:
      'Comienza a registrar tus movimientos. Si tienes dudas, contacta a un administrador.',
    icon: 'check-circle',
    iconColor: '#8BC34A',
  },
];

// ── Componente de pagina ────────────────────────────────────────────────────

interface PageItemProps {
  page: OnboardingPage;
  textColor: string;
  secondaryTextColor: string;
}

function PageItem({ page, textColor, secondaryTextColor }: PageItemProps) {
  return (
    <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={page.icon}
          size={80}
          color={page.iconColor}
        />
      </View>
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: textColor }]}
      >
        {page.title}
      </Text>
      <Text
        variant="bodyLarge"
        style={[styles.description, { color: secondaryTextColor }]}
      >
        {page.description}
      </Text>
    </View>
  );
}

// ── Pantalla principal ──────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);
  const { mutate: complete, isPending } = useCompleteOnboarding();

  const isLastPage = currentIndex === PAGES.length - 1;

  const handleFinish = useCallback(() => {
    complete(undefined, {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
    });
  }, [complete]);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      handleFinish();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [isLastPage, currentIndex, handleFinish]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Boton Omitir */}
      {!isLastPage && (
        <Pressable
          style={styles.skipButton}
          onPress={handleFinish}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Omitir onboarding"
        >
          <Text
            variant="labelLarge"
            style={{ color: colors.primary, fontWeight: '600' }}
          >
            Omitir
          </Text>
        </Pressable>
      )}

      {/* Paginas */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={({ item }) => (
          <PageItem
            page={item}
            textColor={colors.text}
            secondaryTextColor={colors.textSecondary}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Footer: dots + boton */}
      <View style={styles.footer}>
        {/* Indicadores de pagina */}
        <View style={styles.pagination}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex
                      ? colors.primary
                      : colors.outlineVariant,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Boton Siguiente / Comenzar */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
          disabled={isPending}
          onPress={handleNext}
          icon={isLastPage ? 'check' : 'arrow-right'}
        >
          {isLastPage ? 'Comenzar' : 'Siguiente'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.sm,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
