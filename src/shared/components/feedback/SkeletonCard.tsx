import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Skeleton, SkeletonCircle } from './Skeleton';
import { spacing, borderRadius } from '@/src/shared/theme/spacing';

interface SkeletonCardProps {
  variant?: 'transaction' | 'category' | 'member';
  delay?: number;
}

function TransactionSkeleton({ delay }: { delay: number }) {
  return (
    <View style={styles.transactionCard}>
      <View style={[styles.leftBar, { backgroundColor: 'transparent' }]}>
        <Skeleton width={4} height={44} borderRadius={2} delay={delay} />
      </View>
      <SkeletonCircle size={44} delay={delay + 50} />
      <View style={styles.content}>
        <Skeleton width="70%" height={16} delay={delay + 100} />
        <Skeleton width="50%" height={12} delay={delay + 150} style={{ marginTop: 6 }} />
        <Skeleton width="40%" height={10} delay={delay + 200} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.amountCol}>
        <Skeleton width={72} height={18} delay={delay + 100} />
        <Skeleton width={48} height={10} delay={delay + 150} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

function CategorySkeleton({ delay }: { delay: number }) {
  return (
    <View style={styles.categoryCard}>
      <SkeletonCircle size={44} delay={delay} />
      <View style={styles.content}>
        <Skeleton width="60%" height={16} delay={delay + 50} />
        <Skeleton width="40%" height={12} delay={delay + 100} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={20} height={20} borderRadius={4} delay={delay + 50} />
    </View>
  );
}

function MemberSkeleton({ delay }: { delay: number }) {
  return (
    <View style={styles.memberCard}>
      <SkeletonCircle size={48} delay={delay} />
      <View style={styles.content}>
        <View style={styles.memberNameRow}>
          <Skeleton width="55%" height={16} delay={delay + 50} />
          <Skeleton width={60} height={20} borderRadius={10} delay={delay + 100} />
        </View>
        <Skeleton width="70%" height={12} delay={delay + 100} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonCard({ variant = 'transaction', delay = 0 }: SkeletonCardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
    },
  ];

  return (
    <View style={cardStyle}>
      {variant === 'transaction' && <TransactionSkeleton delay={delay} />}
      {variant === 'category' && <CategorySkeleton delay={delay} />}
      {variant === 'member' && <MemberSkeleton delay={delay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.smd,
    marginBottom: spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  leftBar: {
    width: 4,
  },
  content: {
    flex: 1,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
