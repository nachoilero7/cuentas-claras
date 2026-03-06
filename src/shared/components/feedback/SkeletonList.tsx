import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { spacing } from '@/src/shared/theme/spacing';

interface SkeletonListProps {
  count?: number;
  variant?: 'transaction' | 'category' | 'member';
}

export function SkeletonList({ count = 5, variant = 'transaction' }: SkeletonListProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} delay={i * 100} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
});
