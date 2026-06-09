/**
 * DraggableExerciseList
 * Normal mode: grouped view (supersets) with inline rest timers + add button.
 * Reorder mode: a real drag-to-relocate list (react-native-reorderable-list).
 * Tap "Reorder" to enter; long-press a card's handle and drag to relocate.
 */

import React, {
  useMemo,
  useState,
  useCallback,
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
import ReorderableList, {
  useReorderableDrag,
  useIsActive,
  type ReorderableListReorderEvent,
} from "react-native-reorderable-list";
import { Ionicons } from "@expo/vector-icons";
import { useActiveWorkout, type ActiveExercise } from "@/src/context/ActiveWorkoutContext";
import { useTheme } from "@/src/context/ThemeContext";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { SupersetGroup } from "./SupersetGroup";
import { InlineRestTimer } from "./InlineRestTimer";
import { AddExerciseButton } from "./AddExerciseButton";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

// ─────────────────────────────────────────────────────────────────────────────
// ReorderItemRow - a single draggable card in reorder mode
// ─────────────────────────────────────────────────────────────────────────────

function ReorderItemRow({
  exercise,
  index,
  renderExercise,
  colors,
}: {
  exercise: ActiveExercise;
  index: number;
  renderExercise: (exercise: ActiveExercise, index: number) => ReactNode;
  colors: ThemeColors;
}) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();

  return (
    <View
      style={[
        styles.reorderRow,
        isActive && {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {/* Drag handle - press & hold, then drag to relocate */}
      <Pressable
        onLongPress={drag}
        delayLongPress={140}
        hitSlop={8}
        style={styles.dragHandle}
        accessibilityRole="button"
        accessibilityLabel={`Reorder ${exercise.name}`}
      >
        <Ionicons name="reorder-two-outline" size={24} color={colors.textMuted} />
      </Pressable>
      <View style={styles.reorderCardWrap}>{renderExercise(exercise, index)}</View>
    </View>
  );
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

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (from === to) return;
      hapticPress();
      actions.reorderExercises(from, to);
    },
    [actions],
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
      {/* Reorder toolbar - only shown when 2+ exercises */}
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

      {isReorderMode ? (
        // ── Reorder mode: real drag-to-relocate list ──
        <ReorderableList
          data={exercises}
          keyExtractor={(item) => item.id}
          onReorder={handleReorder}
          renderItem={({ item, index }) => (
            <ReorderItemRow
              exercise={item}
              index={index}
              renderExercise={renderExercise}
              colors={colors}
            />
          )}
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Normal mode: grouped view with superset support ── */}
          {groups.map((group) => {
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
          })}

          <AddExerciseButton />
        </ScrollView>
      )}
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
    gap: 6,
  },
  dragHandle: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  reorderCardWrap: { flex: 1 },
});
