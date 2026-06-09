/**
 * ActiveWorkoutMiniBar - Hevy-style persistent active-workout pill.
 * Mounted globally inside (app) so a workout survives swipe-out from
 * the active modal, tab navigation, and app backgrounding. Tap the pill
 * (or chevron) to re-expand the active screen; tap the trash to discard
 * via the existing confirmation flow.
 */

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { useActiveWorkout } from "@/src/context/ActiveWorkoutContext";
import { DiscardWorkoutSheet } from "./DiscardWorkoutSheet";

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ActiveWorkoutMiniBar() {
  const { colors } = useTheme();
  const { state, actions } = useActiveWorkout();
  const [showDiscard, setShowDiscard] = useState(false);

  // No pathname guard: the workout modal already covers this layout
  // visually when open, so leaving the bar mounted lets it reveal
  // naturally as the modal slides down - no pop-in delay.
  if (!state.isActive) return null;

  const currentExercise =
    state.exercises.find((ex) => ex.sets.some((s) => !s.completed)) ??
    state.exercises[0];

  const expand = () => {
    hapticPress();
    router.push("/(workout)/active");
  };

  return (
    <>
    <Pressable
      onPress={expand}
      style={[
        styles.bar,
        { backgroundColor: colors.bgSecondary, borderColor: colors.border },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Resume active workout"
    >
      <View style={[styles.dot, { backgroundColor: colors.success }]} />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.title, { color: colors.text }]}
          >
            {state.title}
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.elapsed, { color: colors.textMuted }]}
          >
            {formatElapsed(state.elapsedSeconds)}
          </Text>
        </View>
        {currentExercise && (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[styles.subtitle, { color: colors.textMuted }]}
          >
            {currentExercise.name}
          </Text>
        )}
      </View>

      <Pressable
        hitSlop={10}
        onPress={(e) => {
          e.stopPropagation?.();
          hapticPress();
          setShowDiscard(true);
        }}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Discard workout"
      >
        <Ionicons name="trash-outline" size={18} color={colors.text} />
      </Pressable>

      <Pressable
        hitSlop={10}
        onPress={(e) => {
          e.stopPropagation?.();
          expand();
        }}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="Open active workout"
      >
        <Ionicons name="chevron-up" size={20} color={colors.text} />
      </Pressable>
    </Pressable>

    <DiscardWorkoutSheet
      visible={showDiscard}
      onCancel={() => setShowDiscard(false)}
      onConfirm={() => {
        setShowDiscard(false);
        actions.discardWorkout();
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: spacing.base,
    right: spacing.base,
    // Sits above the tab bar - RN tabs are ~88px on iOS w/ home indicator.
    bottom: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    // Subtle elevation so it floats over scroll content.
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  elapsed: {
    fontSize: 12,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  subtitle: {
    fontSize: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
});

export default ActiveWorkoutMiniBar;
