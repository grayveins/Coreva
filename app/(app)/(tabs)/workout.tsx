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
import { format, isToday, isTomorrow } from "date-fns";
import {
  fetchScheduledMap,
  resolveDay,
  collectUpcomingFromSchedule,
  type WorkoutLite,
  type UpcomingSession,
} from "@/src/lib/scheduledWorkouts";

type PhaseWorkout = {
  id: string;
  day_number: number;
  name: string;
  exercises: any[];
};

// day_number 1=Mon … 7=Sun
const DAY_NAMES: Record<number, string> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday",
};
const DAY_SHORT: Record<number, string> = {
  1: "Mon", 2: "Tue", 3: "Wed",
  4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun",
};

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [programName, setProgramName] = useState<string | null>(null);
  const [phaseName, setPhaseName] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<PhaseWorkout[]>([]);
  /** Real coach-scheduled training days (EOD / Nx week / whatever the coach
   *  set). When present, the program list renders these dated sessions
   *  instead of mapping phase_workouts onto weekdays. */
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
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
      // Today's completed session — drives the TODAY hero CTA state.
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
      setUpcoming([]);
      setTodayWorkout(null);
      setTodayIsRest(false);
      // Keep todaySessionId — even without a program, a logged session
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
      setUpcoming([]);
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

    // Real coach-scheduled cadence for the lookahead window. Empty for
    // programs that were never scheduled — the legacy weekly list renders.
    setUpcoming(
      collectUpcomingFromSchedule({
        from: today,
        days: SCHEDULE_WINDOW_DAYS,
        scheduledByDate: schedMap,
        workoutsById: byId,
      }),
    );

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

  // Open a specific coach-scheduled session, attributing it to its real
  // calendar date (today/past backfills correctly; future stays live).
  const openUpcoming = (session: UpcomingSession) => {
    hapticPress();
    const w = session.workout as PhaseWorkout;
    router.push({
      pathname: "/(workout)/program-detail",
      params: {
        name: w.name,
        exercises: JSON.stringify(w.exercises || []),
        phaseName: phaseName || "",
        dayNumber: String(w.day_number),
        sessionDate: session.iso,
      },
    });
  };

  const openWorkoutDetail = (workout: PhaseWorkout) => {
    hapticPress();
    // Map day_number (1..7 Mon..Sun) to the most recent calendar date for that
    // weekday — so a Mon workout opened on Tue saves to yesterday, not today.
    // Future days in the current week pass no sessionDate (defaults to today).
    const today = new Date();
    const todayDow = today.getDay() || 7;
    const offset = todayDow - workout.day_number;
    const sessionDate = offset >= 0
      ? (() => {
          const d = new Date(today);
          d.setDate(today.getDate() - offset);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        })()
      : undefined;

    router.push({
      pathname: "/(workout)/program-detail",
      params: {
        name: workout.name,
        exercises: JSON.stringify(workout.exercises || []),
        phaseName: phaseName || "",
        dayNumber: String(workout.day_number),
        ...(sessionDate ? { sessionDate } : {}),
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
          /* No program or no today workout — show a clear start CTA */
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

        {/* Program Workouts */}
        {programName && (upcoming.length > 0 || workouts.length > 0) && (
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

            {/* Preferred: real coach-scheduled cadence (EOD, 3x/week, …) on
                actual dates. Falls back to the legacy weekday list below for
                programs that were never scheduled. */}
            {upcoming.length > 0 ? (
              upcoming.map((session) => {
                const w = session.workout as PhaseWorkout;
                const exercises = (w.exercises as any[]) || [];
                const exerciseCount = exercises.length;
                const totalSets = exercises.reduce((s: number, e: any) => s + (e.sets || 0), 0);
                const today = isToday(session.date);
                const dateLabel = today
                  ? "Today"
                  : isTomorrow(session.date)
                    ? "Tomorrow"
                    : format(session.date, "EEE, MMM d");
                return (
                  <Pressable
                    key={session.iso}
                    onPress={() => openUpcoming(session)}
                    style={[
                      styles.workoutCard,
                      { backgroundColor: today ? colors.text : colors.bgSecondary },
                    ]}
                  >
                    <View style={[styles.dayPill, { backgroundColor: today ? "rgba(255,255,255,0.15)" : colors.border }]}>
                      <Text allowFontScaling={false} style={[styles.dayPillText, { color: today ? colors.bg : colors.textMuted }]}>
                        {format(session.date, "EEE").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text allowFontScaling={false} style={[styles.workoutName, { color: today ? colors.bg : colors.text }]}>
                        {w.name}
                      </Text>
                      <Text allowFontScaling={false} style={[styles.workoutMeta, { color: today ? "rgba(255,255,255,0.65)" : colors.textMuted }]}>
                        {dateLabel}{exerciseCount > 0 ? ` · ${exerciseCount} exercises` : ""}
                        {totalSets > 0 ? ` · ${totalSets} sets` : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={today ? colors.bg : colors.textMuted} />
                  </Pressable>
                );
              })
            ) : (
            workouts.map((workout) => {
              const exerciseCount = workout.exercises?.length || 0;
              const totalSets = (workout.exercises || []).reduce((s: number, e: any) => s + (e.sets || 0), 0);
              const dayName = DAY_NAMES[workout.day_number] ?? `Day ${workout.day_number}`;
              const dayShort = DAY_SHORT[workout.day_number];
              // Highlight today's assigned workout
              const todayDow = (new Date().getDay() || 7);
              const isAssignedToday = workout.day_number === todayDow;
              return (
                <Pressable
                  key={workout.id}
                  onPress={() => openWorkoutDetail(workout)}
                  style={[
                    styles.workoutCard,
                    { backgroundColor: isAssignedToday ? colors.text : colors.bgSecondary },
                  ]}
                >
                  {/* Day pill */}
                  {dayShort && (
                    <View style={[styles.dayPill, { backgroundColor: isAssignedToday ? "rgba(255,255,255,0.15)" : colors.border }]}>
                      <Text allowFontScaling={false} style={[styles.dayPillText, { color: isAssignedToday ? colors.bg : colors.textMuted }]}>
                        {dayShort}
                      </Text>
                    </View>
                  )}
                  <View style={styles.workoutInfo}>
                    <Text allowFontScaling={false} style={[styles.workoutName, { color: isAssignedToday ? colors.bg : colors.text }]}>
                      {workout.name}
                    </Text>
                    <Text allowFontScaling={false} style={[styles.workoutMeta, { color: isAssignedToday ? "rgba(255,255,255,0.65)" : colors.textMuted }]}>
                      {dayName}{exerciseCount > 0 ? ` · ${exerciseCount} exercises` : ""}
                      {totalSets > 0 ? ` · ${totalSets} sets` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={isAssignedToday ? colors.bg : colors.textMuted} />
                </Pressable>
              );
            })
            )}
          </View>
        )}

        {/* More */}
        <View style={styles.moreSection}>
          <Text allowFontScaling={false} style={[styles.sectionTitle, { color: colors.text }]}>
            More
          </Text>
          <MoreRow icon="add-outline" label="Empty Workout" onPress={startEmptyWorkout} colors={colors} />
          <MoreRow icon="time-outline" label="Workout History" onPress={() => router.push("/(workout)/history")} colors={colors} />
          <MoreRow icon="barbell-outline" label="Exercise Library" onPress={() => router.push("/(workout)/exercises")} colors={colors} />
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
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dayPillText: { fontSize: 11, fontWeight: "700" },
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
