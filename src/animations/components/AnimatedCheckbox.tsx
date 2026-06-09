/**
 * AnimatedCheckbox
 * Checkbox with circle → checkmark morph animation
 */

import React, { useEffect } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/src/context/ThemeContext";
import { TIMING } from "../constants";
import { hapticSuccess } from "../feedback/haptics";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type AnimatedCheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  disabled?: boolean;
  onComplete?: () => void;
};

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  onToggle,
  size = 28,
  disabled = false,
  onComplete,
}) => {
  const { colors } = useTheme();
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (checked) {
      // Animate to checked state - Hevy-style crisp snap, no bouncy overshoot
      progress.value = withTiming(1, { duration: TIMING.fast });
      scale.value = withSequence(
        withTiming(1.08, { duration: 80 }),
        withTiming(1, { duration: 100 })
      );
      // Subtle glow
      glowOpacity.value = withSequence(
        withTiming(0.4, { duration: 80 }),
        withTiming(0, { duration: 200 })
      );
    } else {
      progress.value = withTiming(0, { duration: TIMING.fast });
      scale.value = 1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  const handlePress = () => {
    if (disabled) return;
    
    if (!checked) {
      // About to check - trigger haptic
      hapticSuccess();
      if (onComplete) {
        setTimeout(onComplete, TIMING.fast);
      }
    }
    
    onToggle();
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.5 }],
  }));

  // Checkmark path animation
  const checkmarkProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(progress.value, [0, 1], [24, 0]);
    return {
      strokeDashoffset,
      opacity: progress.value,
    };
  });

  const borderColor = checked ? colors.primary : colors.border;
  const backgroundColor = checked ? colors.primary : "transparent";

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Glow layer */}
        <Animated.View
          style={[
            styles.glow,
            { width: size * 1.5, height: size * 1.5, backgroundColor: colors.primary },
            glowStyle,
          ]}
        />
        
        {/* Main checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor,
              backgroundColor,
            },
          ]}
        >
          <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
            <AnimatedPath
              d="M4 12L10 18L20 6"
              stroke={colors.textOnPrimary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={24}
              animatedProps={checkmarkProps}
            />
          </Svg>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    borderRadius: 100,
  },
});

export default AnimatedCheckbox;
