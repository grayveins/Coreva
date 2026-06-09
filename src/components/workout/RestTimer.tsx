/**
 * RestTimer
 * Circular countdown timer with smooth animation
 * Color shifts green → yellow → red as time runs down
 */

import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import { haptic } from "@/src/animations/feedback/haptics";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Color stops for the timer gradient
const COLOR_GREEN = "#9CA3AF";
const COLOR_YELLOW = "#6B7280";
const COLOR_RED = "#000000";

type RestTimerProps = {
  duration: number; // seconds
  onComplete: () => void;
  onSkip?: () => void;
};

export const RestTimer: React.FC<RestTimerProps> = ({
  duration,
  onComplete,
  onSkip,
}) => {
  const { colors } = useTheme();
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);

  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Derive the animated color from progress (0 → 1)
  // 0.0-0.5: green → yellow, 0.5-0.8: yellow → red, 0.8-1.0: stays red
  const timerColor = useDerivedValue(() => {
    if (progress.value <= 0.5) {
      // Green → Yellow (100%-50% remaining)
      return interpolateColor(
        progress.value,
        [0, 0.5],
        [COLOR_GREEN, COLOR_YELLOW]
      );
    }
    // Yellow → Red (50%-20% remaining)
    return interpolateColor(
      progress.value,
      [0.5, 0.8],
      [COLOR_YELLOW, COLOR_RED],
      "RGB",
      { gamma: 1 }
    );
  });

  // Start countdown
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          haptic("success");
          onComplete();
          return 0;
        }

        // Haptic at 10 seconds
        if (prev === 11) {
          // Start pulse animation
          pulseScale.value = withRepeat(
            withSequence(
              withTiming(1.05, { duration: 500 }),
              withTiming(1, { duration: 500 })
            ),
            -1,
            false
          );
          pulseOpacity.value = withTiming(0.3, { duration: 300 });
        }

        // Haptic at each second under 5
        if (prev <= 5) {
          haptic("light");
        }

        return prev - 1;
      });
    }, 1000);

    // Animate progress ring
    progress.value = withTiming(1, {
      duration: duration * 1000,
      easing: Easing.linear,
    });

    return () => {
      clearInterval(interval);
      cancelAnimation(progress);
      cancelAnimation(pulseScale);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, duration]);

  const handleSkip = () => {
    haptic("medium");
    cancelAnimation(progress);
    setIsRunning(false);
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: timerColor.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1.2 }],
  }));

  const timeTextStyle = useAnimatedStyle(() => ({
    color: timerColor.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={containerStyle}>
        {/* Pulse layer */}
        <Animated.View style={[styles.pulseLayer, { backgroundColor: colors.primary }, pulseStyle]} />

        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedCircleProps}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Animated.Text
            allowFontScaling={false}
            style={[styles.timeText, timeTextStyle]}
          >
            {formatTime(timeLeft)}
          </Animated.Text>
          <Animated.Text allowFontScaling={false} style={[styles.label, { color: colors.muted }]}>
            {timeLeft === 0 ? "Let's go!" : "Rest"}
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Skip button */}
      <Pressable style={[styles.skipButton, { backgroundColor: colors.card }]} onPress={handleSkip}>
        <Animated.Text allowFontScaling={false} style={[styles.skipText, { color: colors.muted }]}>
          Skip Rest
        </Animated.Text>
        <Ionicons name="play-forward" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
  },
  pulseLayer: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  centerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 40,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "400",
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default RestTimer;
