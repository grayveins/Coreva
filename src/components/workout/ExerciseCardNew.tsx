/**
 * ExerciseCardNew — Minimal flat exercise card
 * Always expanded, no collapsible, no gradient bars.
 * Hevy/Trainerize hybrid: exercise name, set table, action chips.
 */

import React from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { SetRowNew } from "./SetRowNew";
import { MuscleChips } from "./MuscleChips";
import { hapticPress } from "@/src/animations/feedback/haptics";

export type SetData = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
};

type ExerciseCardNewProps = {
  id: string;
  name: string;
  muscles: string[];
  sets: SetData[];
  targetReps: string;
  targetRIR: number;
  previousSets?: ({ weight: string; reps: string } | null)[];
  currentPRWeight?: number;
  onSetComplete: (setId: string) => void;
  onSetChange: (setId: string, field: "weight" | "reps", value: string) => void;
  onSwapExercise?: () => void;
  onShowInfo?: () => void;
  /** Tap-on-name handler — opens the ExerciseHistorySheet. */
  onShowHistory?: () => void;
  onAddSet?: () => void;
  /** Per-set delete via swipe. Refused at the action layer when the set
   *  is completed or it's the last remaining set. */
  onDeleteSet?: (setId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export const ExerciseCardNew: React.FC<ExerciseCardNewProps> = ({
  name,
  muscles,
  sets,
  targetReps,
  targetRIR,
  previousSets = [],
  currentPRWeight,
  onSetComplete,
  onSetChange,
  onSwapExercise,
  onShowInfo,
  onShowHistory,
  onAddSet,
  onDeleteSet,
}) => {
  const { colors } = useTheme();

  const completedSets = sets.filter(s => s.completed).length;
  const totalSets = sets.length;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Exercise header */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => {
            if (!onShowHistory) return;
            hapticPress();
            onShowHistory();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${name}, view history`}
          disabled={!onShowHistory}
        >
          <Text
            allowFontScaling={false}
            style={[styles.exerciseName, { color: colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.meta, { color: colors.textMuted }]}
          >
            {`Set ${completedSets} of ${totalSets}`}
            {targetReps ? ` · ${targetReps} reps · RIR ${targetRIR ?? 2}` : ""}
          </Text>
          {muscles && muscles.length > 0 && (
            <View style={styles.muscleRow}>
              <MuscleChips muscles={muscles} />
            </View>
          )}
        </Pressable>
        {currentPRWeight != null && currentPRWeight > 0 && (
          <View style={[styles.prBadge, { borderColor: colors.border }]}>
            <Text allowFontScaling={false} style={[styles.prText, { color: colors.text }]}>
              {`PR: ${currentPRWeight} lbs`}
            </Text>
          </View>
        )}
      </View>

      {/* Action chips */}
      <View style={styles.chips}>
        {onShowInfo && (
          <Chip icon="information-circle-outline" label="Info" onPress={onShowInfo} colors={colors} />
        )}
        {onSwapExercise && (
          <Chip icon="swap-horizontal-outline" label="Swap" onPress={onSwapExercise} colors={colors} />
        )}
      </View>

      {/* Set table header */}
      <View style={styles.tableHeader}>
        <Text allowFontScaling={false} style={[styles.colLabel, styles.setCol, { color: colors.textMuted }]}>
          Set
        </Text>
        <Text allowFontScaling={false} style={[styles.colLabel, styles.prevCol, { color: colors.textMuted }]}>
          Previous
        </Text>
        <Text allowFontScaling={false} style={[styles.colLabel, styles.repsCol, { color: colors.textMuted }]}>
          Reps
        </Text>
        <Text allowFontScaling={false} style={[styles.colLabel, styles.weightCol, { color: colors.textMuted }]}>
          Lb
        </Text>
        <View style={styles.doneCol} />
      </View>

      {/* Set rows */}
      {sets.map((set, index) => {
        const prevSet = previousSets[index];
        const weightNum = set.weight ? parseFloat(set.weight) : 0;
        const isCloseToPR = !!(
          currentPRWeight &&
          weightNum > 0 &&
          weightNum >= currentPRWeight * 0.9
        );
        // Disable swipe-to-delete on the last remaining set: the reducer
        // would refuse it anyway (an exercise needs ≥1 set), so don't
        // surface an action that no-ops.
        const canDelete = !!onDeleteSet && sets.length > 1;
        return (
          <SetRowNew
            key={set.id}
            setNumber={index + 1}
            weight={set.weight}
            reps={set.reps}
            completed={set.completed}
            previousWeight={prevSet?.weight}
            previousReps={prevSet?.reps}
            closeToPR={isCloseToPR}
            onComplete={() => onSetComplete(set.id)}
            onWeightChange={(value) => onSetChange(set.id, "weight", value)}
            onRepsChange={(value) => onSetChange(set.id, "reps", value)}
            onCopyPrevious={(prevWeight, prevReps) => {
              onSetChange(set.id, "weight", prevWeight);
              onSetChange(set.id, "reps", prevReps);
            }}
            onDelete={canDelete ? () => onDeleteSet!(set.id) : undefined}
          />
        );
      })}

      {onAddSet && (
        <Pressable
          onPress={() => { hapticPress(); onAddSet(); }}
          accessibilityRole="button"
          accessibilityLabel="Add set"
          style={[styles.addSetButton, { borderColor: colors.border }]}
        >
          <Ionicons name="add" size={16} color={colors.textSecondary} />
          <Text allowFontScaling={false} style={[styles.addSetText, { color: colors.textSecondary }]}>
            Add Set
          </Text>
        </Pressable>
      )}
    </View>
  );
};

function Chip({ icon, label, onPress, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={() => { hapticPress(); onPress(); }}
      style={[styles.chip, { borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text allowFontScaling={false} style={[styles.chipLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flex: 1, gap: 2 },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13 },
  muscleRow: { marginTop: 6 },
  prBadge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prText: { fontSize: 12, fontWeight: "500" },
  chips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipLabel: { fontSize: 12 },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingBottom: 6,
  },
  colLabel: { fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
  setCol: { width: 30 },
  prevCol: { width: 80, textAlign: "center" },
  weightCol: { flex: 1, textAlign: "center" },
  repsCol: { flex: 1, textAlign: "center" },
  doneCol: { width: 32 },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  addSetText: { fontSize: 13, fontWeight: "500" },
});

export default ExerciseCardNew;
