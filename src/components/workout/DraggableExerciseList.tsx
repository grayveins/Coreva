/**
 * DraggableExerciseList
 * Renders exercises with wiggle-animation reorder mode (iOS home screen style).
 * Tap "Reorder" to enter edit mode: cards wiggle and show ↑/↓ controls.
 * Groups consecutive exercises with the same groupId into SupersetGroups.
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  View,
  Text,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useActiveWorkout, type ActiveExercise } from "@/src/context/ActiveWorkoutContext";
import { useTheme } from "@/src/context/ThemeContext";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { SupersetGroup } from "./SupersetGroup";
import { InlineRestTimer } from "./InlineRestTimer";
import { AddExerciseButton } from "./AddExerciseButton";

// ─────────────────────────────────────────────────────────────────────────────
// WiggleCard — wraps a card with iOS-style rotation wiggle when editing
// ─────────────────────────────────────────────────────────────────────────────

type WiggleCardProps = {
  isEditing: boolean;
  /** Stagger delay in ms so cards don't all start wiggling in sync. */
  phaseDelay: number;
  children: ReactNode;
};

function WiggleCard({ isEditing, phaseDelay, children }: WiggleCardProps) {
  const rot = useSharedValue(0);

  useEffect(() => {
    if (isEditing) {
      rot.value = withDelay(
        phaseDelay,
        withRepeat(
          withSequence(
            withTiming(-1.8, { duration: 85 }),
            withTiming(1.8, { duration: 85 }),
          ),
          -1,
          true,
        ),
      );
    } else {
      rot.value = withTiming(0, { duration: 120 });
    }
  }, [isEditing, phaseDelay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ExerciseGroup = {
  groupId: string | null;
  exercises: ActiveExercise[];
};

type Props = {
  renderExercise: (exercise: ActiveExercise, index: number) => ReactNode;
};

// ─────────────────────────────────────────────────────────────────────────────
// DraggableExerciseList
// ─────────────────────────────────────────────────────────────────────────────

export function DraggableExerciseList({ renderExercise }: Props) {
  const { colors } = useTheme();
  const { state, actions } = useActiveWorkout();
  const [isReorderMode, setIsReorderMode] = useState(false);

  const exercises = state.exercises;

  // Group consecutive exercises by groupId (used in normal view)
  const groups = useMemo<ExerciseGroup[]>(() => {
    const result: ExerciseGroup[] = [];
    for (const exercise of exercises) {
      const lastGroup = result[result.length - 1];
      if (exercise.groupId && lastGroup?.groupId === exercise.groupId) {
        lastGroup.exercises.push(exercise);
      } else {
        result.push({ groupId: exercise.groupId, exercises: [exercise] });
      }
    }
    return result;
  }, [exercises]);

  const handleMoveUp = useCallback(
    (exerciseId: string) => {
      const idx = exercises.findIndex((e) => e.id === exerciseId);
      if (idx > 0) {
        hapticPress();
        actions.reorderExercises(idx, idx - 1);
      }
    },
    [exercises, actions],
  );

  const handleMoveDown = useCallback(
    (exerciseId: string) => {
      const idx = exercises.findIndex((e) => e.id === exerciseId);
      if (idx < exercises.length - 1) {
        hapticPress();
        actions.reorderExercises(idx, idx + 1);
      }
    },
    [exercises, actions],
  );

  const toggleReorderMode = useCallback(() => {
    hapticPress();
    setIsReorderMode((v) => !v);
  }, []);

  // Track global exercise index for stagger animations
  let globalIndex = 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Reorder toolbar — only shown when 2+ exercises */}
      {exercises.length > 1 && (
        <View style={[styles.reorderBar, { borderBottomColor: colors.border }]}>
          <Pressable onPress={toggleReorderMode} style={styles.reorderBtn} hitSlop={8}>
            <Ionicons
              name={isReorderMode ? "checkmark-circle" : "reorder-three-outline"}
              size={18}
              color={isReorderMode ? colors.text : colors.textMuted}
            />
            <Text
              allowFontScaling={false}
              style={[
                styles.reorderText,
                { color: isReorderMode ? colors.text : colors.textMuted },
              ]}
            >
              {isReorderMode ? "Done" : "Reorder"}
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Disable scroll while reordering so cards don't jump around
        scrollEnabled={!isReorderMode}
      >
        {isReorderMode ? (
          // ── Reorder mode: flat list, wiggling cards with ↑/↓ controls ──
          exercises.map((exercise, index) => (
            <WiggleCard
              key={exercise.id}
              isEditing
              phaseDelay={index * 35}
            >
              <View style={styles.reorderRow}>
                {/* Exercise card */}
                <View style={styles.reorderCardWrap}>
                  {renderExercise(exercise, index)}
                </View>

                {/* Up / Handle / Down column */}
                <View
                  style={[
                    styles.reorderControls,
                    { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                  ]}
                >
                  <Pressable
                    onPress={() => handleMoveUp(exercise.id)}
                    disabled={index === 0}
                    hitSlop={6}
                    style={{ opacity: index === 0 ? 0.25 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={20} color={colors.text} />
                  </Pressable>

                  <Ionicons name="menu" size={16} color={colors.textMuted} />

                  <Pressable
                    onPress={() => handleMoveDown(exercise.id)}
                    disabled={index === exercises.length - 1}
                    hitSlop={6}
                    style={{ opacity: index === exercises.length - 1 ? 0.25 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={20} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </WiggleCard>
          ))
        ) : (
          // ── Normal mode: grouped view with superset support ──
          groups.map((group) => {
            if (group.groupId && group.exercises.length >= 2) {
              const rendered = group.exercises.map((exercise) => {
                const idx = globalIndex++;
                return (
                  <React.Fragment key={exercise.id}>
                    {renderExercise(exercise, idx)}
                    {state.restTimer.active &&
                      state.restTimer.afterExerciseId === exercise.id && (
                        <InlineRestTimer />
                      )}
                  </React.Fragment>
                );
              });

              return (
                <SupersetGroup key={group.groupId} exerciseCount={group.exercises.length}>
                  {rendered}
                </SupersetGroup>
              );
            }

            return group.exercises.map((exercise) => {
              const idx = globalIndex++;
              return (
                <React.Fragment key={exercise.id}>
                  {renderExercise(exercise, idx)}
                  {state.restTimer.active &&
                    state.restTimer.afterExerciseId === exercise.id && (
                      <InlineRestTimer />
                    )}
                </React.Fragment>
              );
            });
          })
        )}

        {!isReorderMode && <AddExerciseButton />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16 },

  reorderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  reorderText: {
    fontSize: 13,
    fontWeight: "500",
  },

  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  reorderCardWrap: {
    flex: 1,
  },
  reorderControls: {
    width: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    // Subtle elevation so it floats above the card
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
});
