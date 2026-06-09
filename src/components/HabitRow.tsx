/**
 * HabitRow - Trainerize-style toggle for a coach-assigned habit.
 * Monochrome, no flash, no pulse. Title + checkbox only.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";
import { hapticPress, hapticSuccess } from "@/src/animations/feedback/haptics";

type Props = {
  name: string;
  /** Kept for future use; not rendered. */
  weeklyDone?: number;
  /** Kept for future use; not rendered. */
  streak?: number;
  completed: boolean;
  celebrateStreak?: boolean;
  enabled: boolean;
  /** @deprecated rows are now individual cards; dividers are unused. */
  isLast?: boolean;
  frequency: "daily" | "weekly";
  onToggle: () => void;
};

export function HabitRow({
  name,
  completed,
  enabled,
  onToggle,
}: Props) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!enabled) return;
    if (completed) hapticPress();
    else hapticSuccess();
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!enabled}
      style={[
        styles.card,
        {
          backgroundColor: colors.bgSecondary,
          opacity: enabled ? 1 : 0.85,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed, disabled: !enabled }}
      accessibilityLabel={`${name}, ${completed ? "completed" : "not completed"}`}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: completed ? colors.success : "transparent",
            borderColor: completed ? colors.success : colors.textMuted,
          },
        ]}
      >
        {completed && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>

      <Text
        allowFontScaling={false}
        style={[styles.title, { color: colors.text }]}
      >
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderRadius: 14,
    gap: spacing.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 15, fontWeight: "500" },
});

export default HabitRow;
