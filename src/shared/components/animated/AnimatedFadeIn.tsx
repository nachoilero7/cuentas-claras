import React from 'react';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

interface AnimatedFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'fade';
  style?: ViewStyle;
}

export function AnimatedFadeIn({
  children,
  delay = 0,
  duration = 400,
  direction = 'up',
  style,
}: AnimatedFadeInProps) {
  const entering =
    direction === 'up'
      ? FadeInUp.delay(delay).duration(duration).springify()
      : direction === 'down'
        ? FadeInDown.delay(delay).duration(duration).springify()
        : FadeIn.delay(delay).duration(duration);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
