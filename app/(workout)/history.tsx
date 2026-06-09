/**
 * Workout History - minimalist list of past sessions.
 *
 * Cal AI / Linear-style: oversized title, no boxed cards, hairline rows,
 * monochrome only. Each row is a single tap target that routes to the
 * read-only session detail screen.
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { format, parseISO, differenceInMinutes, isThisMonth } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { ErrorState } from "@/src/components/ErrorState";
import { HistorySkeleton } from "@/src/animations/components";
import { useFeatureAccess } from "@/src/hooks/useSubscription";
import UpgradePrompt from "@/src/components/UpgradePrompt";

type WorkoutSet = {
  id: string;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  is_pr: boolean;
};

type WorkoutExercise = {
  id: string;
  exercise_name: string;
  order_index: number;
  sets: WorkoutSet[];
};

type WorkoutSession = {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  exercises: WorkoutExercise[];
};

type GroupedWorkouts = { label: string; workouts: WorkoutSession[] };

export default function WorkoutHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hasAccess: hasFullHistory, limit: historyDaysLimit } =
    useFeatureAccess("fullHistory");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const fetchWorkouts = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/sign-in");
          return;
        }

        let query = supabase
          .from("workout_sessions")
          .select("id, title, started_at, ended_at")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50);

        if (!hasFullHistory) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - historyDaysLimit);
          query = query.gte("started_at", cutoff.toISOString());
        }

        const { data: sessions, error: sessionsError } = await query;
        if (sessionsError) throw sessionsError;

        const sessionIds = sessions?.map((s) => s.id) || [];
        if (sessionIds.length === 0) {
          setWorkouts([]);
          return;
        }

        const { data: exercises, error: exercisesError } = await supabase
          .from("workout_exercises")
          .select("id, session_id, exercise_name, order_index")
          .in("session_id", sessionIds)
          .order("order_index", { ascending: true });
        if (exercisesError) throw exercisesError;

        const exerciseIds = exercises?.map((e) => e.id) || [];
        let sets: any[] = [];
        if (exerciseIds.length > 0) {
          const { data: setsData, error: setsError } = await supabase
            .from("workout_sets")
            .select("id, workout_exercise_id, set_number, weight_lbs, reps, is_pr")
            .in("workout_exercise_id", exerciseIds)
            .order("set_number", { ascending: true });
          if (setsError) throw setsError;
          sets = setsData || [];
        }

        const setsByExercise = new Map<string, WorkoutSet[]>();
        sets.forEach((set) => {
          const existing = setsByExercise.get(set.workout_exercise_id) || [];
          existing.push(set);
          setsByExercise.set(set.workout_exercise_id, existing);
        });

        const exercisesBySession = new Map<string, WorkoutExercise[]>();
        exercises?.forEach((ex) => {
          const existing = exercisesBySession.get(ex.session_id) || [];
          existing.push({ ...ex, sets: setsByExercise.get(ex.id) || [] });
          exercisesBySession.set(ex.session_id, existing);
        });

        const fullWorkouts: WorkoutSession[] = (sessions || []).map((s) => ({
          ...s,
          exercises: exercisesBySession.get(s.id) || [],
        }));

        setWorkouts(fullWorkouts);
      } catch (err) {
        console.error("Error fetching workout history:", err);
        setError("Failed to load workout history");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasFullHistory, historyDaysLimit],
  );

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Group by calendar month (Hevy-style). `workouts` arrives sorted
  // newest-first, and a Map preserves that insertion order, so months come
  // out most-recent first. The current month reads "This month".
  const groupedWorkouts = useMemo((): GroupedWorkouts[] => {
    const byMonth = new Map<string, WorkoutSession[]>();
    for (const w of workouts) {
      const d = parseISO(w.started_at);
      const label = isThisMonth(d) ? "This month" : format(d, "MMMM yyyy");
      const bucket = byMonth.get(label);
      if (bucket) bucket.push(w);
      else byMonth.set(label, [w]);
    }
    return Array.from(byMonth, ([label, ws]) => ({ label, workouts: ws }));
  }, [workouts]);

  const getStats = (w: WorkoutSession) => {
    const totalSets = w.exercises.reduce((a, ex) => a + ex.sets.length, 0);
    const duration = w.ended_at
      ? differenceInMinutes(parseISO(w.ended_at), parseISO(w.started_at))
      : 0;
    const prCount = w.exercises.reduce(
      (a, ex) => a + ex.sets.filter((s) => s.is_pr).length,
      0,
    );
    return { totalSets, duration, prCount };
  };

  const open = (id: string) => {
    hapticPress();
    router.push({
      pathname: "/(workout)/session-detail",
      params: { sessionId: id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Minimal header - no bottom border, just back + title */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <HistorySkeleton />
      ) : error ? (
        <ErrorState
          message={error}
          detail="Please check your connection and try again."
          onRetry={() => fetchWorkouts()}
        />
      ) : workouts.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchWorkouts(true)}
              tintColor={colors.text}
            />
          }
        >
          <Animated.View entering={FadeIn.duration(220)}>
            {/* Hero title block (Cal AI / Linear) */}
            <Text allowFontScaling={false} style={styles.title}>
              History
            </Text>
            <Text allowFontScaling={false} style={styles.subtitle}>
              {workouts.length} workout{workouts.length === 1 ? "" : "s"}
            </Text>

            {/* Free-tier banner - hairline, no fill */}
            {!hasFullHistory && (
              <Pressable
                onPress={() => setShowUpgrade(true)}
                style={styles.banner}
              >
                <Text allowFontScaling={false} style={styles.bannerText}>
                  Showing last {historyDaysLimit} days
                </Text>
                <Text allowFontScaling={false} style={styles.bannerCta}>
                  Unlock all →
                </Text>
              </Pressable>
            )}

            {/* Grouped list */}
            {groupedWorkouts.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text allowFontScaling={false} style={styles.groupLabel}>
                  {group.label}
                </Text>
                <View style={styles.groupList}>
                  {group.workouts.map((w, i) => {
                    const s = getStats(w);
                    const date = parseISO(w.started_at);
                    const isLast = i === group.workouts.length - 1;
                    return (
                      <Pressable
                        key={w.id}
                        onPress={() => open(w.id)}
                        style={[
                          styles.row,
                          !isLast && {
                            borderBottomColor: colors.border,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        <View style={styles.rowMain}>
                          <Text allowFontScaling={false} style={styles.rowTitle} numberOfLines={1}>
                            {w.title || "Workout"}
                          </Text>
                          <Text allowFontScaling={false} style={styles.rowMeta}>
                            {[
                              format(date, "EEE, MMM d"),
                              s.duration > 0 ? `${s.duration} min` : null,
                              `${s.totalSets} set${s.totalSets === 1 ? "" : "s"}`,
                              s.prCount > 0 ? `${s.prCount} PR${s.prCount === 1 ? "" : "s"}` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </Text>
                        </View>
                        {s.prCount > 0 && (
                          <View style={[styles.prPill, { borderColor: colors.border }]}>
                            <Ionicons name="trophy-outline" size={11} color={colors.text} />
                            <Text allowFontScaling={false} style={styles.prPillText}>
                              {s.prCount}
                            </Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={{ height: 60 }} />
          </Animated.View>
        </ScrollView>
      )}

      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="history"
      />
    </SafeAreaView>
  );
}

function EmptyState({ colors }: { colors: any }) {
  return (
    <View style={emptyStyles.wrap}>
      <Ionicons name="barbell-outline" size={44} color={colors.textMuted} />
      <Text allowFontScaling={false} style={[emptyStyles.title, { color: colors.text }]}>
        No workouts yet
      </Text>
      <Text allowFontScaling={false} style={[emptyStyles.body, { color: colors.textMuted }]}>
        Your finished sessions will land here.
      </Text>
      <Pressable
        onPress={() => router.dismissTo("/(app)/(tabs)/workout")}
        style={[emptyStyles.cta, { backgroundColor: colors.text }]}
      >
        <Text allowFontScaling={false} style={[emptyStyles.ctaText, { color: colors.bg }]}>
          Start a workout
        </Text>
      </Pressable>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  title: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 12 },
  cta: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  ctaText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

    // Hero
    title: {
      fontSize: 34,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.textMuted,
      marginTop: 6,
      marginBottom: 32,
    },

    // Banner
    banner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 24,
    },
    bannerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textMuted },
    bannerCta: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text },

    // Groups
    group: { marginBottom: 28 },
    groupLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 12,
    },
    groupList: {},

    // Row
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      gap: 10,
    },
    rowMain: { flex: 1, gap: 4 },
    rowTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    rowMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textMuted },
    rowStats: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 2 },

    prPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    prPillText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
      letterSpacing: 0.3,
    },
  });
