/**
 * MuscleChips - small monochrome pills listing muscle groups for an exercise.
 * Used on the pre-workout preview and on the active-workout exercise card.
 *
 * Accepts either:
 *   - granular muscle keys ("front_delts", "lats") that are mapped via
 *     MUSCLE_DISPLAY_NAMES
 *   - already-display-cased strings ("Glutes", "hip extension") that are
 *     passed through with first-letter casing
 *
 * Renders nothing when the array is empty so callers don't need to guard.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { MUSCLE_DISPLAY_NAMES } from "@/lib/workout/exercises/muscleMap";

type Props = {
  muscles: string[] | undefined | null;
  /** Cap chip count - leftover collapsed into "+N" suffix chip. */
  max?: number;
};

function formatLabel(raw: string): string {
  if (!raw) return "";
  const known = (MUSCLE_DISPLAY_NAMES as Record<string, string>)[raw];
  if (known) return known;
  // Title-case fallback for ad-hoc strings like "glutes / hip extension"
  return raw
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export const MuscleChips: React.FC<Props> = ({ muscles, max = 4 }) => {
  const { colors } = useTheme();
  if (!muscles || muscles.length === 0) return null;

  // Dedupe by display label so "front_delts" + "rear_delts" + "side_delts"
  // collapse to one or stay separate depending on the input granularity.
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const m of muscles) {
    const lbl = formatLabel(m);
    if (!lbl || seen.has(lbl.toLowerCase())) continue;
    seen.add(lbl.toLowerCase());
    labels.push(lbl);
  }
  if (labels.length === 0) return null;

  const visible = labels.slice(0, max);
  const overflow = labels.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((lbl) => (
        <View
          key={lbl}
          style={[
            styles.chip,
            { backgroundColor: colors.bgSecondary, borderColor: colors.border },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.chipText, { color: colors.textMuted }]}
          >
            {lbl}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.chip,
            { backgroundColor: colors.bgSecondary, borderColor: colors.border },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.chipText, { color: colors.textMuted }]}
          >
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});

export default MuscleChips;
