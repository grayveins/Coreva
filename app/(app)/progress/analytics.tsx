/**
 * Analytics Screen
 * Comprehensive, beautiful progress analytics for workout geeks.
 *
 * Sections:
 * 1. Key Lifts - e1RM cards for the big 4 with trend %
 * 2. Weekly Volume - bar chart + this week vs avg + trend
 * 3. Sets Per Muscle Group - weekly set count per muscle (the metric hypertrophy lifters obsess over)
 * 4. Muscle Map - body heatmap showing training distribution
 * 5. Muscle Balance - horizontal bar breakdown
 * 6. Workout Stats - avg duration, total sessions, total volume, consistency %
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { differenceInWeeks } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useStrengthHistory, type TimeRange } from "@/src/hooks/useStrengthHistory";
import { useVolumeHistory } from "@/src/hooks/useVolumeHistory";
import { useWeeklySummary } from "@/src/hooks/useWeeklySummary";
import { VolumeChart, MuscleMap, type MuscleGroupData } from "@/src/components/progress";
import { layout, spacing } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";

const { width: SW } = Dimensions.get("window");
const KEY_LIFTS = ["Bench Press", "Squat", "Deadlift", "Overhead Press"];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#000000", Back: "#1A1A1A", Shoulders: "#333333",
  Arms: "#4B5563", Legs: "#6B7280", Core: "#9CA3AF",
};

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "All", value: "ALL" },
];

// RP-style volume landmarks (sets/week)
const VOLUME_LANDMARKS = {
  MEV: 6,  // Minimum Effective Volume
  MAV: 15, // Maximum Adaptive Volume
  MRV: 22, // Maximum Recoverable Volume
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const AnimatedBar: React.FC<{ percent: number; color: string; delay?: number }> = ({
  percent, color, delay = 0,
}) => {
  const w = useSharedValue(0);
  React.useEffect(() => {
    w.value = withDelay(delay, withTiming(percent, { duration: 700, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, delay]);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%`, backgroundColor: color }));
  return <Animated.View style={[styles.barFill, style]} />;
};

// Lift card with e1RM
const LiftCard: React.FC<{
  name: string; userId: string | null; timeRange: TimeRange;
  colors: ReturnType<typeof useTheme>["colors"];
}> = ({ name, userId, timeRange, colors }) => {
  const { currentPR, progressPercent, loading, data } = useStrengthHistory(userId, name, timeRange);
  const isPos = progressPercent >= 0;

  // Calculate e1RM from best set
  const e1RM = useMemo(() => {
    if (!data.length) return null;
    const best = data.reduce((a, b) => a.estimated1RM > b.estimated1RM ? a : b);
    return Math.round(best.estimated1RM);
  }, [data]);

  if (loading) {
    return <View style={[styles.liftCard, { backgroundColor: colors.card }]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>;
  }

  return (
    <Pressable
      onPress={() => { hapticPress(); router.push(`/progress/${encodeURIComponent(name)}`); }}
      style={[styles.liftCard, { backgroundColor: colors.card }]}
    >
      <Text allowFontScaling={false} style={[styles.liftName, { color: colors.textMuted }]} numberOfLines={1}>
        {name}
      </Text>
      {currentPR ? (
        <>
          <View style={styles.liftMain}>
            <Text allowFontScaling={false} style={[styles.liftWeight, { color: colors.text }]}>
              {currentPR.weight}
            </Text>
            <Text allowFontScaling={false} style={[styles.liftUnit, { color: colors.textMuted }]}>lbs</Text>
          </View>
          {e1RM && (
            <Text allowFontScaling={false} style={[styles.liftE1rm, { color: colors.textMuted }]}>
              e1RM: {e1RM}
            </Text>
          )}
          {progressPercent !== 0 && (
            <View style={styles.liftTrend}>
              <Ionicons name={isPos ? "trending-up" : "trending-down"} size={13} color={isPos ? colors.success : colors.error} />
              <Text allowFontScaling={false} style={[styles.liftTrendText, { color: isPos ? colors.success : colors.error }]}>
                {isPos ? "+" : ""}{progressPercent.toFixed(0)}%
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text allowFontScaling={false} style={[styles.liftNoData, { color: colors.textMuted }]}>-</Text>
      )}
    </Pressable>
  );
};

// Stat pill
const Stat: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
  <View style={[styles.statBox, { backgroundColor: colors.card }]}>
    <Text allowFontScaling={false} style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text allowFontScaling={false} style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("3M");
  const [refreshing, setRefreshing] = useState(false);

  // Overall stats
  const [totalSessions, setTotalSessions] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [totalLifetimeVolume, setTotalLifetimeVolume] = useState(0);
  const [firstWorkoutDate, setFirstWorkoutDate] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUserId(user.id); });
  }, []);

  // Fetch overall stats
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("id, started_at, ended_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: true });

      if (!sessions || sessions.length === 0) return;

      setTotalSessions(sessions.length);
      setFirstWorkoutDate(sessions[0].started_at);

      const durations = sessions
        .filter((s) => s.ended_at)
        .map((s) => (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000);
      const validDurations = durations.filter((d) => d > 0 && d < 300);
      if (validDurations.length) {
        setAvgDuration(Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length));
      }

      // Total lifetime volume
      const { data: volData } = await supabase
        .from("workout_sets")
        .select("weight_lbs, reps, workout_exercise:workout_exercises!inner(session_id, workout_session:workout_sessions!inner(user_id))")
        .eq("workout_exercise.workout_session.user_id", userId);

      if (volData) {
        const total = volData.reduce((sum, s: any) => sum + ((s.weight_lbs || 0) * (s.reps || 0)), 0);
        setTotalLifetimeVolume(total);
      }
    })();
  }, [userId]);

  const {
    data: volumeData, loading: volumeLoading,
    thisWeekVolume, averageVolume, trend, trendPercent,
    refresh: refreshVolume,
  } = useVolumeHistory(userId, timeRange);

  const { data: weeklySummary, loading: summaryLoading, refresh: refreshSummary } = useWeeklySummary(userId);

  const volumeChartData = useMemo(
    () => volumeData.map((d) => ({ week: d.week, volume: d.volume })),
    [volumeData]
  );

  // Muscle balance percentages
  const musclePercentages = useMemo(() => {
    if (!weeklySummary?.muscleWeeklyVolume) return [];
    const total = Object.values(weeklySummary.muscleWeeklyVolume).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(weeklySummary.muscleWeeklyVolume)
      .map(([muscle, vol]) => ({
        muscle, percent: (vol / total) * 100,
        color: MUSCLE_COLORS[muscle] || colors.primary,
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [weeklySummary, colors.primary]);

  // Sets per muscle group this week (for volume landmark section)
  const setsPerMuscle = useMemo(() => {
    if (!weeklySummary?.muscleWeeklyVolume) return [];
    // Estimate sets from volume (rough: avg 3000 lbs per set across all exercises)
    // Better: count actual sets from weekly summary if available
    return Object.entries(weeklySummary.muscleWeeklyVolume)
      .map(([muscle, vol]) => ({
        muscle,
        sets: Math.round(vol / 2500), // rough estimation
        color: MUSCLE_COLORS[muscle] || colors.primary,
      }))
      .filter((m) => m.sets > 0)
      .sort((a, b) => b.sets - a.sets);
  }, [weeklySummary, colors.primary]);

  // Muscle map data
  const muscleMapData = useMemo<MuscleGroupData[]>(() => {
    if (!weeklySummary?.muscleWeeklyVolume) return [];
    const maxVol = Math.max(...Object.values(weeklySummary.muscleWeeklyVolume), 1);
    return Object.entries(weeklySummary.muscleWeeklyVolume).map(([muscle, vol]) => ({
      muscle,
      intensity: vol / maxVol, // 0-1 normalized
    }));
  }, [weeklySummary]);

  // Consistency percentage
  const consistency = useMemo(() => {
    if (!firstWorkoutDate || totalSessions < 2) return null;
    const totalWeeks = Math.max(1, differenceInWeeks(new Date(), new Date(firstWorkoutDate)));
    const workoutsPerWeek = totalSessions / totalWeeks;
    // Assume target is 4x/week
    return Math.min(100, Math.round((workoutsPerWeek / 4) * 100));
  }, [firstWorkoutDate, totalSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshVolume(), refreshSummary()]);
    setRefreshing(false);
  }, [refreshVolume, refreshSummary]);

  const fmtVol = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return String(v);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Time Range Picker */}
        <View style={styles.rangeRow}>
          {TIME_RANGES.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => { hapticPress(); setTimeRange(r.value); }}
              style={[styles.rangePill, { backgroundColor: timeRange === r.value ? colors.primary : colors.card }]}
            >
              <Text allowFontScaling={false} style={[styles.rangeText, { color: timeRange === r.value ? colors.textOnPrimary : colors.textSecondary }]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ================================================================ */}
        {/* 1. OVERALL STATS                                                 */}
        {/* ================================================================ */}
        {totalSessions > 0 && (
          <Animated.View entering={FadeInDown.duration(250)} style={styles.statsRow}>
            <Stat label="Workouts" value={String(totalSessions)} colors={colors} />
            <Stat label="Avg Duration" value={avgDuration > 0 ? `${avgDuration}m` : "-"} colors={colors} />
            <Stat label="Total Volume" value={totalLifetimeVolume > 0 ? fmtVol(totalLifetimeVolume) : "-"} colors={colors} />
            {consistency !== null && (
              <Stat label="Consistency" value={`${consistency}%`} colors={colors} />
            )}
          </Animated.View>
        )}

        {/* ================================================================ */}
        {/* 2. STRENGTH PROGRESS - e1RM cards for the big 4                  */}
        {/* ================================================================ */}
        <Text allowFontScaling={false} style={[styles.section, { color: colors.text }]}>
          Strength Progress
        </Text>
        <View style={styles.liftsGrid}>
          {KEY_LIFTS.map((lift, i) => (
            <Animated.View key={lift} entering={FadeInDown.delay(i * 40).duration(250)} style={styles.liftWrap}>
              <LiftCard name={lift} userId={userId} timeRange={timeRange} colors={colors} />
            </Animated.View>
          ))}
        </View>

        {/* ================================================================ */}
        {/* 3. WEEKLY VOLUME - chart + stats                                 */}
        {/* ================================================================ */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardRow}>
            <Text allowFontScaling={false} style={[styles.section, { color: colors.text, marginBottom: 0 }]}>
              Weekly Volume
            </Text>
            {!volumeLoading && thisWeekVolume > 0 && (
              <View style={styles.volRight}>
                <Text allowFontScaling={false} style={[styles.volVal, { color: colors.text }]}>
                  {fmtVol(thisWeekVolume)} lbs
                </Text>
                {trendPercent !== 0 && (
                  <View style={styles.trendRow}>
                    <Ionicons name={trend === "up" ? "trending-up" : "trending-down"} size={13} color={trend === "up" ? colors.success : colors.error} />
                    <Text allowFontScaling={false} style={[styles.trendText, { color: trend === "up" ? colors.success : colors.error }]}>
                      {trendPercent > 0 ? "+" : ""}{trendPercent.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {volumeLoading ? (
            <View style={styles.chartPh}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : volumeChartData.length > 0 ? (
            <VolumeChart data={volumeChartData} />
          ) : (
            <View style={styles.chartPh}>
              <Text allowFontScaling={false} style={[styles.emptyText, { color: colors.textMuted }]}>
                Complete workouts to see trends
              </Text>
            </View>
          )}

          {!volumeLoading && averageVolume > 0 && (
            <View style={[styles.volFooter, { borderTopColor: colors.border }]}>
              <Text allowFontScaling={false} style={[styles.footerLabel, { color: colors.textMuted }]}>Avg/week</Text>
              <Text allowFontScaling={false} style={[styles.footerVal, { color: colors.textSecondary }]}>{fmtVol(averageVolume)} lbs</Text>
            </View>
          )}
        </Animated.View>

        {/* ================================================================ */}
        {/* 4. SETS PER MUSCLE - volume landmarks (MEV/MAV/MRV)              */}
        {/* ================================================================ */}
        {!summaryLoading && setsPerMuscle.length > 0 && (
          <Animated.View entering={FadeInDown.delay(280).duration(300)} style={[styles.card, { backgroundColor: colors.card }]}>
            <Text allowFontScaling={false} style={[styles.section, { color: colors.text }]}>
              Sets Per Muscle / Week
            </Text>
            <Text allowFontScaling={false} style={[styles.cardSub, { color: colors.textMuted }]}>
              Aim for {VOLUME_LANDMARKS.MEV}-{VOLUME_LANDMARKS.MAV} sets per muscle for growth
            </Text>

            {setsPerMuscle.map((item, i) => {
              const pct = Math.min(100, (item.sets / VOLUME_LANDMARKS.MRV) * 100);
              const inRange = item.sets >= VOLUME_LANDMARKS.MEV && item.sets <= VOLUME_LANDMARKS.MAV;
              const over = item.sets > VOLUME_LANDMARKS.MAV;
              const barColor = over ? colors.intensity : inRange ? colors.success : item.color;

              return (
                <View key={item.muscle} style={styles.volRow}>
                  <View style={styles.volLabel}>
                    <Text allowFontScaling={false} style={[styles.volMuscleName, { color: colors.text }]} numberOfLines={1}>
                      {item.muscle}
                    </Text>
                  </View>
                  <View style={styles.volBarWrap}>
                    {/* MEV marker */}
                    <View style={[styles.volMarker, { left: `${(VOLUME_LANDMARKS.MEV / VOLUME_LANDMARKS.MRV) * 100}%` }]}>
                      <View style={[styles.volMarkerLine, { backgroundColor: colors.border }]} />
                    </View>
                    {/* MAV marker */}
                    <View style={[styles.volMarker, { left: `${(VOLUME_LANDMARKS.MAV / VOLUME_LANDMARKS.MRV) * 100}%` }]}>
                      <View style={[styles.volMarkerLine, { backgroundColor: colors.border }]} />
                    </View>
                    <View style={[styles.volBarBg, { backgroundColor: colors.bg }]}>
                      <AnimatedBar percent={pct} color={barColor} delay={i * 50} />
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={[styles.volSets, { color: barColor }]}>
                    {item.sets}
                  </Text>
                </View>
              );
            })}

            {/* Legend */}
            <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.border }]} />
                <Text allowFontScaling={false} style={[styles.legendText, { color: colors.textMuted }]}>MEV ({VOLUME_LANDMARKS.MEV})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.border }]} />
                <Text allowFontScaling={false} style={[styles.legendText, { color: colors.textMuted }]}>MAV ({VOLUME_LANDMARKS.MAV})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text allowFontScaling={false} style={[styles.legendText, { color: colors.textMuted }]}>In range</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ================================================================ */}
        {/* 5. MUSCLE MAP - body heatmap                                     */}
        {/* ================================================================ */}
        {!summaryLoading && muscleMapData.length > 0 && (
          <Animated.View entering={FadeInDown.delay(360).duration(300)} style={[styles.card, { backgroundColor: colors.card }]}>
            <Text allowFontScaling={false} style={[styles.section, { color: colors.text }]}>
              Muscle Map
            </Text>
            <Text allowFontScaling={false} style={[styles.cardSub, { color: colors.textMuted }]}>
              Training distribution this week
            </Text>
            <MuscleMap data={muscleMapData} />
          </Animated.View>
        )}

        {/* ================================================================ */}
        {/* 6. MUSCLE BALANCE - horizontal bar breakdown                     */}
        {/* ================================================================ */}
        {!summaryLoading && musclePercentages.length > 0 && (
          <Animated.View entering={FadeInDown.delay(420).duration(300)} style={[styles.card, { backgroundColor: colors.card }]}>
            <Text allowFontScaling={false} style={[styles.section, { color: colors.text }]}>
              Muscle Balance
            </Text>
            <Text allowFontScaling={false} style={[styles.cardSub, { color: colors.textMuted }]}>
              Volume split this week
            </Text>
            <View style={styles.muscleList}>
              {musclePercentages.slice(0, 6).map((item, i) => (
                <View key={item.muscle} style={styles.muscleRow}>
                  <View style={styles.muscleLabel}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text allowFontScaling={false} style={[styles.muscleName, { color: colors.text }]}>{item.muscle}</Text>
                  </View>
                  <View style={styles.barWrap}>
                    <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                      <AnimatedBar percent={item.percent} color={item.color} delay={i * 60} />
                    </View>
                    <Text allowFontScaling={false} style={[styles.pct, { color: colors.textMuted }]}>{item.percent.toFixed(0)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.base },

  // Range picker
  rangeRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  rangePill: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 999 },
  rangeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Overall stats - 2x2 grid instead of cramped single row
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statBox: { width: (SW - layout.screenPaddingHorizontal * 2 - 8) / 2, borderRadius: 12, padding: 12, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, textAlign: "center" },

  // Section
  section: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },

  // Lifts grid
  liftsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  liftWrap: { width: (SW - layout.screenPaddingHorizontal * 2 - 8) / 2 },
  liftCard: { borderRadius: 14, padding: 14, minHeight: 96, justifyContent: "space-between" },
  liftName: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  liftMain: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  liftWeight: { fontSize: 22, fontFamily: "Inter_600SemiBold" },
  liftUnit: { fontSize: 12, fontFamily: "Inter_400Regular" },
  liftE1rm: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  liftTrend: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  liftTrendText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  liftNoData: { fontSize: 22, fontFamily: "Inter_400Regular" },

  // Card
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14, marginTop: -4 },
  chartPh: { height: 140, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // Volume
  volRight: { alignItems: "flex-end" },
  volVal: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  trendText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  volFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 10, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footerVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Sets per muscle
  volRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  volLabel: { width: 90 },
  volMuscleName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  volBarWrap: { flex: 1, height: 8, borderRadius: 4, position: "relative" },
  volBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  volMarker: { position: "absolute", top: -2, width: 1, height: 12, zIndex: 1 },
  volMarkerLine: { width: 1, height: 12 },
  volSets: { width: 24, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },

  // Legend
  legendRow: {
    flexDirection: "row", justifyContent: "center", gap: 16,
    paddingTop: 10, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendLine: { width: 1, height: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Muscle balance
  muscleList: { gap: 10 },
  muscleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  muscleLabel: { flexDirection: "row", alignItems: "center", gap: 6, width: 96 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  muscleName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  barWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  barBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%" as const, borderRadius: 3 },
  pct: { fontSize: 12, fontFamily: "Inter_500Medium", width: 30, textAlign: "right" },
});
