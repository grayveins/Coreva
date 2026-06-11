/**
 * In-app program builder (coach).
 *
 * Replaces hand-written SQL seeds: a coach composes a program - phases,
 * workout days, exercises with editable rep ranges / sets / RIR / notes,
 * reorderable - then assigns it to a client. Persisted via persistProgram and
 * (optionally) scheduled with buildEveryOtherDaySchedule. The assigned program
 * flows into the client's existing program → program-detail → active logger
 * pipeline, so they can start it one-tap without re-entering anything.
 *
 * Covers beta-tester requests: create program in-app (#1), change rep ranges
 * (#2), reorder exercises (#4), per-exercise + per-workout notes (#5). The
 * client start-from-program path (#3) already exists downstream.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress, hapticSuccess } from "@/src/animations/feedback/haptics";
import { useCoachRole } from "@/src/hooks/useCoachRole";
import { EngineDraftSheet } from "@/src/components/coach/EngineDraftSheet";
import { persistProgram } from "@/lib/coach/persistProgram";
import {
  buildEveryOtherDaySchedule,
  nextWeekdayOnOrAfter,
} from "@/lib/coach/scheduling";
import { validateProgramDraft } from "@/lib/coach/programDraft";
import type {
  PhaseGoal,
  ProgramDraft,
  WorkoutDraft,
  WorkoutExerciseSpec,
} from "@/lib/coach/types";

const GOALS: PhaseGoal[] = [
  "hypertrophy",
  "strength",
  "general",
  "endurance",
  "deload",
];

const DURATIONS = [3, 4, 6, 8];

function emptyExercise(order: number): WorkoutExerciseSpec {
  return { order, exercise_name: "", sets: 3, reps: "8-10", rir: 2, rest_seconds: 120, notes: "" };
}

function emptyWorkout(dayNumber: number): WorkoutDraft {
  return {
    day_number: dayNumber,
    name: dayNumber === 1 ? "Full Body" : `Day ${dayNumber}`,
    exercises: [emptyExercise(1)],
    notes: "",
  };
}

export default function ProgramBuilderScreen() {
  const { colors } = useTheme();
  const { coachId } = useCoachRole();
  const params = useLocalSearchParams<{ clientId: string; clientName?: string }>();
  const clientName = params.clientName || "Client";

  const [programName, setProgramName] = useState(`${clientName.split(" ")[0]}'s Program`);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [goal, setGoal] = useState<PhaseGoal>("hypertrophy");
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>([emptyWorkout(1)]);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [sessions, setSessions] = useState("12");
  const [startDate] = useState(() => nextWeekdayOnOrAfter(new Date(), 1)); // next Monday
  const [saving, setSaving] = useState(false);
  const [showEngine, setShowEngine] = useState(false);

  /** Load an engine-generated draft into the editable builder state. */
  const applyEngineDraft = useCallback((d: ProgramDraft) => {
    const phase = d.phases[0];
    if (!phase) return;
    if (d.name) setProgramName(d.name);
    setDurationWeeks(phase.duration_weeks);
    if (phase.goal) setGoal(phase.goal);
    setWorkouts(phase.workouts);
  }, []);

  // ── Workout-level mutations ─────────────────────────────────────────────────
  const updateWorkout = useCallback((wi: number, patch: Partial<WorkoutDraft>) => {
    setWorkouts((prev) => prev.map((w, i) => (i === wi ? { ...w, ...patch } : w)));
  }, []);

  const addWorkout = useCallback(() => {
    hapticPress();
    setWorkouts((prev) => [...prev, emptyWorkout(prev.length + 1)]);
  }, []);

  const removeWorkout = useCallback((wi: number) => {
    setWorkouts((prev) =>
      prev
        .filter((_, i) => i !== wi)
        // Renumber day_numbers so they stay 1..N and unique.
        .map((w, i) => ({ ...w, day_number: i + 1 })),
    );
  }, []);

  // ── Exercise-level mutations ────────────────────────────────────────────────
  const updateExercise = useCallback(
    (wi: number, ei: number, patch: Partial<WorkoutExerciseSpec>) => {
      setWorkouts((prev) =>
        prev.map((w, i) =>
          i === wi
            ? { ...w, exercises: w.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
            : w,
        ),
      );
    },
    [],
  );

  const addExercise = useCallback((wi: number) => {
    hapticPress();
    setWorkouts((prev) =>
      prev.map((w, i) =>
        i === wi ? { ...w, exercises: [...w.exercises, emptyExercise(w.exercises.length + 1)] } : w,
      ),
    );
  }, []);

  const removeExercise = useCallback((wi: number, ei: number) => {
    setWorkouts((prev) =>
      prev.map((w, i) =>
        i === wi
          ? { ...w, exercises: w.exercises.filter((_, j) => j !== ei).map((e, j) => ({ ...e, order: j + 1 })) }
          : w,
      ),
    );
  }, []);

  /** Move an exercise up/down within a workout (reorder - beta #4). */
  const moveExercise = useCallback((wi: number, ei: number, dir: -1 | 1) => {
    hapticPress();
    setWorkouts((prev) =>
      prev.map((w, i) => {
        if (i !== wi) return w;
        const target = ei + dir;
        if (target < 0 || target >= w.exercises.length) return w;
        const next = [...w.exercises];
        [next[ei], next[target]] = [next[target], next[ei]];
        return { ...w, exercises: next.map((e, j) => ({ ...e, order: j + 1 })) };
      }),
    );
  }, []);

  const draft: ProgramDraft = useMemo(
    () => ({
      name: programName,
      status: scheduleNow ? "active" : "draft",
      start_date: startDate,
      phases: [
        { name: "Phase 1", phase_number: 1, duration_weeks: durationWeeks, goal, workouts },
      ],
    }),
    [programName, scheduleNow, startDate, durationWeeks, goal, workouts],
  );

  const errors = useMemo(() => validateProgramDraft(draft), [draft]);

  const onAssign = async () => {
    if (!coachId || !params.clientId) {
      Alert.alert("Missing context", "Could not resolve coach or client.");
      return;
    }
    if (errors.length > 0) {
      Alert.alert("Fix these first", errors.slice(0, 6).join("\n"));
      return;
    }
    setSaving(true);
    try {
      const schedule = scheduleNow
        ? buildEveryOtherDaySchedule(
            startDate,
            Math.max(1, parseInt(sessions, 10) || 12),
            workouts.map((w) => w.day_number),
          )
        : undefined;

      const result = await persistProgram({
        coachId,
        clientId: params.clientId,
        draft,
        schedule,
      });

      hapticSuccess();
      Alert.alert(
        "Program assigned",
        scheduleNow
          ? `${clientName} can start it now. ${result.scheduledCount} sessions scheduled.`
          : `Saved as a draft for ${clientName}.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert("Could not assign", e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>
            New Program
          </Text>
          <Text allowFontScaling={false} style={[styles.headerSub, { color: colors.textMuted }]}>
            for {clientName}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        {/* Program name */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PROGRAM NAME</Text>
        <TextInput
          value={programName}
          onChangeText={setProgramName}
          placeholder="e.g. Hypertrophy Block 1"
          placeholderTextColor={colors.inputPlaceholder}
          style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        />

        {/* Engine-assisted draft - the fast path */}
        <Pressable
          onPress={() => {
            hapticPress();
            setShowEngine(true);
          }}
          style={[styles.engineButton, { backgroundColor: colors.text }]}
        >
          <Ionicons name="sparkles" size={18} color={colors.bg} />
          <Text style={[styles.engineButtonText, { color: colors.bg }]}>Generate with engine</Text>
        </Pressable>
        <Text style={[styles.engineHint, { color: colors.textMuted }]}>
          Drafts a periodized program you can edit - or build it by hand below.
        </Text>

        {/* Phase: duration + goal */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DURATION</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={`${d} wk`} active={durationWeeks === d} onPress={() => setDurationWeeks(d)} />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>GOAL</Text>
        <View style={styles.chipRow}>
          {GOALS.map((g) => (
            <Chip key={g} label={g} active={goal === g} onPress={() => setGoal(g)} />
          ))}
        </View>

        {/* Workouts */}
        {workouts.map((workout, wi) => (
          <View key={wi} style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.workoutHeader}>
              <TextInput
                value={workout.name}
                onChangeText={(t) => updateWorkout(wi, { name: t })}
                placeholder="Workout name"
                placeholderTextColor={colors.inputPlaceholder}
                style={[styles.workoutName, { color: colors.text }]}
              />
              {workouts.length > 1 && (
                <Pressable onPress={() => removeWorkout(wi)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {workout.exercises.map((ex, ei) => (
              <View key={ei} style={[styles.exerciseBlock, { borderTopColor: colors.border }]}>
                <View style={styles.exerciseTopRow}>
                  <Text style={[styles.exNum, { color: colors.textMuted }]}>{ei + 1}</Text>
                  <TextInput
                    value={ex.exercise_name}
                    onChangeText={(t) => updateExercise(wi, ei, { exercise_name: t })}
                    placeholder="Exercise name"
                    placeholderTextColor={colors.inputPlaceholder}
                    style={[styles.exName, { color: colors.text }]}
                  />
                  <View style={styles.reorderCol}>
                    <Pressable onPress={() => moveExercise(wi, ei, -1)} disabled={ei === 0} hitSlop={6}>
                      <Ionicons name="chevron-up" size={18} color={ei === 0 ? colors.disabledText : colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveExercise(wi, ei, 1)}
                      disabled={ei === workout.exercises.length - 1}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={ei === workout.exercises.length - 1 ? colors.disabledText : colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  {workout.exercises.length > 1 && (
                    <Pressable onPress={() => removeExercise(wi, ei)} hitSlop={6}>
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {/* sets × reps · RIR · rest - reps is free text so ranges work (beta #2) */}
                <View style={styles.numRow}>
                  <NumField
                    label="Sets"
                    value={String(ex.sets)}
                    onChange={(t) => updateExercise(wi, ei, { sets: Math.max(1, parseInt(t, 10) || 1) })}
                  />
                  <View style={[styles.numField, { backgroundColor: colors.bgSecondary }]}>
                    <Text style={[styles.numLabel, { color: colors.textMuted }]}>Reps</Text>
                    <TextInput
                      value={ex.reps}
                      onChangeText={(t) => updateExercise(wi, ei, { reps: t })}
                      placeholder="8-10"
                      placeholderTextColor={colors.inputPlaceholder}
                      style={[styles.numInput, { color: colors.text }]}
                    />
                  </View>
                  <NumField
                    label="RIR"
                    value={String(ex.rir)}
                    keyboardType="number-pad"
                    onChange={(t) => updateExercise(wi, ei, { rir: Math.max(0, parseInt(t, 10) || 0) })}
                  />
                  <NumField
                    label="Rest s"
                    value={String(ex.rest_seconds ?? 120)}
                    keyboardType="number-pad"
                    onChange={(t) => updateExercise(wi, ei, { rest_seconds: Math.max(0, parseInt(t, 10) || 0) })}
                  />
                </View>

                {/* per-exercise notes (beta #5) */}
                <TextInput
                  value={ex.notes}
                  onChangeText={(t) => updateExercise(wi, ei, { notes: t })}
                  placeholder="Cue / note for this exercise (optional)"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={[styles.noteInput, { color: colors.textSecondary, backgroundColor: colors.bgSecondary }]}
                  multiline
                />
              </View>
            ))}

            <Pressable onPress={() => addExercise(wi)} style={styles.addExercise}>
              <Ionicons name="add" size={18} color={colors.text} />
              <Text style={[styles.addExerciseText, { color: colors.text }]}>Add exercise</Text>
            </Pressable>

            {/* per-workout notes (beta #5) */}
            <TextInput
              value={workout.notes}
              onChangeText={(t) => updateWorkout(wi, { notes: t })}
              placeholder="Workout note for the client (optional)"
              placeholderTextColor={colors.inputPlaceholder}
              style={[styles.workoutNote, { color: colors.textSecondary, backgroundColor: colors.bgSecondary }]}
              multiline
            />
          </View>
        ))}

        <Pressable onPress={addWorkout} style={[styles.addWorkout, { borderColor: colors.border }]}>
          <Ionicons name="add-circle-outline" size={20} color={colors.text} />
          <Text style={[styles.addWorkoutText, { color: colors.text }]}>Add workout day</Text>
        </Pressable>

        {/* Scheduling */}
        <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable style={styles.scheduleToggle} onPress={() => setScheduleNow((s) => !s)}>
            <View>
              <Text style={[styles.scheduleTitle, { color: colors.text }]}>Schedule now</Text>
              <Text style={[styles.scheduleSub, { color: colors.textMuted }]}>
                {scheduleNow
                  ? `Every other day from next Monday, rotating ${workouts.length} workout${workouts.length === 1 ? "" : "s"}`
                  : "Save as a draft - schedule later"}
              </Text>
            </View>
            <Ionicons
              name={scheduleNow ? "toggle" : "toggle-outline"}
              size={34}
              color={scheduleNow ? colors.success : colors.textMuted}
            />
          </Pressable>
          {scheduleNow && (
            <View style={styles.sessionsRow}>
              <Text style={[styles.scheduleSub, { color: colors.textSecondary }]}>Number of sessions</Text>
              <TextInput
                value={sessions}
                onChangeText={setSessions}
                keyboardType="number-pad"
                style={[styles.sessionsInput, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
          )}
        </View>

        {errors.length > 0 && (
          <Text style={[styles.errorHint, { color: colors.textMuted }]}>
            {errors.length} thing{errors.length === 1 ? "" : "s"} to finish before assigning
          </Text>
        )}

        <View style={{ height: 100 }} />
      </KeyboardAwareScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Pressable
          onPress={onAssign}
          disabled={saving || errors.length > 0}
          style={[
            styles.assignButton,
            { backgroundColor: colors.text },
            (saving || errors.length > 0) && { opacity: 0.4 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={colors.bg} />
              <Text style={[styles.assignText, { color: colors.bg }]}>
                {scheduleNow ? `Assign to ${clientName.split(" ")[0]}` : "Save draft"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <EngineDraftSheet
        visible={showEngine}
        onClose={() => setShowEngine(false)}
        programName={programName}
        onGenerated={applyEngineDraft}
      />
    </SafeAreaView>
  );
}

// ── Small building blocks ─────────────────────────────────────────────────────

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: active ? colors.text : "transparent" },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.bg : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

function NumField({
  label,
  value,
  onChange,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  keyboardType?: "default" | "number-pad";
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.numField, { backgroundColor: colors.bgSecondary }]}>
      <Text style={[styles.numLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={[styles.numInput, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  engineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.base,
    height: 50,
    borderRadius: radius.md,
  },
  engineButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  engineHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  workoutCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
  },
  workoutHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  workoutName: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", paddingVertical: 4 },
  exerciseBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  exerciseTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  exNum: { width: 16, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  exName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingVertical: 2 },
  reorderCol: { alignItems: "center" },
  numRow: { flexDirection: "row", gap: spacing.sm },
  numField: { flex: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  numLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginBottom: 2 },
  numInput: { fontSize: 15, fontFamily: "Inter_600SemiBold", padding: 0 },
  noteInput: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 36,
  },
  addExercise: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.md },
  addExerciseText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  workoutNote: {
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 40,
    marginTop: spacing.sm,
  },
  addWorkout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addWorkoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scheduleCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
  },
  scheduleToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scheduleTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  scheduleSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, maxWidth: 250 },
  sessionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  sessionsInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    minWidth: 64,
    textAlign: "center",
  },
  errorHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: spacing.lg },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  assignButton: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  assignText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
