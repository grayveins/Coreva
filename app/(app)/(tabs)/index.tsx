import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { spacing, radius } from "@/src/theme";
import { useStreak } from "@/src/hooks/useStreak";
import { useBodyStats } from "@/src/hooks/useBodyStats";
import { useClientMacros } from "@/src/hooks/useClientMacros";
import { useHealthKit } from "@/src/hooks/useHealthKit";
import { MetricCard } from "@/src/components/progress/MetricCard";
import { HealthKitPermissionCard } from "@/src/components/HealthKitPermissionCard";
import { hapticPress } from "@/src/animations/feedback/haptics";
import {
  fetchTasksForRange,
  setCustomTaskCompleted,
  type CoachTask,
} from "@/src/lib/coachTasks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchActiveHabits,
  fetchHabitLogs,
  setHabitLog,
  computeCurrentStreak,
  computeWeeklyCompleted,
  todayLocalISO,
  type HabitAssignment,
  type HabitLog,
} from "@/src/lib/habits";
import { HabitRow } from "@/src/components/HabitRow";
import {
  useDailyFlag,
  dailyFlagPrefix,
  ymdFromDailyFlagKey,
} from "@/src/hooks/useDailyFlag";
import {
  fetchScheduledMap,
  resolveDay,
  type ScheduledMap,
  type WorkoutLite,
} from "@/src/lib/scheduledWorkouts";

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// Generate 14 days: 7 past + today + 6 future
const generateDays = () => {
  const today = new Date();
  return Array.from({ length: 21 }, (_, i) => addDays(today, i - 10));
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("there");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allWorkouts, setAllWorkouts] = useState<any[]>([]);
  // All phase_workouts in the active program, keyed by id. Used to look up
  // a workout that scheduled_workouts references - possibly from a phase
  // other than the currently-active one.
  const [workoutsById, setWorkoutsById] = useState<Map<string, WorkoutLite>>(
    () => new Map(),
  );
  const [scheduledByDate, setScheduledByDate] = useState<ScheduledMap>(
    () => new Map(),
  );
  const [programName, setProgramName] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [habits, setHabits] = useState<HabitAssignment[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  // Per-day signals for the perfect-day badge. All keyed by YYYY-MM-DD.
  const [coachTasksWindow, setCoachTasksWindow] = useState<CoachTask[]>([]);
  const [progressPhotoDates, setProgressPhotoDates] = useState<Set<string>>(() => new Set());
  const [bodyStatsDates, setBodyStatsDates] = useState<Set<string>>(() => new Set());
  const [macroFlagDates, setMacroFlagDates] = useState<Set<string>>(() => new Set());

  const { data: bodyStats, refresh: refreshStats } = useBodyStats(userId);
  const { data: macros } = useClientMacros(userId);
  const { currentStreak, todayStatus } = useStreak(userId);
  const {
    permissionState: hkPermissionState,
    steps: hkSteps,
    activeEnergy: hkActiveEnergyEnergy,
    refresh: refreshHealthKit,
    requestAuth: requestHealthKitAuth,
  } = useHealthKit(userId);

  const days = useMemo(generateDays, []);
  // Pin "today" to a single Date instance per mount so memos that depend
  // on it don't re-run every render. Per-screen ephemera; no need to
  // recompute as the day rolls over (user re-mounts when reopening tab).
  const today = useMemo(() => new Date(), []);
  const isToday = isSameDay(selectedDate, today);
  const isFutureDate = startOfDay(selectedDate).getTime() > startOfDay(today).getTime();
  const selectedDayOfWeek = selectedDate.getDay() || 7;

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/sign-in"); return; }
    setUserId(user.id);

    // The three queries below are independent - fire them in parallel
    // instead of awaiting each one in series. Cuts perceived load time
    // on Home from ~3 round-trips to 1.
    const cutoff = subDays(new Date(), 21).toISOString();
    // Day-strip in this screen spans 14 days back / 14 days forward; fetch
    // a slightly wider window so quick swipes don't miss schedule rows.
    const scheduleFrom = subDays(new Date(), 21);
    const scheduleTo = addDays(new Date(), 21);
    const [profileRes, programRes, sessionsRes, schedMap] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("coaching_programs")
        .select("id, name, program_phases(id, name, status, phase_number, phase_workouts(id, day_number, name, exercises))")
        .eq("client_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("id, title, started_at, ended_at")
        .eq("user_id", user.id)
        .gte("started_at", cutoff)
        .order("started_at", { ascending: false }),
      fetchScheduledMap(user.id, scheduleFrom, scheduleTo),
    ]);

    const profile = profileRes.data as { first_name?: string } | null;
    if (profile?.first_name) setProfileName(profile.first_name);

    const program = programRes.data as
      | { name: string; program_phases?: any[] }
      | null;
    if (program) {
      setProgramName(program.name);
      const sortedPhases = (program.program_phases ?? [])
        .sort((a: any, b: any) => (a.phase_number ?? 0) - (b.phase_number ?? 0));
      const activePhase =
        sortedPhases.find((p: any) => p.status === "active") || sortedPhases[0];
      setAllWorkouts(activePhase?.phase_workouts ?? []);

      // workoutsById spans every phase in the program, not just the active
      // one - so a coach scheduling a workout from phase 2 while phase 1 is
      // still active still resolves correctly.
      const byId = new Map<string, WorkoutLite>();
      for (const ph of sortedPhases) {
        for (const w of (ph.phase_workouts ?? [])) {
          byId.set(w.id, w as WorkoutLite);
        }
      }
      setWorkoutsById(byId);
    } else {
      setWorkoutsById(new Map());
    }
    setScheduledByDate(schedMap);

    setCompletedSessions(sessionsRes.data ?? []);
    setInitialLoading(false);
  }, []);

  const lastFetchedAt = useRef(0);
  useFocusEffect(useCallback(() => {
    if (Date.now() - lastFetchedAt.current > 30_000) {
      fetchData();
      lastFetchedAt.current = Date.now();
    }
  }, [fetchData]));

  // Day-strip ref + auto-scroll on selection change so the selected day
  // becomes the leftmost fully-visible chip (Trainerize-like behavior).
  const dayStripRef = useRef<ScrollView | null>(null);
  const dayStripMounted = useRef(false);
  useEffect(() => {
    const idx = days.findIndex((d) => isSameDay(d, selectedDate));
    if (idx < 0) return;
    // 52px = chip min width (see styles.dayChip). Subtract a small offset
    // so the previous day peeks in for context.
    const x = Math.max(0, idx * 52 - 4);
    dayStripRef.current?.scrollTo({ x, animated: dayStripMounted.current });
    dayStripMounted.current = true;
  }, [selectedDate, days]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    await refreshStats();
    await refreshHealthKit();
    setRefreshing(false);
  }, [fetchData, refreshStats, refreshHealthKit]);

  // Fetch coach-scheduled tasks across the visible day-strip (±10 days).
  // We need the full window so the perfect-day badge can light up past
  // chips, not just the selected day. The selected-day list is then
  // derived via memo below.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fromDate = format(subDays(new Date(), 10), "yyyy-MM-dd");
    const toDate = format(addDays(new Date(), 10), "yyyy-MM-dd");
    fetchTasksForRange({ clientId: userId, fromDate, toDate })
      .then((tasks) => { if (!cancelled) setCoachTasksWindow(tasks); })
      .catch(() => { if (!cancelled) setCoachTasksWindow([]); });
    return () => { cancelled = true; };
  }, [userId]);

  // Auxiliary signals for the perfect-day badge: did the user log
  // photos / body stats / macros for each day in the window? Photos +
  // stats live in the DB; macros flags live in AsyncStorage (per-device,
  // per-day). All are read once when userId resolves.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fromDate = format(subDays(new Date(), 10), "yyyy-MM-dd");
    const toDate = format(addDays(new Date(), 10), "yyyy-MM-dd");

    (async () => {
      const [photoRes, statsRes, allKeys] = await Promise.all([
        supabase
          .from("progress_photos")
          .select("taken_at")
          .eq("client_id", userId)
          .gte("taken_at", fromDate)
          .lte("taken_at", toDate),
        supabase
          .from("body_stats")
          .select("date")
          .eq("client_id", userId)
          .gte("date", fromDate)
          .lte("date", toDate),
        AsyncStorage.getAllKeys().catch(() => [] as readonly string[]),
      ]);
      if (cancelled) return;

      setProgressPhotoDates(
        new Set(((photoRes.data ?? []) as any[]).map((r) => r.taken_at as string))
      );
      setBodyStatsDates(
        new Set(((statsRes.data ?? []) as any[]).map((r) => r.date as string))
      );

      // User-scoped macro flag prefix; ignores legacy unscoped keys
      // from previous test accounts on the same device.
      const userPrefix = dailyFlagPrefix(userId, "macros");
      const macroKeys = (allKeys as readonly string[]).filter((k) =>
        k.startsWith(userPrefix),
      );
      if (macroKeys.length === 0) {
        setMacroFlagDates(new Set());
        return;
      }
      const pairs = await AsyncStorage.multiGet(macroKeys).catch(
        () => [] as [string, string | null][]
      );
      if (cancelled) return;
      const dates = new Set<string>();
      for (const [k, v] of pairs) {
        if (v !== "1") continue;
        const ymd = ymdFromDailyFlagKey(k);
        if (!ymd) continue;
        if (ymd >= fromDate && ymd <= toDate) dates.add(ymd);
      }
      setMacroFlagDates(dates);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Selected-day coach tasks - derived from the window; rendering and the
  // optimistic toggle use this.
  const coachTasks = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return coachTasksWindow.filter((t) => t.scheduled_for === dateStr);
  }, [coachTasksWindow, selectedDate]);

  // Habits - only relevant for "today." Future days don't get a checkbox
  // (you can't pre-complete tomorrow's water intake), past days are
  // read-only history. Keeps the affordance unambiguous.
  //
  // Fetch assignments + 30 days of logs in parallel. The logs query needs
  // assignment ids, so we run them serially only for the assignment ids;
  // we compute the date window in parallel with the assignment fetch so
  // the second query starts immediately on assignments arriving.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const today = todayLocalISO();
        const from = new Date();
        from.setDate(from.getDate() - 30);
        const fromISO = from.toISOString().slice(0, 10);

        const active = await fetchActiveHabits(userId);
        if (cancelled) return;
        setHabits(active);

        if (active.length === 0) {
          setHabitLogs([]);
          return;
        }
        const logs = await fetchHabitLogs({
          clientId: userId,
          assignmentIds: active.map((h) => h.id),
          fromDate: fromISO,
          toDate: today,
        });
        if (!cancelled) setHabitLogs(logs);
      } catch {
        if (!cancelled) {
          setHabits([]);
          setHabitLogs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleHabit = useCallback(
    async (habit: HabitAssignment) => {
      if (!userId || isFutureDate) return;
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const existing = habitLogs.find(
        (l) => l.assignment_id === habit.id && l.date === dateStr
      );
      const wasCompleted = !!existing?.completed;
      const next = !wasCompleted;

      // Optimistic update
      setHabitLogs((prev) => {
        if (existing) {
          return prev.map((l) =>
            l.id === existing.id ? { ...l, completed: next } : l
          );
        }
        return [
          ...prev,
          {
            id: `tmp-${Date.now()}`,
            assignment_id: habit.id,
            client_id: userId,
            date: dateStr,
            completed: next,
            value: null,
            created_at: new Date().toISOString(),
          },
        ];
      });
      hapticPress();

      try {
        await setHabitLog({
          clientId: userId,
          assignmentId: habit.id,
          date: dateStr,
          completed: next,
        });
      } catch {
        // Roll back
        setHabitLogs((prev) => {
          if (existing) {
            return prev.map((l) =>
              l.id === existing.id ? { ...l, completed: wasCompleted } : l
            );
          }
          return prev.filter((l) => !l.id.startsWith("tmp-"));
        });
      }
    },
    [userId, habitLogs, isFutureDate, selectedDate]
  );

  const toggleCustomTask = useCallback(async (task: CoachTask) => {
    const wasCompleted = !!task.manually_completed_at;
    setCoachTasksWindow((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, manually_completed_at: wasCompleted ? null : new Date().toISOString() }
          : t
      )
    );
    try {
      await setCustomTaskCompleted(task.id, !wasCompleted);
    } catch {
      // Roll back optimistic update on failure
      setCoachTasksWindow((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, manually_completed_at: wasCompleted ? new Date().toISOString() : null }
            : t
        )
      );
    }
  }, []);

  // Resolve the day via scheduled_workouts first, fall back to day_number.
  // Returns the workout to render plus a kind so the UI can distinguish
  // an explicit rest day from "no workout assigned" (those look the same
  // when both yield null otherwise).
  const resolved = useMemo(
    () =>
      resolveDay({
        date: selectedDate,
        scheduledByDate,
        workoutsById,
        activePhaseWorkouts: allWorkouts as WorkoutLite[],
      }),
    [selectedDate, scheduledByDate, workoutsById, allWorkouts],
  );
  const selectedDayWorkout = useMemo<any>(() => {
    if (resolved.kind === "rest") return null;
    return resolved.workout ?? null;
  }, [resolved]);
  const selectedDayIsRest = resolved.kind === "rest";

  // Check if selected day has a completed session
  const selectedDayCompleted = useMemo(() => {
    return completedSessions.find((s: any) =>
      isSameDay(new Date(s.started_at), selectedDate)
    ) || null;
  }, [completedSessions, selectedDate]);

  // Check which days have completions (for dots)
  const completedDates = useMemo(() => {
    const set = new Set<string>();
    completedSessions.forEach((s: any) => set.add(format(new Date(s.started_at), "yyyy-MM-dd")));
    return set;
  }, [completedSessions]);

  const greeting = `${getGreeting()}, ${profileName}`;
  const weightLbs = bodyStats?.weight_kg ? (bodyStats.weight_kg * 2.205).toFixed(1) : "-";

  const workoutsThisWeek = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return completedSessions.filter((s: any) => new Date(s.started_at) >= start).length;
  }, [completedSessions]);

  const macrosFlag = useDailyFlag("macros", format(selectedDate, "yyyy-MM-dd"), userId);

  // Toggle the macros flag *and* mutate the per-day Set used by the
  // perfect-day badge so the chip lights up the moment the row flips,
  // not after a refresh.
  const toggleMacrosForSelectedDay = useCallback(() => {
    if (isFutureDate) return;
    hapticPress();
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const willBeOn = !macrosFlag.on;
    setMacroFlagDates((prev) => {
      const next = new Set(prev);
      if (willBeOn) next.add(dateStr);
      else next.delete(dateStr);
      return next;
    });
    macrosFlag.toggle();
  }, [isFutureDate, selectedDate, macrosFlag]);

  // Set of YYYY-MM-DD strings whose Home slate is fully completed.
  // Recomputes on any state change feeding into "done-ness". Days with
  // zero applicable items are NOT included - perfection requires at
  // least one item to have been on the slate.
  const perfectDates = useMemo(() => {
    const result = new Set<string>();
    const todayStartMs = startOfDay(today).getTime();
    const macrosTargetSet = !!macros;

    for (const day of days) {
      // Future days can't be perfect.
      if (startOfDay(day).getTime() > todayStartMs) continue;

      const ymd = format(day, "yyyy-MM-dd");
      let any = false;
      let allDone = true;

      // Workout
      const resolved = resolveDay({
        date: day,
        scheduledByDate,
        workoutsById,
        activePhaseWorkouts: allWorkouts as WorkoutLite[],
      });
      if (resolved.kind === "workout") {
        any = true;
        if (!completedDates.has(ymd)) allDone = false;
      }
      // resolved.kind === "rest" or "none" → workout doesn't gate

      // Nutrition (only when a coach has set a target)
      if (macrosTargetSet) {
        any = true;
        if (!macroFlagDates.has(ymd)) allDone = false;
      }

      // Habits - only those that existed on or before EOD of `day`.
      const endOfDayMs = startOfDay(day).getTime() + 24 * 60 * 60 * 1000 - 1;
      for (const h of habits) {
        if (new Date(h.created_at).getTime() > endOfDayMs) continue;
        any = true;
        const log = habitLogs.find(
          (l) => l.assignment_id === h.id && l.date === ymd && l.completed
        );
        if (!log) allDone = false;
      }

      // Coach tasks scheduled for this day
      for (const t of coachTasksWindow) {
        if (t.scheduled_for !== ymd) continue;
        any = true;
        let done = false;
        if (t.task_type === "custom") done = !!t.manually_completed_at;
        else if (t.task_type === "macros") done = macroFlagDates.has(ymd);
        else if (t.task_type === "photos") done = progressPhotoDates.has(ymd);
        else if (t.task_type === "body_stats") done = bodyStatsDates.has(ymd);
        if (!done) allDone = false;
      }

      if (any && allDone) result.add(ymd);
    }
    return result;
  }, [
    days,
    today,
    macros,
    macroFlagDates,
    habits,
    habitLogs,
    coachTasksWindow,
    completedDates,
    scheduledByDate,
    workoutsById,
    allWorkouts,
    progressPhotoDates,
    bodyStatsDates,
  ]);

  const startWorkout = () => {
    hapticPress();
    if (selectedDayWorkout) {
      router.push({
        pathname: "/(workout)/program-detail",
        params: {
          name: selectedDayWorkout.name,
          exercises: JSON.stringify(selectedDayWorkout.exercises || []),
          phaseName: programName || "",
          dayNumber: String(selectedDayWorkout.day_number),
          sessionDate: format(selectedDate, "yyyy-MM-dd"),
        },
      });
    } else {
      router.push("/(app)/(tabs)/workout");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text allowFontScaling={false} style={[styles.greeting, { color: colors.textMuted }]}>
          {greeting}
        </Text>
        <View style={styles.headerActions}>
          <StreakPill streak={currentStreak} status={todayStatus} colors={colors} />
          <AvatarButton name={profileName} colors={colors} />
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {/* Date label scrolls with content */}
        <View style={styles.dateRow}>
          <Text allowFontScaling={false} style={[styles.dateLabel, { color: colors.text }]}>
            {format(selectedDate, "MMMM d")}
            {isToday ? "" : ` · ${format(selectedDate, "EEEE")}`}
          </Text>
          {!isToday && (
            <Pressable onPress={() => setSelectedDate(new Date())}>
              <Text allowFontScaling={false} style={[styles.todayLink, { color: colors.text }]}>
                Today
              </Text>
            </Pressable>
          )}
        </View>

        {/* Day selector. Scroll behavior lives in the dayStripRef effect
            above so taps re-snap the selection. */}
        <ScrollView
          ref={dayStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
        >
          {days.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isSameDay(day, today);
            const dateStr = format(day, "yyyy-MM-dd");
            const hasCompletion = completedDates.has(dateStr);
            const isPerfect = perfectDates.has(dateStr);

            return (
              <Pressable
                key={i}
                onPress={() => { hapticPress(); setSelectedDate(day); }}
                style={[
                  styles.dayChip,
                  isSelected && { backgroundColor: colors.text },
                ]}
              >
                {isPerfect && (
                  <View style={styles.perfectBadge}>
                    <Ionicons
                      name="flame"
                      size={11}
                      color={isSelected ? colors.bg : colors.text}
                    />
                  </View>
                )}
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.dayNum,
                    { color: isSelected ? colors.bg : colors.text },
                    isDayToday && !isSelected && { fontWeight: "700" },
                  ]}
                >
                  {format(day, "d")}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[styles.dayLabel, { color: isSelected ? colors.bg : colors.textMuted }]}
                >
                  {format(day, "EEE")}
                </Text>
                {hasCompletion && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? colors.bg : colors.text }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {initialLoading ? (
          <HomeBodySkeleton colors={colors} />
        ) : (
        <Animated.View entering={FadeIn.duration(220)}>
        <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {isToday ? "TODAY" : format(selectedDate, "EEEE").toUpperCase()}
        </Text>
        <View style={styles.taskList}>
          {/* Assigned workout. Tap routes:
              - If already completed → past-session detail (read-only).
              - If not completed yet → start the workout flow. */}
          {selectedDayWorkout && (
            <Pressable
              onPress={() => {
                if (selectedDayCompleted) {
                  hapticPress();
                  router.push({
                    pathname: "/(workout)/session-detail",
                    params: { sessionId: selectedDayCompleted.id },
                  });
                } else {
                  startWorkout();
                }
              }}
              style={[styles.taskCard, { backgroundColor: colors.bgSecondary }]}
            >
              <View style={[styles.taskDot, {
                backgroundColor: selectedDayCompleted ? colors.success : "transparent",
                borderColor: selectedDayCompleted ? colors.success : colors.textMuted,
              }]}>
                {selectedDayCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <View style={styles.taskInfo}>
                <Text allowFontScaling={false} style={[styles.taskTitle, { color: colors.text }]}>
                  {selectedDayWorkout.name}
                </Text>
                <Text allowFontScaling={false} style={[styles.taskSub, { color: colors.textMuted }]}>
                  {selectedDayCompleted ? "Completed · Tap to view" : `${(selectedDayWorkout.exercises || []).length} exercises`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Rest day - coach explicitly marked this date as rest */}
          {selectedDayIsRest && !selectedDayCompleted && (
            <View style={[styles.taskCard, { backgroundColor: colors.bgSecondary }]}>
              <View style={[styles.taskDot, { borderColor: colors.textMuted, backgroundColor: "transparent" }]} />
              <View style={styles.taskInfo}>
                <Text allowFontScaling={false} style={[styles.taskTitle, { color: colors.text }]}>
                  Rest day
                </Text>
                <Text allowFontScaling={false} style={[styles.taskSub, { color: colors.textMuted }]}>
                  No workout planned
                </Text>
              </View>
            </View>
          )}

          {/* Completed workout (if no assigned but has a logged session) */}
          {!selectedDayWorkout && selectedDayCompleted && (
            <Pressable
              onPress={() => {
                hapticPress();
                router.push({
                  pathname: "/(workout)/session-detail",
                  params: { sessionId: selectedDayCompleted.id },
                });
              }}
              style={[styles.taskCard, { backgroundColor: colors.bgSecondary }]}
            >
              <View style={[styles.taskDot, { backgroundColor: colors.success, borderColor: colors.success }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <View style={styles.taskInfo}>
                <Text allowFontScaling={false} style={[styles.taskTitle, { color: colors.text }]}>
                  {selectedDayCompleted.title || "Workout"}
                </Text>
                <Text allowFontScaling={false} style={[styles.taskSub, { color: colors.textMuted }]}>Completed</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          )}

          {/* Nutrition row - toggle like a habit; backfill works for past +
              today, future is read-only (you can't "have hit" tomorrow). */}
          {macros && !coachTasks.some((t) => t.task_type === "macros") && (
            <Pressable
              onPress={toggleMacrosForSelectedDay}
              disabled={isFutureDate}
              style={[styles.taskCard, { backgroundColor: colors.bgSecondary, opacity: isFutureDate ? 0.6 : 1 }]}
            >
              <View style={[
                styles.taskDot,
                {
                  backgroundColor: macrosFlag.on ? colors.success : "transparent",
                  borderColor: macrosFlag.on ? colors.success : colors.textMuted,
                },
              ]}>
                {macrosFlag.on && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <View style={styles.taskInfo}>
                <Text allowFontScaling={false} style={[styles.taskTitle, { color: colors.text }]}>
                  Hit your daily nutrition goal
                </Text>
                <Text allowFontScaling={false} style={[styles.taskSub, { color: colors.textMuted }]}>
                  {macros.calories} cal · {macros.protein_g}g P · {macros.carbs_g}g C · {macros.fat_g}g F
                </Text>
              </View>
            </Pressable>
          )}

          {/* Coach-scheduled tasks */}
          {coachTasks.map((task) => {
            const completed = !!task.manually_completed_at;
            const handlePress = () => {
              hapticPress();
              if (task.task_type === "custom") {
                toggleCustomTask(task);
                return;
              }
              if (task.task_type === "photos") {
                router.push("/(app)/progress-photos" as any);
              } else if (task.task_type === "body_stats") {
                router.push({
                  pathname: "/(app)/log-progress",
                  params: { date: format(selectedDate, "yyyy-MM-dd") },
                } as any);
              } else if (task.task_type === "macros") {
                router.push("/(app)/(tabs)/meals" as any);
              }
            };
            return (
              <Pressable
                key={task.id}
                onPress={handlePress}
                style={[styles.taskCard, { backgroundColor: colors.bgSecondary }]}
              >
                <View
                  style={[
                    styles.taskDot,
                    {
                      backgroundColor: completed ? colors.success : "transparent",
                      borderColor: completed ? colors.success : colors.textMuted,
                    },
                  ]}
                >
                  {completed && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={styles.taskInfo}>
                  <Text allowFontScaling={false} style={[styles.taskTitle, { color: colors.text }]}>
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text allowFontScaling={false} style={[styles.taskSub, { color: colors.textMuted }]}>
                      {task.description}
                    </Text>
                  ) : null}
                </View>
                {task.task_type !== "custom" && (
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
              </Pressable>
            );
          })}

          {/* Coach-set habits - visible on every day with that day's log
              state. Only checkable on "today" - past/future days are
              read-only since the act of completing them happened (or
              didn't) at that point in time. */}
          {habits.map((habit) => {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const log = habitLogs.find(
              (l) => l.assignment_id === habit.id && l.date === dateStr
            );
            const completed = !!log?.completed;
            const streak = computeCurrentStreak(habitLogs, habit.id, todayLocalISO());
            const weeklyDone = computeWeeklyCompleted(habitLogs, habit.id);
            return (
              <HabitRow
                key={habit.id}
                name={habit.name}
                frequency={habit.frequency}
                weeklyDone={weeklyDone}
                streak={streak}
                completed={completed}
                enabled={!isFutureDate}
                onToggle={() => toggleHabit(habit)}
              />
            );
          })}
        </View>

        {/* Apple Health prompt - only when HealthKit is supported AND
            we haven't asked yet (or the user denied). When the runtime
            is "unsupported" (Expo Go, Android, missing native module)
            we render nothing - the previous version showed a Connect
            CTA in builds where it'd silently fail. */}
        {Platform.OS === "ios" &&
          (hkPermissionState === "not_asked" || hkPermissionState === "likely_denied") && (
            <View style={{ marginTop: spacing.lg }}>
              <HealthKitPermissionCard
                state={hkPermissionState}
                onConnect={requestHealthKitAuth}
              />
            </View>
          )}

        {/* Activity card - steps + active energy, hidden when no data. */}
        {hkPermissionState === "likely_granted" &&
          (hkSteps != null || hkActiveEnergy != null) && (
            <View style={[styles.activityCard, { backgroundColor: colors.bgSecondary }]}>
              <View style={styles.activityCol}>
                <Text allowFontScaling={false} style={[styles.activityValue, { color: colors.text }]}>
                  {hkSteps != null ? hkSteps.toLocaleString() : "-"}
                </Text>
                <Text allowFontScaling={false} style={[styles.activityLabel, { color: colors.textMuted }]}>
                  STEPS
                </Text>
              </View>
              <View style={[styles.activityDivider, { backgroundColor: colors.border }]} />
              <View style={styles.activityCol}>
                <Text allowFontScaling={false} style={[styles.activityValue, { color: colors.text }]}>
                  {hkActiveEnergy != null ? hkActiveEnergy.toLocaleString() : "-"}
                </Text>
                <Text allowFontScaling={false} style={[styles.activityLabel, { color: colors.textMuted }]}>
                  ACTIVE KCAL
                </Text>
              </View>
            </View>
          )}

        {/* My Progress section */}
        <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted }]}>
          MY PROGRESS
        </Text>
        <View style={styles.cardRow}>
          <MetricCard
            title="Scale Weight"
            subtitle={bodyStats?.date ? format(new Date(bodyStats.date), "d MMM yyyy") : "No data"}
            value={weightLbs}
            unit="lbs"
            onAdd={() => router.push({ pathname: "/(app)/log-progress", params: { date: format(selectedDate, "yyyy-MM-dd") } } as any)}
          />
          <MetricCard
            title="Body Fat"
            subtitle={bodyStats?.date ? format(new Date(bodyStats.date), "d MMM yyyy") : "No data"}
            value={bodyStats?.body_fat_pct != null ? `${bodyStats.body_fat_pct}` : "-"}
            unit="%"
            onAdd={() => router.push({ pathname: "/(app)/log-progress", params: { date: format(selectedDate, "yyyy-MM-dd") } } as any)}
          />
        </View>
        <View style={styles.cardRow}>
          <MetricCard
            title="Streak"
            subtitle={currentStreak > 0 ? "Keep it going" : "Start today"}
            value={`${currentStreak}`}
            unit={currentStreak === 1 ? "day" : "days"}
          />
          <MetricCard
            title="Workouts"
            subtitle="This week"
            value={`${workoutsThisWeek}`}
            unit={workoutsThisWeek === 1 ? "session" : "sessions"}
          />
        </View>
        {Platform.OS === "ios" && (
          <View style={styles.cardRow}>
            <MetricCard
              title="Steps Today"
              subtitle="From Apple Health"
              value={hkSteps != null ? hkSteps.toLocaleString() : "-"}
              unit="steps"
            />
            <MetricCard
              title="Active Energy"
              subtitle="Today"
              value={hkActiveEnergyEnergy != null ? `${hkActiveEnergyEnergy}` : "-"}
              unit="kcal"
            />
          </View>
        )}
        </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeBodySkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
      <View style={{ height: 14, width: "30%", backgroundColor: colors.border, borderRadius: 4, opacity: 0.4 }} />
      <View style={{ height: 64, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
      <View style={{ height: 64, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
      <View style={{ height: 64, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
      <View style={{ height: 14, width: "30%", backgroundColor: colors.border, borderRadius: 4, opacity: 0.4, marginTop: spacing.lg }} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, height: 92, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
        <View style={{ flex: 1, height: 92, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, height: 92, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
        <View style={{ flex: 1, height: 92, backgroundColor: colors.bgSecondary, borderRadius: radius.lg }} />
      </View>
    </View>
  );
}

type StreakStatus = "pending" | "complete" | "rest" | "unmet" | "none";

function StreakPill({
  streak,
  status,
  colors,
}: {
  streak: number;
  status: StreakStatus;
  colors: any;
}) {
  // Visual states:
  //   complete → lit flame (today's done, streak alive)
  //   rest     → moon (rest day, habits hit)
  //   pending  → dim flame (today still has work; streak shows yesterday's count)
  //   unmet/none → dim flame at low opacity (no live streak)
  const lit = status === "complete" || status === "rest";
  const icon: keyof typeof Ionicons.glyphMap = status === "rest" ? "moon" : "flame";
  const opacity = lit ? 1 : streak > 0 ? 0.7 : 0.5;
  const a11y =
    status === "pending"
      ? `${streak} day streak, today pending`
      : status === "rest"
      ? `${streak} day streak, rest day`
      : `${streak} day streak`;

  return (
    <View
      style={[
        styles.streakPill,
        {
          backgroundColor: colors.bgSecondary,
          borderColor: colors.border,
          opacity,
        },
      ]}
      accessibilityLabel={a11y}
    >
      <Ionicons name={icon} size={14} color={colors.text} />
      <Text allowFontScaling={false} style={[styles.streakText, { color: colors.text }]}>
        {streak}
      </Text>
    </View>
  );
}

function AvatarButton({ name, colors }: { name: string; colors: any }) {
  const navigation = useNavigation<any>();
  const initial = (name || "?").charAt(0).toUpperCase();

  const openDrawer = () => {
    try { navigation.openDrawer?.(); return; } catch {}
    try { navigation.getParent()?.openDrawer?.(); return; } catch {}
    try { navigation.getParent()?.getParent()?.openDrawer?.(); return; } catch {}
    router.push("/settings");
  };

  return (
    <Pressable onPress={openDrawer} style={[styles.avatar, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
      <Text allowFontScaling={false} style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
  },
  greeting: { fontSize: 14, fontWeight: "500", letterSpacing: 0.2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "600" },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  streakText: { fontSize: 13, fontWeight: "700" },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dateLabel: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  todayLink: { fontSize: 14, fontWeight: "600" },

  dayStrip: {
    paddingHorizontal: spacing.sm,
    gap: 0,
    // Vertical breathing room so the selected chip's filled background
    // doesn't sit flush against the strip's top/bottom edges.
    paddingTop: 4,
    paddingBottom: spacing.base,
  },
  dayChip: {
    flex: 1,
    minWidth: 52,
    height: 62,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  dayNum: { fontSize: 16, fontWeight: "600" },
  dayLabel: { fontSize: 11, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2, position: "absolute", bottom: 4 },
  // Activity card - steps + active energy under the day strip when
  // HealthKit is connected and has data for today.
  activityCard: {
    flexDirection: "row",
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: spacing.lg,
  },
  activityCol: { flex: 1, alignItems: "center", gap: 4 },
  activityValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  activityLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  activityDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  perfectBadge: {
    position: "absolute",
    top: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  taskList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  taskDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: { flex: 1, gap: 1 },
  taskTitle: { fontSize: 15, fontWeight: "500" },
  taskSub: { fontSize: 13 },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: spacing.md },
  cardRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
});
