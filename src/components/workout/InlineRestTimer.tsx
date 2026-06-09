/**
 * InlineRestTimer
 * Renders inline between exercises during rest periods.
 * No popup/modal - stays in the scroll flow.
 *
 * Research: Inline timers outperform modal timers for gym UX -
 * users want to scroll, check notes, and review during rest.
 * Color shifts green→yellow→red as time runs down (urgency psychology).
 */

import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { useActiveWorkout } from "@/src/context/ActiveWorkoutContext";

export function InlineRestTimer() {
  const { colors } = useTheme();
  const { state, actions, formatTime } = useActiveWorkout();
  const { restTimer } = state;

  // Timer color based on remaining time (green→yellow→red)
  const timerColor = useMemo(() => {
    if (!restTimer.active) return colors.text;
    const totalEstimate = restTimer.secondsLeft + 10; // rough estimate
    const pct = restTimer.secondsLeft / Math.max(totalEstimate, 60);
    if (pct > 0.5) return "#9CA3AF";
    if (pct > 0.2) return "#6B7280";
    return "#000000";
  }, [restTimer.secondsLeft, restTimer.active, colors.text]);

  if (!restTimer.active) return null;

  return (
    <Animated.View entering={FadeInDown.duration(250)} style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: timerColor + "30" }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: timerColor }]} />
            <Text allowFontScaling={false} style={[styles.label, { color: colors.textMuted }]}>
              REST
            </Text>
          </View>
          <Pressable onPress={actions.skipRestTimer} hitSlop={8}>
            <Text allowFontScaling={false} style={[styles.skip, { color: colors.primary }]}>
              Skip
            </Text>
          </Pressable>
        </View>

        <View style={styles.timerRow}>
          <Pressable onPress={() => actions.adjustRestTimer(-15)} style={[styles.adjust, { backgroundColor: colors.cardAlt }]}>
            <Text allowFontScaling={false} style={[styles.adjustText, { color: colors.text }]}>-15</Text>
          </Pressable>

          <Text
            allowFontScaling={false}
            style={[
              styles.time,
              { color: timerColor },
            ]}
          >
            {formatTime(restTimer.secondsLeft)}
          </Text>

          <Pressable onPress={() => actions.adjustRestTimer(15)} style={[styles.adjust, { backgroundColor: colors.cardAlt }]}>
            <Text allowFontScaling={false} style={[styles.adjustText, { color: colors.text }]}>+15</Text>
          </Pressable>
        </View>

        <View style={styles.presets}>
          {[60, 90, 120, 180].map((seconds) => {
            const isActive = restTimer.secondsLeft >= seconds - 5 && restTimer.secondsLeft <= seconds + 5;
            return (
              <Pressable
                key={seconds}
                onPress={() => actions.startRestTimer(restTimer.afterExerciseId!, seconds)}
                style={[
                  styles.preset,
                  { backgroundColor: colors.cardAlt },
                  isActive && { backgroundColor: colors.primary + "20", borderWidth: 1, borderColor: colors.primary },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[styles.presetText, { color: isActive ? colors.primary : colors.textMuted }]}
                >
                  {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
  skip: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
  },
  adjust: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  adjustText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 48,
    fontFamily: "Inter_600SemiBold",
    minWidth: 120,
    textAlign: "center",
  },
  presets: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  preset: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  presetText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
