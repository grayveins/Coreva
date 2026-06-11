import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { supabase } from "@/lib/supabase";
import {
  fetchActiveHabits,
  fetchHabitLogs,
  type HabitAssignment,
  type HabitLog,
} from "@/src/lib/habits";
import { dailyFlagPrefix, ymdFromDailyFlagKey } from "@/src/hooks/useDailyFlag";
import { hapticPress } from "@/src/animations/feedback/haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfDay,
} from "date-fns";

type SessionEvent = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  status: string;
};

type WorkoutEvent = {
  id: string;
  started_at: string;
  title: string | null;
};

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState<SessionEvent[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutEvent[]>([]);
  const [habits, setHabits] = useState<HabitAssignment[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [macroDates, setMacroDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthStartIso = startOfMonth(currentMonth).toISOString();
    const monthEndIso = endOfMonth(currentMonth).toISOString();
    const monthStartYmd = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEndYmd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // Habit logs need assignment ids - fetch assignments first, then logs.
    // Other queries are independent so they go in parallel.
    const [sessionRes, workoutRes, asgn, allKeys] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, scheduled_at, duration_minutes, location, notes, status")
        .eq("client_id", user.id)
        .gte("scheduled_at", monthStartIso)
        .lte("scheduled_at", monthEndIso)
        .order("scheduled_at"),
      supabase
        .from("workout_sessions")
        .select("id, started_at, title")
        .eq("user_id", user.id)
        .gte("started_at", monthStartIso)
        .lte("started_at", monthEndIso)
        .order("started_at"),
      fetchActiveHabits(user.id).catch(() => [] as HabitAssignment[]),
      AsyncStorage.getAllKeys().catch(() => [] as readonly string[]),
    ]);

    if (sessionRes.data) setSessions(sessionRes.data);
    if (workoutRes.data) setWorkouts(workoutRes.data);
    setHabits(asgn);

    if (asgn.length > 0) {
      const logs = await fetchHabitLogs({
        clientId: user.id,
        assignmentIds: asgn.map((h) => h.id),
        fromDate: monthStartYmd,
        toDate: monthEndYmd,
      }).catch(() => [] as HabitLog[]);
      setHabitLogs(logs);
    } else {
      setHabitLogs([]);
    }

    // Macros per-day flags live in AsyncStorage, scoped by user_id so
    // a fresh account on a device with prior test data doesn't see
    // legacy flags. The unscoped keys from old builds are inert (ignored
    // by ymdFromDailyFlagKey) and swept by clearLegacyDailyFlags() on
    // sign-in.
    const userPrefix = dailyFlagPrefix(user.id, "macros");
    const macroKeys = (allKeys as readonly string[]).filter((k) =>
      k.startsWith(userPrefix),
    );
    if (macroKeys.length > 0) {
      const pairs = await AsyncStorage.multiGet(macroKeys).catch(() => [] as [string, string | null][]);
      const dates = new Set<string>();
      for (const [k, v] of pairs) {
        if (v !== "1") continue;
        const ymd = ymdFromDailyFlagKey(k);
        if (!ymd) continue;
        if (ymd >= monthStartYmd && ymd <= monthEndYmd) dates.add(ymd);
      }
      setMacroDates(dates);
    } else {
      setMacroDates(new Set());
    }

    setLoading(false);
  }, [currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const sessionDates = useMemo(
    () => new Set(sessions.map((s) => format(new Date(s.scheduled_at), "yyyy-MM-dd"))),
    [sessions]
  );
  const workoutDates = useMemo(
    () => new Set(workouts.map((w) => format(new Date(w.started_at), "yyyy-MM-dd"))),
    [workouts]
  );
  const habitDates = useMemo(
    () => new Set(habitLogs.filter((l) => l.completed).map((l) => l.date)),
    [habitLogs]
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const isFutureDate = startOfDay(selectedDate).getTime() > today.getTime();

  const dayEvents = useMemo(() => {
    const daySessions = sessions.filter(
      (s) => format(new Date(s.scheduled_at), "yyyy-MM-dd") === selectedDateStr
    );
    const dayWorkouts = workouts.filter(
      (w) => format(new Date(w.started_at), "yyyy-MM-dd") === selectedDateStr
    );
    const macrosHit = macroDates.has(selectedDateStr);
    return { sessions: daySessions, workouts: dayWorkouts, macrosHit };
  }, [sessions, workouts, macroDates, selectedDateStr]);

  // Habits visible on selected day: only show habits that existed on or before
  // that date. Don't let users log completion for a habit that wasn't assigned
  // yet - would be nonsense data.
  const dayHabits = useMemo(() => {
    const endOfDayMs = startOfDay(selectedDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    return habits.filter((h) => new Date(h.created_at).getTime() <= endOfDayMs);
  }, [habits, selectedDate]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text allowFontScaling={false} style={[styles.monthTitle, { color: colors.text }]}>
          {format(currentMonth, "MMMM yyyy")}
        </Text>
        <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.weekHeader}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} allowFontScaling={false} style={[styles.weekDay, { color: colors.textMuted }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = isSameMonth(day, currentMonth);
          const hasSession = sessionDates.has(dateStr);
          const hasWorkout = workoutDates.has(dateStr);
          const hasHabit = habitDates.has(dateStr);
          const hasMacros = macroDates.has(dateStr);

          return (
            <Pressable
              key={i}
              onPress={() => setSelectedDate(day)}
              style={styles.dayCell}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: colors.text },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.dayText,
                    { color: inMonth ? colors.text : colors.textMuted },
                    isToday && !isSelected && { fontWeight: "700" },
                    isSelected && { color: colors.bg, fontWeight: "700" },
                  ]}
                >
                  {format(day, "d")}
                </Text>
              </View>
              {(hasSession || hasWorkout || hasHabit || hasMacros) && (
                <View style={styles.dotRow}>
                  {hasSession && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.bg : colors.text }]} />
                  )}
                  {hasWorkout && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.bg : colors.textMuted }]} />
                  )}
                  {hasHabit && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.bg : colors.success }]} />
                  )}
                  {hasMacros && (
                    <View style={[styles.dot, { backgroundColor: isSelected ? colors.bg : colors.text, opacity: isSelected ? 1 : 0.5 }]} />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Selected day events */}
      <ScrollView
        style={styles.eventList}
        contentContainerStyle={styles.eventListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <Animated.View key={selectedDateStr} entering={FadeIn.duration(200)}>
        <Text allowFontScaling={false} style={[styles.dateLabel, { color: colors.textSecondary }]}>
          {format(selectedDate, "EEEE, MMM d")}
        </Text>

        {dayEvents.sessions.map((s) => (
          <View key={s.id} style={[styles.eventCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="person-outline" size={18} color={colors.text} />
            <View style={styles.eventInfo}>
              <Text allowFontScaling={false} style={[styles.eventTitle, { color: colors.text }]}>
                Session - {s.duration_minutes} min
              </Text>
              {s.location && (
                <Text allowFontScaling={false} style={[styles.eventMeta, { color: colors.textMuted }]}>
                  {s.location}
                </Text>
              )}
              <Text allowFontScaling={false} style={[styles.eventMeta, { color: colors.textMuted }]}>
                {format(new Date(s.scheduled_at), "h:mm a")}
              </Text>
            </View>
          </View>
        ))}

        {dayEvents.workouts.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => {
              hapticPress();
              router.push({
                pathname: "/(workout)/session-detail",
                params: { sessionId: w.id },
              });
            }}
            style={[styles.eventCard, { backgroundColor: colors.bgSecondary }]}
          >
            <Ionicons name="barbell-outline" size={18} color={colors.text} />
            <View style={styles.eventInfo}>
              <Text allowFontScaling={false} style={[styles.eventTitle, { color: colors.text }]}>
                {w.title || "Workout"}
              </Text>
              <Text allowFontScaling={false} style={[styles.eventMeta, { color: colors.textMuted }]}>
                {format(new Date(w.started_at), "h:mm a")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        {/* Habits - read-only audit view. Toggling lives on the Home
            day-strip; this screen is for at-a-glance review. */}
        {dayHabits.length > 0 && (
          <View style={styles.habitGroup}>
            <Text allowFontScaling={false} style={[styles.groupLabel, { color: colors.textMuted }]}>
              {isFutureDate ? "HABITS (UPCOMING)" : "HABITS"}
            </Text>
            {dayHabits.map((h) => {
              const log = habitLogs.find(
                (l) => l.assignment_id === h.id && l.date === selectedDateStr
              );
              const completed = !!log?.completed;
              return (
                <View
                  key={h.id}
                  style={[
                    styles.habitRow,
                    {
                      backgroundColor: colors.bgSecondary,
                      opacity: isFutureDate ? 0.6 : 1,
                    },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`${h.name}, ${completed ? "completed" : "not completed"}`}
                >
                  <View
                    style={[
                      styles.checkDot,
                      {
                        backgroundColor: completed ? colors.success : "transparent",
                        borderColor: completed ? colors.success : colors.textMuted,
                      },
                    ]}
                  >
                    {completed && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text allowFontScaling={false} style={[styles.habitName, { color: colors.text }]}>
                    {h.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {dayEvents.macrosHit && (
          <View style={[styles.eventCard, { backgroundColor: colors.bgSecondary }]}>
            <Ionicons name="restaurant-outline" size={18} color={colors.text} />
            <View style={styles.eventInfo}>
              <Text allowFontScaling={false} style={[styles.eventTitle, { color: colors.text }]}>
                Nutrition goal hit
              </Text>
            </View>
          </View>
        )}

        {dayEvents.sessions.length === 0 &&
          dayEvents.workouts.length === 0 &&
          dayHabits.length === 0 &&
          !dayEvents.macrosHit &&
          !loading && (
            <Text allowFontScaling={false} style={[styles.noEvents, { color: colors.textMuted }]}>
              Nothing scheduled
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.base,
  },
  monthTitle: { fontSize: 20, fontWeight: "600" },
  weekHeader: { flexDirection: "row", marginBottom: spacing.xs },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 15 },
  dotRow: { flexDirection: "row", gap: 3, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  eventList: { flex: 1, marginTop: spacing.base },
  eventListContent: { paddingBottom: 32 },
  dateLabel: { fontSize: 14, fontWeight: "500", marginBottom: spacing.md },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderRadius: radius.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: "500" },
  eventMeta: { fontSize: 13, marginTop: 2 },
  noEvents: { fontSize: 14, textAlign: "center", marginTop: spacing.xl },
  habitGroup: { marginTop: spacing.md, gap: spacing.sm },
  groupLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.6, marginBottom: spacing.xs },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: { flex: 1, fontSize: 15, fontWeight: "500" },
});
