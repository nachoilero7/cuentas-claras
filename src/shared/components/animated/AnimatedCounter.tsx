import React, { useEffect } from 'react';
import { TextInput, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
  style?: TextStyle;
}

const defaultFormat = (n: number) => n.toFixed(0);

export function AnimatedCounter({
  value,
  duration = 800,
  formatFn = defaultFormat,
  style,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animatedValue]);

  const animatedProps = useAnimatedProps(() => ({
    text: formatFn(animatedValue.value),
    defaultValue: formatFn(animatedValue.value),
  }));

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      style={[{ padding: 0, margin: 0 }, style]}
    />
  );
}
