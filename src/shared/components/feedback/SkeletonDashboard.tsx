import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Skeleton, SkeletonCircle } from './Skeleton';
import { spacing, borderRadius } from '@/src/shared/theme/spacing';

export function SkeletonDashboard() {
  const theme = useTheme();

  const cardBg = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outlineVariant,
  };

  return (
    <View style={styles.container}>
      {/* Welcome section */}
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeText}>
          <Skeleton width="60%" height={24} delay={0} />
          <Skeleton width="40%" height={14} delay={50} style={{ marginTop: 6 }} />
        </View>
        <SkeletonCircle size={48} delay={100} />
      </View>

      {/* Donut chart card */}
      <View style={[styles.card, cardBg]}>
        <Skeleton width="45%" height={18} delay={100} />
        <View style={styles.donutSection}>
          <SkeletonCircle size={160} delay={150} />
        </View>
        <View style={styles.legendRow}>
          <Skeleton width="30%" height={14} delay={200} />
          <Skeleton width="30%" height={14} delay={250} />
          <Skeleton width="30%" height={14} delay={300} />
        </View>
      </View>

      {/* Counter chips */}
      <View style={styles.chipsRow}>
        <Skeleton width="48%" height={44} borderRadius={22} delay={200} />
        <Skeleton width="48%" height={44} borderRadius={22} delay={250} />
      </View>

      {/* Monthly chart card */}
      <View style={[styles.card, cardBg]}>
        <Skeleton width="55%" height={18} delay={300} />
        <View style={styles.barsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.barGroup}>
              <Skeleton width={16} height={40 + i * 12} delay={350 + i * 30} />
              <Skeleton width={16} height={30 + i * 8} delay={350 + i * 30} />
            </View>
          ))}
        </View>
        <View style={styles.barLabelsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={24} height={10} delay={400} />
          ))}
        </View>
      </View>

      {/* Category balance card */}
      <View style={[styles.card, cardBg]}>
        <Skeleton width="50%" height={18} delay={400} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.categoryRow}>
            <SkeletonCircle size={32} delay={450 + i * 50} />
            <View style={styles.categoryContent}>
              <Skeleton width="50%" height={14} delay={450 + i * 50} />
              <Skeleton width="100%" height={6} borderRadius={3} delay={500 + i * 50} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={64} height={14} delay={500 + i * 50} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.smd,
  },
  donutSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: spacing.sm,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.xs,
  },
  categoryContent: {
    flex: 1,
  },
});
