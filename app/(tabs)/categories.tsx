export { ErrorBoundary } from '@/src/shared/components/feedback/RouteErrorBoundary';

import { useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { SkeletonList } from '@/src/shared/components/feedback/SkeletonList';
import { AnimatedStaggerItem } from '@/src/shared/components/animated/AnimatedStaggerItem';
import { sanitizeErrorMessage } from '@/src/core/utils/errorMessages';
import { useProfile } from '@/src/features/auth/hooks/useProfile';
import { useCategories } from '@/src/features/categories/hooks/useCategories';
import { Card } from '@/src/shared/components/ui/Card';
import { Button } from '@/src/shared/components/ui/Button';
import { EmptyState } from '@/src/shared/components/feedback/EmptyState';
import { formatCurrency } from '@/src/core/utils/currency';
import { spacing } from '@/src/shared/theme';
import type { Category } from '@/src/core/types/database';

// ── Componente ──────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const { colors } = useAppTheme();
  const { data: profile } = useProfile();
  const { data: categories, isLoading, error, refetch } = useCategories();

  const role = profile?.role ?? 'viewer';
  const canManage = role === 'admin' || role === 'manager';

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNavigateToNew = useCallback(() => {
    router.push('/categories/new');
  }, []);

  const handleNavigateToEdit = useCallback((id: string) => {
    router.push(`/categories/${id}`);
  }, []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  // ── Estado de carga ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <SkeletonList count={5} variant="category" />
      </View>
    );
  }

  // ── Estado de error ───────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.error}
        />
        <Text
          variant="bodyLarge"
          style={[styles.errorTitle, { color: colors.text }]}
        >
          Error al cargar rubros
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.errorMessage, { color: colors.textSecondary }]}
        >
          {sanitizeErrorMessage(error)}
        </Text>
        <Button variant="primary" size="md" onPress={handleRefresh} icon="refresh">
          Reintentar
        </Button>
      </View>
    );
  }

  // ── Estado vacio ──────────────────────────────────────────────────────────

  if (!categories || categories.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="tag-off-outline"
          title="Sin rubros"
          description="Crea tu primer rubro para empezar a organizar los movimientos."
          actionLabel={canManage ? 'Crear rubro' : undefined}
          onAction={canManage ? handleNavigateToNew : undefined}
        />
      </View>
    );
  }

  // ── Lista de categorias ───────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item, index }) => (
          <AnimatedStaggerItem index={index}>
            <CategoryCard
              category={item}
              colors={colors}
              onPress={() => handleNavigateToEdit(item.id)}
            />
          </AnimatedStaggerItem>
        )}
        ItemSeparatorComponent={ItemSeparator}
      />

      {canManage && (
        <FAB
          icon="plus"
          label="Nuevo"
          onPress={handleNavigateToNew}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          color={colors.onPrimary}
        />
      )}
    </View>
  );
}

// ── Tarjeta de categoria ────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: () => void;
}

function getCategoryInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

const CategoryCard = memo(function CategoryCard({ category, colors, onPress }: CategoryCardProps) {
  const hasIcon = !!category.icon;
  const iconName = (category.icon ?? 'tag') as keyof typeof MaterialCommunityIcons.glyphMap;
  const categoryColor = category.color ?? colors.primary;

  const hasBudgetArs = category.budget_limit_ars !== null && category.budget_limit_ars > 0;
  const hasBudgetUsd = category.budget_limit_usd !== null && category.budget_limit_usd > 0;
  const hasBudget = hasBudgetArs || hasBudgetUsd;

  return (
    <Card variant="elevated" padding="none" onPress={onPress}>
      <View style={styles.cardContent}>
        {/* Indicador de color e icono/iniciales */}
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: categoryColor },
            ]}
          />
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: hasIcon ? categoryColor + '18' : categoryColor },
            ]}
          >
            {hasIcon ? (
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={categoryColor}
              />
            ) : (
              <Text style={styles.iconInitials}>
                {getCategoryInitials(category.name)}
              </Text>
            )}
          </View>
        </View>

        {/* Informacion */}
        <View style={styles.cardInfo}>
          <Text
            variant="titleMedium"
            style={[styles.categoryName, { color: colors.text }]}
            numberOfLines={1}
          >
            {category.name}
          </Text>

          {category.description ? (
            <Text
              variant="bodySmall"
              style={{ color: colors.textSecondary }}
              numberOfLines={2}
            >
              {category.description}
            </Text>
          ) : null}

          {hasBudget && (
            <View style={styles.budgetContainer}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                variant="labelSmall"
                style={{ color: colors.textTertiary, marginLeft: 4 }}
              >
                {hasBudgetArs
                  ? `Presupuesto: ${formatCurrency(category.budget_limit_ars!, 'ARS')}`
                  : ''}
                {hasBudgetArs && hasBudgetUsd ? ' / ' : ''}
                {hasBudgetUsd
                  ? `${formatCurrency(category.budget_limit_usd!, 'USD')}`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Flecha de navegacion */}
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={colors.textTertiary}
        />
      </View>
    </Card>
  );
});

// ── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.smd,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  errorTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.smd,
  },
  cardLeft: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  categoryName: {
    fontWeight: '600',
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: 16,
  },
});
