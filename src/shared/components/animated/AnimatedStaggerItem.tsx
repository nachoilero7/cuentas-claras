import React from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

interface AnimatedStaggerItemProps {
  children: React.ReactNode;
  index: number;
  delayPerItem?: number;
  maxDelay?: number;
  style?: ViewStyle;
}

export function AnimatedStaggerItem({
  children,
  index,
  delayPerItem = 50,
  maxDelay = 300,
  style,
}: AnimatedStaggerItemProps) {
  const delay = Math.min(index * delayPerItem, maxDelay);

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400).springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
