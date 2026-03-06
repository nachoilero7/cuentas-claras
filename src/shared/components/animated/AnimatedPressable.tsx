import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { hapticLight } from '@/src/shared/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  scaleValue?: number;
  haptic?: boolean;
  style?: ViewStyle;
}

export function ScalePressable({
  children,
  scaleValue = 0.97,
  haptic = false,
  onPress,
  style,
  ...rest
}: AnimatedPressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleValue, { damping: 15, stiffness: 150 });
  }, [scale, scaleValue]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, [scale]);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (haptic) hapticLight();
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
