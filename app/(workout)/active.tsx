/**
 * Active Workout Screen
 * Thin shell composing workout components via ActiveWorkoutContext.
 * All state and logic lives in the context - this is purely UI composition.
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { View, Modal, Pressable, BackHandler, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import {
  useActiveWorkout,
  type ActiveExercise,
} from "@/src/context/ActiveWorkoutContext";
import { supabase } from "@/lib/supabase";
import { generateWorkoutOnTheFly } from "@/lib/workout/generateOnTheFly";
import { usePRs } from "@/src/hooks/usePRs";
import { usePreviousWorkout } from "@/src/hooks/usePreviousWorkout";
import { useXPAward } from "@/src/hooks/useXPAward";
// rationale removed for minimal prototype
import {
  WorkoutHeader,
  ExerciseCardNew,
  ExerciseInfo,
  ExerciseSwapModal,
  ExerciseNotes,
  SaveAsTemplateSheet,
  PostWorkoutCheckin,
} from "@/src/components/workout";
import type { PostWorkoutData } from "@/src/components/workout";
import { ExerciseHistorySheet } from "@/src/components/workout/ExerciseHistorySheet";
import { EndWorkoutSheet } from "@/src/components/workout/EndWorkoutSheet";
// useActiveLimitations removed - causes PGRST errors without migrations applied
import { useWeeklySummary } from "@/src/hooks/useWeeklySummary";
import type { BodyRegion } from "@/src/theme";
import { format } from "date-fns";
import { DraggableExerciseList } from "@/src/components/workout/DraggableExerciseList";
import {
  WorkoutComplete,
  ToastContainer,
  PRCelebration,
  FirstWorkoutCeremony,
  StreakMilestone,
  showToast,
} from "@/src/animations/celebrations";

// =============================================================================
// ROUTE PARAMS → INITIAL EXERCISES
// =============================================================================

type ProgramExercise = {
  name?: string;
  exercise_name?: string;
  sets: number;
  reps: string;
  rir: number;
  notes?: string;
  muscleGroup?: string;
  primary_muscles?: string[];
  rest_seconds?: number;
};

function parseInitialExercises(exercisesJson?: string): ActiveExercise[] {
  if (!exercisesJson) return [];
  try {
    const parsed = JSON.parse(exercisesJson) as ProgramExercise[];
    return parsed.map((ex, i) => {
      const name = ex.name ?? ex.exercise_name ?? "Exercise";
      const muscles = ex.muscleGroup
        ? [ex.muscleGroup]
        : ex.primary_muscles ?? [];
      return {
        id: `ex-init-${i}`,
        name,
        muscles,
        sets: Array.from({ length: ex.sets }, (_, j) => ({
          id: `set-init-${i}-${j}`,
          weight: "",
          reps: "",
          completed: false,
          isWarmup: false,
          isPR: false,
        })),
        targetReps: ex.reps,
        targetRIR: ex.rir,
        notes: ex.notes || "",
        groupId: null,
        orderIndex: i,
        isExpanded: i === 0,
        restTimerSeconds: ex.rest_seconds ?? 90,
      };
    });
  } catch {
    return [];
  }
}

// Pain location → BodyRegion mapping for PostWorkoutCheckin
const PAIN_TO_BODY_REGION: Record<string, BodyRegion> = {
  shoulder: "shoulders",
  back: "back",
  knee: "knees",
  elbow: "arms",
};

// =============================================================================
// INNER SCREEN (consumes context)
// =============================================================================

function ActiveWorkoutInner() {
  const { colors } = useTheme();
  const { state, actions, progress } = useActiveWorkout();

  // Leave the modal when the session *ends* (Discard, Save & Exit, or
  // finishWorkout success). On first mount `state.isActive` is briefly
  // false while the outer wrapper dispatches START_SESSION; tracking the
  // true→false transition explicitly avoids that initial bounce.
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (state.isActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current) {
      router.dismissTo("/(app)/(tabs)/workout");
    }
  }, [state.isActive]);

  const [showExerciseInfo, setShowExerciseInfo] = useState<string | null>(null);
  const [historyExerciseId, setHistoryExerciseId] = useState<string | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [_showShareCard, _setShowShareCard] = useState(false);
  const [showFirstWorkout, setShowFirstWorkout] = useState(false);
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [profileName, setProfileName] = useState("there");
  const [userGoal, setUserGoal] = useState("general_fitness");
  const [isFirstWorkout, setIsFirstWorkout] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showEndSheet, setShowEndSheet] = useState(false);

  const limitations: any[] = [];
  const reportLimitation = async (_region: any) => {};
  const recordFeedback = async (_id: any, _note: string, _fb: any) => {};

  const { data: weeklySummary } = useWeeklySummary(state.userId);

  // Detect first workout and profile name
  useEffect(() => {
    if (!state.userId) return;
    (async () => {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", state.userId!),
        supabase
          .from("profiles")
          .select("first_name, goal, onboarding_data")
          .eq("id", state.userId!)
          .single(),
      ]);
      if (count === 0) setIsFirstWorkout(true);
      if (profile?.first_name) setProfileName(profile.first_name);
      const goal = profile?.goal || profile?.onboarding_data?.goal || "general_fitness";
      setUserGoal(goal);
    })();
  }, [state.userId]);

  // Previous workout data
  const exerciseNames = useMemo(
    () => state.exercises.map((ex) => ex.name),
    [state.exercises]
  );
  const { getPreviousSet } = usePreviousWorkout(state.userId, exerciseNames);
  const { getPR, checkPR, updateLocalPR } = usePRs(state.userId);
  const { awardWorkoutXP } = useXPAward();

  // Handle set completion with PR detection
  const handleSetComplete = useCallback(
    (exerciseId: string, setId: string) => {
      const exercise = state.exercises.find((ex) => ex.id === exerciseId);
      const set = exercise?.sets.find((s) => s.id === setId);
      if (!exercise || !set || !set.weight || !set.reps) {
        actions.toggleSetComplete(exerciseId, setId);
        return;
      }

      const weight = parseFloat(set.weight);
      const reps = parseInt(set.reps, 10);
      if (weight > 0 && reps > 0) {
        const { isPR, previousBest } = checkPR(exercise.name, weight, reps);

        if (isPR) {
          // Check if it's a rep PR (same weight, more reps) vs weight PR
          const isRepPR = previousBest && weight === previousBest.max_weight_lbs && reps > previousBest.reps_at_max_weight;

          updateLocalPR(exercise.name, weight, reps);

          if (isRepPR) {
            // Rep PR - subtler celebration via toast
            setTimeout(() => {
              showToast({ message: `Rep PR! ${reps} reps @ ${weight} lbs`, type: "pr" });
            }, 300);
          }
          // Weight PRs will be detected and celebrated by the context's existing logic
        }
      }

      actions.toggleSetComplete(exerciseId, setId);
    },
    [state.exercises, actions, checkPR, updateLocalPR]
  );

  // Per-workout completion summary used by the End-confirmation sheet.
  // Counts every set across every exercise; an "skipped" exercise = one
  // with zero completed sets.
  const endSummary = useMemo(() => {
    let completed = 0;
    let total = 0;
    let skipped = 0;
    for (const ex of state.exercises) {
      total += ex.sets.length;
      const exDone = ex.sets.filter((s) => s.completed).length;
      completed += exDone;
      if (exDone === 0) skipped += 1;
    }
    return { completed, total, skipped };
  }, [state.exercises]);

  // Compute total volume and collect PRs for celebration screen
  const workoutStats = useMemo(() => {
    let totalVolume = 0;
    const prs: { exercise: string; value: string; previous?: string }[] = [];

    for (const ex of state.exercises) {
      const pr = getPR(ex.name);
      for (const s of ex.sets) {
        if (s.completed && s.weight && s.reps) {
          const w = parseFloat(s.weight);
          const r = parseInt(s.reps, 10);
          if (w > 0 && r > 0) totalVolume += w * r;
        }
        if (s.isPR && s.weight && s.reps) {
          const existing = prs.find(p => p.exercise === ex.name);
          if (!existing) {
            prs.push({
              exercise: ex.name,
              value: `${s.weight} lbs x ${s.reps}`,
              previous: pr ? `${pr.max_weight_lbs} lbs x ${pr.reps_at_max_weight}` : undefined,
            });
          }
        }
      }
    }
    return { totalVolume: Math.round(totalVolume), prs };
  }, [state.exercises, getPR]);

  // Hardware back: minimize the workout instead of discarding it.
  // The session lives in the root provider, so dismissing the modal
  // surfaces the persistent mini-bar - workout state is preserved.
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      router.dismissTo("/(app)/(tabs)/workout");
      return true;
    });
    return () => handler.remove();
  }, []);

  // When workout celebration shows, check for special moments before finishing
  const handleFinishContinue = useCallback(async () => {
    // First workout ceremony takes priority
    if (isFirstWorkout) {
      setShowFirstWorkout(true);
      return;
    }

    // Check for streak milestone
    if (state.userId) {
      const { data } = await supabase
        .from("user_streaks")
        .select("current_streak")
        .eq("user_id", state.userId)
        .single();

      const streak = (data?.current_streak || 0) + 1; // +1 because streak updates on save
      const MILESTONES = [7, 14, 30, 60, 100, 200, 365];
      if (MILESTONES.includes(streak)) {
        setStreakDays(streak);
        setShowStreakMilestone(true);
        return;
      }
    }

    // Show post-workout checkin before finishing
    setShowCheckin(true);
  }, [isFirstWorkout, state.userId]);

  // Continue after special celebrations
  const handleSpecialCelebrationDone = useCallback(async () => {
    setShowFirstWorkout(false);
    setShowStreakMilestone(false);
    // Show post-workout checkin before finishing
    setShowCheckin(true);
  }, []);

  // Final finish flow - called after checkin completes
  const completeFinishFlow = useCallback(async () => {
    if (finishing) return; // Prevent double-tap spam
    setFinishing(true);

    // Snapshot the count before finishWorkout tears down state.
    const savedSets = endSummary.completed;

    try {
      await actions.finishWorkout();
    } catch {
      setFinishing(false);
      return;
    }

    awardWorkoutXP(Date.now().toString(), workoutStats.prs.length).catch(() => {});

    showToast({
      message: `Workout saved · ${savedSets} set${savedSets === 1 ? "" : "s"}`,
      type: "exerciseComplete",
    });

    // Navigate home - no save-as-template for coaching programs
    router.dismissTo("/(app)/(tabs)/workout");
  }, [finishing, actions, awardWorkoutXP, workoutStats.prs.length, endSummary.completed]);

  // Handle checkin data submission
  const handleCheckinComplete = useCallback(async (data: PostWorkoutData) => {
    if (data.feeling === "pain" && data.painLocation) {
      const bodyRegion = PAIN_TO_BODY_REGION[data.painLocation];
      if (bodyRegion) {
        await reportLimitation(bodyRegion);
      }
    } else if (data.feeling !== "pain" && limitations.length > 0) {
      const feedback = data.feeling === "easy" ? "better" as const : "same" as const;
      for (const limitation of limitations) {
        await recordFeedback(limitation.id, "", feedback);
      }
    }
    // Continue to finish flow after checkin
    setShowCheckin(false);
    await completeFinishFlow();
  }, [limitations, reportLimitation, recordFeedback, completeFinishFlow]);

  // Handle checkin dismiss (auto-dismiss after confirmation or skip)
  const handleCheckinSkip = useCallback(async () => {
    setShowCheckin(false);
    await completeFinishFlow();
  }, [completeFinishFlow]);

  // Render each exercise card
  const renderExercise = useCallback(
    (exercise: ActiveExercise, index: number) => {
      // Build previousSets array for this exercise
      const previousSets = exercise.sets.map((_, setIdx) => {
        const prev = getPreviousSet(exercise.name, setIdx + 1);
        return prev ? { weight: String(prev.weight), reps: String(prev.reps) } : null;
      });

      const pr = getPR(exercise.name);

      return (
        <Animated.View
          key={exercise.id}
          entering={FadeInDown.delay(index * 50).duration(300)}
          style={{ marginBottom: 12 }}
        >
          <ExerciseCardNew
            id={exercise.id}
            name={exercise.name}
            muscles={exercise.muscles}
            sets={exercise.sets.map((s) => ({
              id: s.id,
              weight: s.weight,
              reps: s.reps,
              completed: s.completed,
            }))}
            targetReps={exercise.targetReps}
            targetRIR={exercise.targetRIR}
            previousSets={previousSets}
            currentPRWeight={pr?.max_weight_lbs}
            isExpanded={exercise.isExpanded}
            onToggleExpand={() => actions.toggleExpand(exercise.id)}
            onSetComplete={(setId) => handleSetComplete(exercise.id, setId)}
            onSetChange={(setId, field, value) => actions.updateSet(exercise.id, setId, field, value)}
            onSwapExercise={() => {
              setSwapExerciseId(exercise.id);
              setShowSwapModal(true);
            }}
            onShowInfo={() => setShowExerciseInfo(exercise.name)}
            onShowHistory={() => setHistoryExerciseId(exercise.id)}
            onAddSet={() => actions.addSet(exercise.id)}
            onDeleteSet={(setId) => actions.removeSet(exercise.id, setId)}
          />

          {/* Notes section */}
          {exercise.isExpanded && (
            <View style={{ paddingHorizontal: 16, marginTop: -4, marginBottom: 4 }}>
              <ExerciseNotes
                exerciseId={exercise.id}
                notes={exercise.notes}
                previousNotes={exercise.previousNotes}
              />
            </View>
          )}
        </Animated.View>
      );
    },
    [actions, getPreviousSet, getPR, handleSetComplete]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <WorkoutHeader
        saving={finishing}
        onFinish={() => {
          if (finishing) return;
          // Always show the confirm sheet first - never silent-save / silent-discard.
          setShowEndSheet(true);
        }}
      />

      <EndWorkoutSheet
        visible={showEndSheet}
        mode={endSummary.completed === 0 ? "empty" : "normal"}
        completedSets={endSummary.completed}
        totalSets={endSummary.total}
        skippedExercises={endSummary.skipped}
        onCancel={() => setShowEndSheet(false)}
        onConfirm={() => {
          setShowEndSheet(false);
          if (endSummary.completed === 0) {
            // Discard: clear local state, exit. No DB write.
            actions.discardWorkout();
            router.dismissTo("/(app)/(tabs)/workout");
            return;
          }
          // Let `completeFinishFlow` own `finishing`. Setting it here too
          // would short-circuit completeFinishFlow's own guard via stale
          // closure under certain re-render orderings.
          completeFinishFlow();
        }}
      />

      <DraggableExerciseList renderExercise={renderExercise} />

      {/* Workout Complete Celebration */}
      <WorkoutComplete
        visible={state.showCelebration}
        stats={{
          duration: `${Math.floor(state.elapsedSeconds / 60)}:${(state.elapsedSeconds % 60).toString().padStart(2, "0")}`,
          exercises: state.exercises.length,
          sets: progress.completedSets,
          totalVolume: workoutStats.totalVolume || undefined,
          prs: workoutStats.prs.length > 0 ? workoutStats.prs : undefined,
          workoutsThisWeek: (weeklySummary?.workoutsCompleted ?? 0) + 1,
        }}
        onContinue={handleFinishContinue}
        onShare={() => {}}
      />

      {/* PR Celebration */}
      {state.prData && (
        <PRCelebration
          visible={state.showPRCelebration}
          exercise={state.prData.exercise}
          previousValue={state.prData.previousValue}
          newValue={state.prData.newValue}
          onDismiss={() => {
            // handled by context
          }}
        />
      )}

      {/* First Workout Ceremony */}
      <FirstWorkoutCeremony
        visible={showFirstWorkout}
        userName={profileName}
        onContinue={handleSpecialCelebrationDone}
      />

      {/* Streak Milestone */}
      <StreakMilestone
        visible={showStreakMilestone}
        days={streakDays}
        onDismiss={handleSpecialCelebrationDone}
      />

      {/* Post-Workout Checkin */}
      <PostWorkoutCheckin
        visible={showCheckin}
        onComplete={handleCheckinComplete}
        onSkip={handleCheckinSkip}
        workoutTitle={state.title}
        duration={state.elapsedSeconds}
      />

      {/* Exercise Info Modal */}
      <Modal
        visible={!!showExerciseInfo}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExerciseInfo(null)}
      >
        <View style={[styles.infoModal, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowExerciseInfo(null)}
          />
          <View style={[styles.infoSheet, { backgroundColor: colors.bg }]}>
            {showExerciseInfo && (
              <ExerciseInfo
                exerciseName={showExerciseInfo}
                onClose={() => setShowExerciseInfo(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Exercise History Sheet */}
      <ExerciseHistorySheet
        visible={!!historyExerciseId}
        userId={state.userId}
        exerciseName={
          state.exercises.find((ex) => ex.id === historyExerciseId)?.name ?? null
        }
        onClose={() => setHistoryExerciseId(null)}
        onUseLastWorkout={(prevSets) => {
          const ex = state.exercises.find((e) => e.id === historyExerciseId);
          if (!ex) return;
          // Position-match: copy each previous set into the corresponding
          // current set. Don't add or remove rows - coach's prescribed
          // structure stays intact; the user can still adjust manually.
          ex.sets.forEach((s, i) => {
            const prev = prevSets[i];
            if (!prev || s.completed) return;
            actions.updateSet(ex.id, s.id, "weight", String(prev.weight));
            actions.updateSet(ex.id, s.id, "reps", String(prev.reps));
          });
        }}
      />

      {/* Exercise Swap Modal */}
      {swapExerciseId && (
        <ExerciseSwapModal
          visible={showSwapModal}
          onClose={() => {
            setShowSwapModal(false);
            setSwapExerciseId(null);
          }}
          onSelectExercise={(newEx) => {
            actions.swapExercise(swapExerciseId, {
              name: newEx.name,
              muscles: newEx.muscles,
            });
            setShowSwapModal(false);
            setSwapExerciseId(null);
          }}
          currentExercise={
            state.exercises.find((ex) => ex.id === swapExerciseId)?.name || ""
          }
          currentMuscles={
            state.exercises.find((ex) => ex.id === swapExerciseId)?.muscles || []
          }
        />
      )}

      {/* Save as Template prompt */}
      <SaveAsTemplateSheet
        visible={showSaveTemplate}
        defaultName={state.title}
        onSave={async (name) => {
          await actions.saveAsTemplate(name);
          setShowSaveTemplate(false);
          router.dismissTo("/(app)/(tabs)/workout");
        }}
        onSkip={() => {
          setShowSaveTemplate(false);
          router.dismissTo("/(app)/(tabs)/workout");
        }}
      />

      {/* Share card removed - react-native-view-shot not installed */}

      <ToastContainer />
    </SafeAreaView>
  );
}

// =============================================================================
// OUTER WRAPPER (parses params, provides context)
// =============================================================================

export default function ActiveWorkoutScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    name?: string;
    exercises?: string;
    sourceType?: string;
    sourceId?: string;
    sessionDate?: string;
  }>();

  const { state, actions } = useActiveWorkout();

  const workoutType = params.type || "Full Body";
  const workoutName = params.name || workoutType;
  const sourceType = (params.sourceType as "empty" | "template" | "program" | "rerun") || "empty";

  // Each navigation to active.tsx is a fresh "start" intent - but we only
  // honor it once per mount and only when no session is already active.
  // If a session is in progress (mini-bar tap, swipe-back-and-back-in),
  // we just resume it. The startedRef latch prevents re-init from a
  // strict-mode double-effect or downstream state change.
  const startedRef = useRef(false);

  const startWith = useCallback(
    (exercises: ActiveExercise[]) => {
      if (startedRef.current) return;
      startedRef.current = true;
      // Resolve user fresh so the session is bound to an account from
      // moment zero - eliminates the race where the provider's getUser()
      // hadn't resolved yet when the workout starts.
      supabase.auth.getUser().then(({ data: { user } }) => {
        actions.startSession({
          exercises,
          title: workoutName,
          sourceType,
          sourceId: params.sourceId,
          sessionDate: params.sessionDate,
          userId: user?.id ?? undefined,
        });
      });
    },
    [actions, workoutName, sourceType, params.sourceId, params.sessionDate]
  );

  // Synchronous start path: if route carries exercises and no session is
  // active yet, seed immediately so the inner screen renders this workout.
  useEffect(() => {
    if (state.isActive) {
      startedRef.current = true; // resume; don't re-seed
      return;
    }
    if (params.exercises) {
      startWith(parseInitialExercises(params.exercises));
    } else if (sourceType === "empty") {
      startWith([]);
    }
    // sourceType !== "empty" with no exercises → handled by the generator
    // effect below.
  }, [state.isActive, params.exercises, sourceType, startWith]);

  // On-the-fly generation path: program/template/rerun without exercises.
  useEffect(() => {
    if (startedRef.current || state.isActive) return;
    if (params.exercises) return;
    if (sourceType === "empty") return;

    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const generated = await generateWorkoutOnTheFly(user.id, workoutType);
      if (cancelled || !generated || generated.exercises.length === 0) {
        if (!cancelled) startWith([]); // fall back to empty so the screen renders
        return;
      }

      const active: ActiveExercise[] = generated.exercises.map((ex: any, i: number) => ({
        id: `ex-gen-${i}`,
        name: ex.name,
        muscles: ex.muscles || [],
        sets: (ex.sets || []).map((s: any, j: number) => ({
          id: `set-gen-${i}-${j}`,
          weight: s.weight || "",
          reps: s.reps || "",
          completed: false,
          isWarmup: false,
          isPR: false,
        })),
        targetReps: ex.targetReps || "8-10",
        targetRIR: ex.targetRIR ?? 2,
        notes: "",
        groupId: null,
        orderIndex: i,
        isExpanded: i === 0,
        restTimerSeconds: 90,
      }));

      if (!cancelled) startWith(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.exercises, workoutType, sourceType, state.isActive, startWith]);

  return (
    <ErrorBoundary label="Workout" onReset={() => router.dismissTo("/(app)/(tabs)/workout")}>
      <ActiveWorkoutInner />
    </ErrorBoundary>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoModal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  infoSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
});
