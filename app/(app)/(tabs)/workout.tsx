import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { spacing, radius } from "@/src/theme";
import { WorkoutSkeleton } from "@/src/animations/components/SkeletonLoader";
import { ExerciseGlyph } from "@/src/components/workout/ExerciseGlyph";
import {
  fetchScheduledMap,
  resolveDay,
  type WorkoutLite,
} from "@/src/lib/scheduledWorkouts";

type PhaseWorkout = {
  id: string;
  day_number: number;
  name: string;
  exercises: any[];
};

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [programName, setProgramName] = useState<string | null>(null);
  const [phaseName, setPhaseName] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<PhaseWorkout[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<PhaseWorkout | null>(null);
  const [todayIsRest, setTodayIsRest] = useState(false);
  /** id of today's completed workout_session, if one exists. Drives the
   *  TODAY hero state ("Start Workout" vs "Completed · Tap to view"). */
  const [todaySessionId, setTodaySessionId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const fetchProgram = useCallback(async () => {
    if (!userId) return;
    // Schedule is per-day; only need a 1-day window for the workout tab.
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);
    // Two-week lookahead powers both today's resolution and the upcoming list.
    const SCHEDULE_WINDOW_DAYS = 14;
    const windowEnd = new Date(today);
    windowEnd.setDate(today.getDate() + (SCHEDULE_WINDOW_DAYS - 1));
    const [{ data: program }, schedMap, sessionsRes] = await Promise.all([
      supabase
        .from("coaching_programs")
        .select("id, name, program_phases(id, name, phase_number, status, phase_workouts(id, day_number, name, exercises))")
        .eq("client_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      fetchScheduledMap(userId, today, windowEnd),
      // Today's completed session - drives the TODAY hero CTA state.
      supabase
        .from("workout_sessions")
        .select("id, started_at")
        .eq("user_id", userId)
        .gte("started_at", dayStart.toISOString())
        .lte("started_at", dayEnd.toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setTodaySessionId((sessionsRes.data?.id as string | undefined) ?? null);

    if (!program) {
      setProgramName(null);
      setPhaseName(null);
      setWorkouts([]);
      setTodayWorkout(null);
      setTodayIsRest(false);
      // Keep todaySessionId - even without a program, a logged session
      // for today is still meaningful (empty workouts, etc.).
      setInitialLoading(false);
      return;
    }

    setProgramName(program.name);

    const sortedPhases = (program as any).program_phases
      ?.sort((a: any, b: any) => a.phase_number - b.phase_number) ?? [];

    // Find active phase, fall back to first phase (upcoming phases should still show)
    const activePhase = sortedPhases.find((p: any) => p.status === "active")
      || sortedPhases[0];

    if (!activePhase) {
      setPhaseName(null);
      setWorkouts([]);
      setTodayWorkout(null);
      setTodayIsRest(false);
      setInitialLoading(false);
      return;
    }

    setPhaseName(activePhase.name);
    const phaseWorkouts = (activePhase.phase_workouts ?? []).sort(
      (a: any, b: any) => a.day_number - b.day_number
    );
    setWorkouts(phaseWorkouts);

    // Build a workouts-by-id index across all phases so a scheduled workout
    // from a non-active phase still resolves.
    const byId = new Map<string, WorkoutLite>();
    for (const ph of sortedPhases) {
      for (const w of (ph.phase_workouts ?? [])) byId.set(w.id, w as WorkoutLite);
    }

    const resolved = resolveDay({
      date: today,
      scheduledByDate: schedMap,
      workoutsById: byId,
      activePhaseWorkouts: phaseWorkouts as WorkoutLite[],
    });
    if (resolved.kind === "rest") {
      setTodayWorkout(null);
      setTodayIsRest(true);
    } else {
      setTodayWorkout((resolved.workout as PhaseWorkout) ?? null);
      setTodayIsRest(false);
    }
    setInitialLoading(false);
  }, [userId]);

  const lastFetchedAt = useRef(0);
  useEffect(() => {
    if (userId) {
      fetchProgram();
      lastFetchedAt.current = Date.now();
    }
  }, [userId, fetchProgram]);
  useFocusEffect(useCallback(() => {
    if (userId && Date.now() - lastFetchedAt.current > 30_000) {
      fetchProgram();
      lastFetchedAt.current = Date.now();
    }
  }, [userId, fetchProgram]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProgram();
    lastFetchedAt.current = Date.now();
    setRefreshing(false);
  }, [fetchProgram]);

  const startEmptyWorkout = () => {
    hapticPress();
    router.push({ pathname: "/(workout)/active", params: { name: "Workout", sourceType: "empty" } });
  };

  const openWorkoutDetail = (workout: PhaseWorkout) => {
    hapticPress();
    // Open the workout for today (no weekday backfill - the program preview
    // is day-agnostic; the session is attributed to the day it's logged).
    router.push({
      pathname: "/(workout)/program-detail",
      params: {
        name: workout.name,
        exercises: JSON.stringify(workout.exercises || []),
        phaseName: phaseName || "",
        dayNumber: String(workout.day_number),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>
          Workouts
        </Text>
        <Pressable onPress={startEmptyWorkout} hitSlop={8}>
          <Ionicons name="add" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {initialLoading ? (
          <WorkoutSkeleton />
        ) : (
        <Animated.View entering={FadeIn.duration(220)}>
        {/* Today's Workout. Three states:
            - completed today      → tap routes to session detail
            - assigned, not done   → tap starts the workout
            - rest day             → static card */}
        {todayWorkout ? (
          <Pressable
            onPress={() => {
              if (todaySessionId) {
                hapticPress();
                router.push({
                  pathname: "/(workout)/session-detail",
                  params: { sessionId: todaySessionId },
                });
              } else {
                openWorkoutDetail(todayWorkout);
              }
            }}
            style={[styles.todayCard, { backgroundColor: colors.text }]}
          >
            <Text allowFontScaling={false} style={[styles.todayLabel, { color: colors.bgSecondary }]}>
              TODAY
            </Text>
            <Text allowFontScaling={false} style={[styles.todayName, { color: colors.bg }]}>
              {todayWorkout.name}
            </Text>
            {todayWorkout.exercises?.length > 0 && (
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.todayExercises, { color: colors.bgSecondary }]}>
                {todayWorkout.exercises.map((e: any) => e.name || e.exercise_name).join(", ")}
              </Text>
            )}
            <View style={styles.todayStart}>
              <Text allowFontScaling={false} style={[styles.todayStartText, { color: colors.bg }]}>
                {todaySessionId ? "Completed · View" : "Start Workout"}
              </Text>
              <Ionicons
                name={todaySessionId ? "checkmark-circle" : "play"}
                size={16}
                color={colors.bg}
              />
            </View>
          </Pressable>
        ) : todayIsRest ? (
          <View style={[styles.todayCard, { backgroundColor: colors.bgSecondary }]}>
            <Text allowFontScaling={false} style={[styles.todayLabel, { color: colors.textMuted }]}>
              TODAY
            </Text>
            <Text allowFontScaling={false} style={[styles.todayName, { color: colors.text }]}>
              Rest day
            </Text>
            <Text allowFontScaling={false} style={[styles.todayExercises, { color: colors.textMuted }]}>
              No workout planned today. You can still log one.
            </Text>
            <Pressable onPress={startEmptyWorkout} style={styles.todayStart}>
              <Text allowFontScaling={false} style={[styles.todayStartText, { color: colors.text }]}>
                Log anyway
              </Text>
              <Ionicons name="add-circle-outline" size={16} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          /* No program or no today workout - show a clear start CTA */
          <Pressable
            onPress={startEmptyWorkout}
            style={[styles.todayCard, { backgroundColor: colors.bgSecondary }]}
          >
            <Text allowFontScaling={false} style={[styles.todayLabel, { color: colors.textMuted }]}>
              TODAY
            </Text>
            <Text allowFontScaling={false} style={[styles.todayName, { color: colors.text }]}>
              No workout assigned
            </Text>
            <Text allowFontScaling={false} style={[styles.todayExercises, { color: colors.textMuted }]}>
              Start an empty session or pick from your program below.
            </Text>
            <View style={styles.todayStart}>
              <Text allowFontScaling={false} style={[styles.todayStartText, { color: colors.text }]}>
                Start Empty Workout
              </Text>
              <Ionicons name="add-circle-outline" size={16} color={colors.text} />
            </View>
          </Pressable>
        )}

        {/* Program Workouts - the phase's workouts, day-agnostic */}
        {programName && workouts.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <Text allowFontScaling={false} style={[styles.sectionTitle, { color: colors.text }]}>
                {programName}
              </Text>
              {phaseName && (
                <Text allowFontScaling={false} style={[styles.phaseLabel, { color: colors.textMuted }]}>
                  {phaseName}
                </Text>
              )}
            </View>

            {workouts.map((workout) => {
              const exerciseCount = workout.exercises?.length || 0;
              const totalSets = (workout.exercises || []).reduce((s: number, e: any) => s + (e.sets || 0), 0);
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => openWorkoutDetail(workout)}
                  style={[styles.workoutCard, { backgroundColor: colors.bgSecondary }]}
                >
                  <ExerciseGlyph size={40} tint={colors.bg} />
                  <View style={styles.workoutInfo}>
                    <Text allowFontScaling={false} style={[styles.workoutName, { color: colors.text }]}>
                      {workout.name}
                    </Text>
                    {(exerciseCount > 0 || totalSets > 0) && (
                      <Text allowFontScaling={false} style={[styles.workoutMeta, { color: colors.textMuted }]}>
                        {[
                          exerciseCount > 0 ? `${exerciseCount} exercises` : null,
                          totalSets > 0 ? `${totalSets} sets` : null,
                        ].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* More */}
        <View style={styles.moreSection}>
          <Text allowFontScaling={false} style={[styles.sectionTitle, { color: colors.text }]}>
            More
          </Text>
          <MoreRow icon="add-outline" label="Empty Workout" onPress={startEmptyWorkout} colors={colors} />
          <MoreRow icon="time-outline" label="Workout History" onPress={() => router.push("/(workout)/history")} colors={colors} />
        </View>
        </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreRow({ icon, label, onPress, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable onPress={onPress} style={styles.moreRow}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text allowFontScaling={false} style={[styles.moreLabel, { color: colors.text }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 28, fontWeight: "700" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

  todayCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  todayLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  todayName: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  todayExercises: { fontSize: 13, marginTop: 6, opacity: 0.7 },
  todayStart: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  todayStartText: { fontSize: 15, fontWeight: "600" },

  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  phaseLabel: { fontSize: 13, marginTop: 2 },

  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  workoutInfo: { flex: 1, gap: 2 },
  workoutName: { fontSize: 15, fontWeight: "600" },
  workoutMeta: { fontSize: 12 },

  moreSection: { marginTop: spacing.xl },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: spacing.md,
  },
  moreLabel: { flex: 1, fontSize: 15 },
});
