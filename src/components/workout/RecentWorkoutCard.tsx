/**
 * RecentWorkoutCard - Hevy-inspired
 *
 * Compact card with date badge, exercise list, and meta pills.
 * Tap to re-run the workout.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { useTheme } from "@/src/context/ThemeContext";
import { hapticPress } from "@/src/animations/feedback/haptics";
import type { RecentWorkout } from "@/src/hooks/useRecentWorkouts";

type Props = {
  workout: RecentWorkout;
  onPress: (workout: RecentWorkout) => void;
};

export function RecentWorkoutCard({ workout, onPress }: Props) {
  const { colors } = useTheme();

  const duration = workout.ended_at
    ? differenceInMinutes(parseISO(workout.ended_at), parseISO(workout.started_at))
    : null;

  const dateStr = format(parseISO(workout.started_at), "EEE, MMM d");
  const totalSets = workout.exercises.reduce((sum, e) => sum + e.set_count, 0);

  return (
    <Pressable
      onPress={() => { hapticPress(); onPress(workout); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Left: rerun icon */}
      <View style={[styles.rerunBadge, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name="refresh" size={16} color={colors.primary} />
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {workout.title || "Workout"}
          </Text>
          <Text allowFontScaling={false} style={[styles.date, { color: colors.textMuted }]}>
            {dateStr}
          </Text>
        </View>

        {/* Exercise list */}
        <View style={styles.exerciseList}>
          {workout.exercises.slice(0, 3).map((ex, i) => (
            <Text
              key={i}
              allowFontScaling={false}
              style={[styles.exerciseName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {ex.set_count} x {ex.name}
            </Text>
          ))}
          {workout.exercises.length > 3 && (
            <Text allowFontScaling={false} style={[styles.exerciseName, { color: colors.textMuted }]}>
              +{workout.exercises.length - 3} more
            </Text>
          )}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {duration != null && duration > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
              <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textMuted }]}>
                {duration}min
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
            <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textMuted }]}>
              {totalSets} sets
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="barbell-outline" size={11} color={colors.textMuted} />
            <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textMuted }]}>
              {workout.exercises.length} exercises
            </Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  rerunBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  exerciseList: {
    gap: 1,
  },
  exerciseName: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  chevron: {
    marginLeft: 4,
  },
});
