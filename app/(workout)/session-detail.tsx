/**
 * Session detail - read-only view of a past workout session.
 * Shows header (name, date, duration, exercise count) + per-exercise sets.
 *
 * Reached from: Home day-strip completed-workout card, Calendar tab
 * dayEvents.workouts row, Workout History list.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { format } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { supabase } from "@/lib/supabase";
import { MuscleChips } from "@/src/components/workout/MuscleChips";

type WorkoutSet = {
  id: string;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  rir: number | null;
  is_warmup: boolean;
  is_pr: boolean;
};

type WorkoutExercise = {
  id: string;
  exercise_name: string;
  muscle_group: string | null;
  notes: string | null;
  order_index: number;
  workout_sets: WorkoutSet[];
};

type Session = {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  workout_exercises: WorkoutExercise[];
};

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "In progress";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "-";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SessionDetailScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from("workout_sessions")
        .select(
          "id, title, started_at, ended_at, workout_exercises(id, exercise_name, muscle_group, notes, order_index, workout_sets(id, set_number, weight_lbs, reps, rir, is_warmup, is_pr))"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError(err?.message ?? "Session not found");
        setLoading(false);
        return;
      }
      // Sort exercises by order_index, sets by set_number
      const sorted = data as any as Session;
      sorted.workout_exercises = (sorted.workout_exercises ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      for (const ex of sorted.workout_exercises) {
        ex.workout_sets = (ex.workout_sets ?? [])
          .slice()
          .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
      }
      setSession(sorted);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const totals = useMemo(() => {
    if (!session) return { exerciseCount: 0, setCount: 0 };
    let setCount = 0;
    for (const ex of session.workout_exercises) {
      setCount += (ex.workout_sets ?? []).filter((s) => !s.is_warmup).length;
    }
    return { exerciseCount: session.workout_exercises.length, setCount };
  }, [session]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>
          {session ? format(new Date(session.started_at), "d MMM yyyy") : "Workout"}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : error || !session ? (
        <View style={styles.center}>
          <Text allowFontScaling={false} style={{ color: colors.textMuted }}>
            {error ?? "Could not load session"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(200)}>
            {/* Title block */}
            <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
              {session.title || "Workout"}
            </Text>
            <View style={styles.metaRow}>
              <MetaItem
                icon="time-outline"
                label={formatDuration(session.started_at, session.ended_at)}
                colors={colors}
              />
              <MetaItem
                icon="barbell-outline"
                label={`${totals.exerciseCount} exercise${totals.exerciseCount === 1 ? "" : "s"}`}
                colors={colors}
              />
              <MetaItem
                icon="checkmark-circle-outline"
                label={`${totals.setCount} sets`}
                colors={colors}
              />
            </View>
            <Text allowFontScaling={false} style={[styles.startedAt, { color: colors.textMuted }]}>
              Started {format(new Date(session.started_at), "h:mm a")}
            </Text>

            {/* Per-exercise blocks */}
            {session.workout_exercises.map((ex) => {
              const muscles = ex.muscle_group
                ? ex.muscle_group.split(/[\/,]+/).map((s) => s.trim()).filter(Boolean)
                : [];
              return (
                <View
                  key={ex.id}
                  style={[styles.exerciseCard, { backgroundColor: colors.bgSecondary }]}
                >
                  <Text
                    allowFontScaling={false}
                    style={[styles.exerciseName, { color: colors.text }]}
                  >
                    {ex.exercise_name}
                  </Text>
                  {muscles.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      <MuscleChips muscles={muscles} />
                    </View>
                  )}
                  {ex.notes ? (
                    <Text
                      allowFontScaling={false}
                      style={[styles.exerciseNotes, { color: colors.textSecondary }]}
                    >
                      {ex.notes}
                    </Text>
                  ) : null}

                  <View style={styles.setList}>
                    {(ex.workout_sets ?? []).map((s) => (
                      <View key={s.id} style={styles.setRow}>
                        <Text
                          allowFontScaling={false}
                          style={[styles.setLabel, { color: colors.textMuted }]}
                        >
                          {s.is_warmup ? "Warmup" : `Set ${s.set_number}`}
                        </Text>
                        <Text
                          allowFontScaling={false}
                          style={[styles.setValue, { color: colors.text }]}
                        >
                          {s.reps ?? "-"} × {s.weight_lbs != null ? `${s.weight_lbs} lbs` : "-"}
                          {s.rir != null ? ` · RIR ${s.rir}` : ""}
                        </Text>
                        {s.is_pr && (
                          <View style={[styles.prBadge, { borderColor: colors.border }]}>
                            <Text
                              allowFontScaling={false}
                              style={[styles.prText, { color: colors.text }]}
                            >
                              PR
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {(ex.workout_sets ?? []).length === 0 && (
                      <Text
                        allowFontScaling={false}
                        style={[styles.emptySets, { color: colors.textMuted }]}
                      >
                        No sets logged
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {session.workout_exercises.length === 0 && (
              <Text
                allowFontScaling={false}
                style={[styles.emptySets, { color: colors.textMuted, marginTop: spacing.xl }]}
              >
                No exercises logged
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetaItem({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: any;
}) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: spacing.md, letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  startedAt: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: spacing.xs, marginBottom: spacing.lg },
  exerciseCard: {
    padding: spacing.base,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  exerciseName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  exerciseNotes: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 6 },
  setList: { marginTop: spacing.md, gap: 6 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  setLabel: { width: 70, fontSize: 13, fontFamily: "Inter_400Regular" },
  setValue: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  prBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  prText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  emptySets: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: spacing.md },
});
