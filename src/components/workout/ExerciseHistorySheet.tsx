/**
 * ExerciseHistorySheet
 *
 * Bottom sheet surfacing a single exercise's history mid-workout. Tap an
 * exercise name in `(workout)/active.tsx` to open it.
 *
 * Layout (top → bottom):
 *   1. "Personal best to beat" — Est. 1RM / Max weight / Best volume.
 *   2. Trend — a clean bar sparkline of the selected metric over time.
 *   3. Chronological session list.
 *   4. Sticky CTA — "Use Last Workout" copies the last session's sets.
 */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import {
  brzycki1RM,
  useExerciseHistory,
  type HistorySession,
} from "@/src/hooks/useExerciseHistory";

type MetricKey = "oneRM" | "volume" | "heaviest";

type Props = {
  visible: boolean;
  userId: string | null;
  exerciseName: string | null;
  onClose: () => void;
  /** Called when the user taps "Use Last Workout". Caller copies the
   *  sets into the active workout state. */
  onUseLastWorkout?: (sets: { weight: number; reps: number }[]) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function summarizeSets(session: HistorySession): string {
  const working = session.sets.filter((s) => !s.isWarmup);
  if (working.length === 0) return "Warmup only";
  const reps = working.map((s) => s.reps).join("/");
  const maxWeight = Math.max(...working.map((s) => s.weight));
  return `${working.length} set${working.length === 1 ? "" : "s"} · ${reps} @ ${maxWeight} lbs`;
}

function metricForSession(session: HistorySession, metric: MetricKey): number {
  let best = 0;
  for (const set of session.sets) {
    if (set.isWarmup) continue;
    if (metric === "heaviest") {
      if (set.weight > best) best = set.weight;
    } else if (metric === "volume") {
      const v = set.weight * set.reps;
      if (v > best) best = v;
    } else {
      const e = brzycki1RM(set.weight, set.reps) ?? 0;
      if (e > best) best = e;
    }
  }
  return best;
}

export function ExerciseHistorySheet({
  visible,
  userId,
  exerciseName,
  onClose,
  onUseLastWorkout,
}: Props) {
  const { colors } = useTheme();
  const [metric, setMetric] = useState<MetricKey>("oneRM");

  const { loading, error, sessions, refresh } = useExerciseHistory(
    userId,
    visible ? exerciseName : null
  );

  // Personal bests across all logged sessions.
  const pbs = useMemo(() => {
    let e1rm = 0, heaviest = 0, vol = 0;
    for (const s of sessions) {
      for (const set of s.sets) {
        if (set.isWarmup) continue;
        if (set.weight > heaviest) heaviest = set.weight;
        const v = set.weight * set.reps;
        if (v > vol) vol = v;
        const e = brzycki1RM(set.weight, set.reps) ?? 0;
        if (e > e1rm) e1rm = e;
      }
    }
    return { e1rm: Math.round(e1rm), heaviest: Math.round(heaviest), vol: Math.round(vol) };
  }, [sessions]);

  // Oldest → newest values for the sparkline (last 12 sessions).
  const sparkValues = useMemo(
    () => [...sessions].reverse().slice(-12).map((s) => metricForSession(s, metric)),
    [sessions, metric]
  );

  const lastSession = sessions[0];
  const canUseLast = !!lastSession && lastSession.sets.some((s) => !s.isWarmup);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                {exerciseName ?? "Exercise"}
              </Text>
              <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textMuted }]}>
                {sessions.length === 0
                  ? "No history yet"
                  : `${sessions.length} session${sessions.length === 1 ? "" : "s"} logged`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={8}
              style={[styles.closeBtn, { backgroundColor: colors.bgSecondary }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.text} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>Couldn&apos;t load history</Text>
              <Text allowFontScaling={false} style={[styles.errorBody, { color: colors.textMuted }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => { hapticPress(); refresh(); }}
                style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
              >
                <Text style={[styles.retryText, { color: colors.text }]}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="barbell-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
              <Text allowFontScaling={false} style={[styles.emptyBody, { color: colors.textMuted }]}>
                Log this exercise once and your history shows up here.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl + 56 }}>
              {/* Personal best to beat */}
              <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Personal best to beat
              </Text>
              <View style={[styles.pbRow, { backgroundColor: colors.bgSecondary }]}>
                <PBStat icon="trophy-outline" value={pbs.e1rm ? `${pbs.e1rm}` : "—"} unit="lbs" label="Est. 1RM" colors={colors} />
                <View style={[styles.pbDivider, { backgroundColor: colors.border }]} />
                <PBStat icon="barbell-outline" value={pbs.heaviest ? `${pbs.heaviest}` : "—"} unit="lbs" label="Max weight" colors={colors} />
                <View style={[styles.pbDivider, { backgroundColor: colors.border }]} />
                <PBStat icon="layers-outline" value={pbs.vol ? `${pbs.vol}` : "—"} unit="lbs" label="Best volume" colors={colors} />
              </View>

              {/* Trend */}
              <View style={styles.trendHead}>
                <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted, paddingHorizontal: 0, paddingTop: 0 }]}>
                  Trend
                </Text>
                <View style={styles.toggleRow}>
                  <ToggleChip label="1RM" active={metric === "oneRM"} onPress={() => setMetric("oneRM")} colors={colors} />
                  <ToggleChip label="Volume" active={metric === "volume"} onPress={() => setMetric("volume")} colors={colors} />
                  <ToggleChip label="Heaviest" active={metric === "heaviest"} onPress={() => setMetric("heaviest")} colors={colors} />
                </View>
              </View>
              {sparkValues.length > 1 ? (
                <Sparkline values={sparkValues} colors={colors} />
              ) : (
                <Text allowFontScaling={false} style={[styles.chartHint, { color: colors.textMuted }]}>
                  Log this exercise once more to see a trend.
                </Text>
              )}

              {/* History */}
              <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted }]}>History</Text>
              {sessions.map((session) => (
                <View key={session.sessionId} style={[styles.sessionRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.sessionHead}>
                    <Text allowFontScaling={false} style={[styles.sessionDate, { color: colors.text }]}>
                      {formatDate(session.date)}
                    </Text>
                    <Text allowFontScaling={false} style={[styles.sessionSummary, { color: colors.textMuted }]}>
                      {summarizeSets(session)}
                    </Text>
                  </View>
                  {session.notes ? (
                    <Text allowFontScaling={false} numberOfLines={2} style={[styles.sessionNotes, { color: colors.textMuted }]}>
                      {session.notes}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Sticky bottom CTA */}
          {!loading && !error && canUseLast && onUseLastWorkout && (
            <View style={[styles.ctaBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  hapticPress();
                  const sets = lastSession.sets
                    .filter((s) => !s.isWarmup)
                    .map((s) => ({ weight: s.weight, reps: s.reps }));
                  onUseLastWorkout(sets);
                  onClose();
                }}
                style={({ pressed }) => [styles.ctaBtn, { backgroundColor: colors.text, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text allowFontScaling={false} style={[styles.ctaText, { color: colors.bg }]}>Use Last Workout</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function PBStat({ icon, value, unit, label, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  unit: string;
  label: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.pbStat}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={styles.pbValueRow}>
        <Text allowFontScaling={false} style={[styles.pbValue, { color: colors.text }]}>{value}</Text>
        {value !== "—" && (
          <Text allowFontScaling={false} style={[styles.pbUnit, { color: colors.textMuted }]}>{unit}</Text>
        )}
      </View>
      <Text allowFontScaling={false} style={[styles.pbLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Sparkline({ values, colors }: { values: number[]; colors: ReturnType<typeof useTheme>["colors"] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.spark}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const h = Math.max(4, (v / max) * 60);
        return (
          <View
            key={i}
            style={[styles.sparkBar, { height: h, backgroundColor: isLast ? colors.text : colors.border }]}
          />
        );
      })}
    </View>
  );
}

function ToggleChip({ label, active, onPress, colors }: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: { text: string; bg: string; border: string; bgSecondary: string; textMuted: string };
}) {
  return (
    <Pressable
      onPress={() => { hapticPress(); onPress(); }}
      style={[styles.toggleChip, { backgroundColor: active ? colors.text : colors.bgSecondary, borderColor: active ? colors.text : colors.border }]}
    >
      <Text allowFontScaling={false} style={[styles.toggleLabel, { color: active ? colors.bg : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "88%",
    minHeight: "60%",
  },
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingTop: 4,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

  center: { paddingVertical: spacing.xxl, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptyBody: { fontSize: 13, textAlign: "center", paddingHorizontal: spacing.xl },
  errorTitle: { fontSize: 16, fontWeight: "600" },
  errorBody: { fontSize: 13, textAlign: "center", paddingHorizontal: spacing.xl },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryText: { fontSize: 13, fontWeight: "600" },

  sectionLabel: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // Personal bests
  pbRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
  },
  pbStat: { flex: 1, alignItems: "center", gap: 3 },
  pbDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  pbValueRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  pbValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  pbUnit: { fontSize: 11, fontWeight: "500" },
  pbLabel: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.3 },

  // Trend
  trendHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  toggleRow: { flexDirection: "row", gap: 6 },
  toggleChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 11, fontWeight: "600" },
  spark: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    gap: 4,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  sparkBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  chartHint: { paddingHorizontal: spacing.base, paddingBottom: spacing.md, fontSize: 12, textAlign: "center" },

  // History
  sessionRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  sessionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing.sm },
  sessionDate: { fontSize: 14, fontWeight: "600" },
  sessionSummary: { fontSize: 13, fontVariant: ["tabular-nums"] },
  sessionNotes: { fontSize: 12, fontStyle: "italic" },

  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 15, fontWeight: "700" },
});

export default ExerciseHistorySheet;
