/**
 * ProgramCard - Hevy/Gravl/Fitbod-inspired
 *
 * Premium program card with gradient accent bar, structured layout,
 * goal/difficulty pills, exercise day count, and "Start" affordance.
 */

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import { hapticPress } from "@/src/animations/feedback/haptics";
import type { CuratedProgram } from "@/lib/workout/programs";

const LEVEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  beginner: "leaf-outline",
  intermediate: "barbell-outline",
  advanced: "flame-outline",
};

type Props = {
  program: CuratedProgram;
  onPress: (program: CuratedProgram) => void;
};

export function ProgramCard({ program, onPress }: Props) {
  const { colors } = useTheme();
  const accent = program.accent[0];
  const levelIcon = LEVEL_ICONS[program.level?.toLowerCase()] ?? "barbell-outline";

  return (
    <Pressable
      onPress={() => { hapticPress(); onPress(program); }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Gradient accent bar */}
      <LinearGradient
        colors={program.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bar}
      />

      <View style={styles.body}>
        {/* Top row: name + chevron */}
        <View style={styles.topRow}>
          <View style={styles.nameCol}>
            <Text allowFontScaling={false} style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {program.name}
            </Text>
          </View>
          <View style={[styles.startPill, { backgroundColor: accent + "1A" }]}>
            <Ionicons name="play" size={12} color={accent} />
          </View>
        </View>

        {/* Subtitle */}
        <Text allowFontScaling={false} style={[styles.subtitle, { color: accent }]}>
          {program.subtitle}
        </Text>

        {/* Description */}
        <Text allowFontScaling={false} style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {program.description}
        </Text>

        {/* Meta pills row */}
        <View style={styles.meta}>
          <View style={[styles.pill, { backgroundColor: accent + "14" }]}>
            <Ionicons name="calendar-outline" size={11} color={accent} />
            <Text allowFontScaling={false} style={[styles.pillText, { color: accent }]}>
              {program.daysPerWeek}x / week
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name={levelIcon} size={11} color={colors.textMuted} />
            <Text allowFontScaling={false} style={[styles.pillText, { color: colors.textMuted }]}>
              {program.level}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
            <Text allowFontScaling={false} style={[styles.pillText, { color: colors.textMuted }]}>
              {program.split}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  bar: {
    width: 4,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  nameCol: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  author: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  startPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
