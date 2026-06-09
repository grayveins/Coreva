import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { MuscleChips } from "@/src/components/workout/MuscleChips";

type Exercise = {
  name: string;
  exercise_name?: string;
  sets: number;
  reps: string;
  rir?: number;
  rest_seconds?: number;
  notes?: string;
  muscleGroup?: string;
  primary_muscles?: string[];
};

function musclesOf(ex: Exercise): string[] {
  if (ex.primary_muscles && ex.primary_muscles.length > 0) return ex.primary_muscles;
  if (ex.muscleGroup) return ex.muscleGroup.split(/[\/,]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export default function ProgramDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    name?: string;
    exercises?: string;
    phaseName?: string;
    dayNumber?: string;
    sessionDate?: string;
  }>();

  const workoutName = params.name || "Workout";
  const phaseName = params.phaseName || "";
  const dayNumber = params.dayNumber || "";

  const exercises: Exercise[] = useMemo(() => {
    if (!params.exercises) return [];
    try { return JSON.parse(params.exercises); }
    catch { return []; }
  }, [params.exercises]);

  const totalSets = exercises.reduce((s, e) => s + (e.sets || 0), 0);
  const estMinutes = Math.round(totalSets * 2.5);

  // Aggregate the unique muscles trained across the session — our stand-in
  // for Trainerize's equipment chips (we don't carry equipment data).
  const targetMuscles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ex of exercises) {
      for (const m of musclesOf(ex)) {
        const key = m.toLowerCase();
        if (!seen.has(key)) { seen.add(key); out.push(m); }
      }
    }
    return out;
  }, [exercises]);

  const startWorkout = () => {
    hapticPress();
    router.push({
      pathname: "/(workout)/active",
      params: {
        name: workoutName,
        exercises: params.exercises || "[]",
        sourceType: "program",
        ...(params.sessionDate ? { sessionDate: params.sessionDate } : {}),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Minimal top bar — just a back affordance, hero lives in scroll */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(260)}>
          {/* Hero */}
          {phaseName ? (
            <Text allowFontScaling={false} style={styles.phaseLabel}>
              {phaseName}{dayNumber ? ` · DAY ${dayNumber}` : ""}
            </Text>
          ) : null}
          <Text allowFontScaling={false} style={styles.title}>
            {workoutName}
          </Text>

          {/* Stats strip — icon-led, est. time first (Trainerize-style) */}
          <View style={styles.statsRow}>
            <Stat icon="time-outline" value={`${estMinutes}`} label="Est. min" colors={colors} />
            <View style={styles.statDivider} />
            <Stat icon="barbell-outline" value={String(exercises.length)} label="Exercises" colors={colors} />
            <View style={styles.statDivider} />
            <Stat icon="layers-outline" value={String(totalSets)} label="Sets" colors={colors} />
          </View>

          {/* Targets */}
          {targetMuscles.length > 0 && (
            <View style={styles.targets}>
              <Text allowFontScaling={false} style={styles.sectionLabel}>TARGETS</Text>
              <MuscleChips muscles={targetMuscles} max={8} />
            </View>
          )}

          {/* Exercise list */}
          <Text allowFontScaling={false} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            EXERCISES
          </Text>
          {exercises.map((ex, i) => {
            const setN = ex.sets || 0;
            const metaBits: string[] = [];
            metaBits.push(`${setN} set${setN === 1 ? "" : "s"}${ex.reps ? ` · ${ex.reps} reps` : ""}`);
            if (ex.rest_seconds) metaBits.push(`${ex.rest_seconds}s rest`);
            const isLast = i === exercises.length - 1;
            return (
              <View
                key={i}
                style={[
                  styles.exerciseRow,
                  !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={styles.exerciseNumber}>
                  <Text allowFontScaling={false} style={styles.numberText}>{i + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text allowFontScaling={false} style={styles.exerciseName} numberOfLines={1}>
                    {ex.name || ex.exercise_name}
                  </Text>
                  <Text allowFontScaling={false} style={styles.exerciseMeta}>
                    {metaBits.join(" · ")}
                  </Text>
                  {ex.notes ? (
                    <Text allowFontScaling={false} style={styles.exerciseNotes} numberOfLines={2}>
                      {ex.notes}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {exercises.length === 0 && (
            <Text allowFontScaling={false} style={styles.emptyText}>
              No exercises in this workout
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* Start button */}
      {exercises.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable onPress={startWorkout} style={styles.startButton}>
            <Ionicons name="play" size={18} color={colors.bg} />
            <Text allowFontScaling={false} style={styles.startText}>Start Workout</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Stat({ icon, value, label, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text allowFontScaling={false} style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 }}>
        {value}
      </Text>
      <Text allowFontScaling={false} style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.textMuted, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 130 },

    // Hero
    phaseLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    title: {
      fontSize: 30,
      fontFamily: "Inter_700Bold",
      color: colors.text,
      letterSpacing: -0.6,
    },

    // Stats
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.xl,
      paddingVertical: spacing.base,
      borderRadius: radius.lg,
      backgroundColor: colors.bgSecondary,
    },
    statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },

    // Sections
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: spacing.md,
    },
    targets: { marginTop: spacing.xl },

    // Exercise rows
    exerciseRow: { flexDirection: "row", paddingVertical: spacing.base, gap: spacing.md },
    exerciseNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgSecondary,
      marginTop: 1,
    },
    numberText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text },
    exerciseInfo: { flex: 1, gap: 3 },
    exerciseName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.text },
    exerciseMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textMuted },
    exerciseNotes: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
    emptyText: { textAlign: "center", marginTop: 40, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textMuted },

    // Start
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 34,
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    startButton: {
      height: 56,
      borderRadius: radius.pill,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.text,
    },
    startText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.bg, letterSpacing: 0.3 },
  });
