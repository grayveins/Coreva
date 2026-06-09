/**
 * SetRowNew - Minimal set row (Hevy/Trainerize table style)
 * Simple row: set# | previous | reps | weight | checkbox
 * Swipe left to delete (uncompleted sets only).
 */

import React, { useCallback, useRef } from "react";
import { StyleSheet, View, Text, TextInput, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";

type SetRowNewProps = {
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  previousWeight?: string;
  previousReps?: string;
  onComplete: () => void;
  onWeightChange: (weight: string) => void;
  onRepsChange: (reps: string) => void;
  /** Tap-to-fill from PREVIOUS column. Called with the previous
   *  weight/reps when the user taps the cell. */
  onCopyPrevious?: (weight: string, reps: string) => void;
  /** Swipe-to-delete handler. Omit to disable swipe (e.g. when this is
   *  the only set in the exercise). Completed sets refuse deletion at
   *  the action layer; the swipe still opens but the action no-ops. */
  onDelete?: () => void;
  disabled?: boolean;
  isPR?: boolean;
  closeToPR?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SetRowNew: React.FC<SetRowNewProps> = ({
  setNumber,
  weight,
  reps,
  completed,
  previousWeight,
  previousReps,
  onComplete,
  onWeightChange,
  onRepsChange,
  onCopyPrevious,
  onDelete,
  disabled = false,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const swipeRef = useRef<Swipeable | null>(null);

  const handleComplete = useCallback(() => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.97, { duration: 60 }),
      withTiming(1, { duration: 100 })
    );
    onComplete();
  }, [disabled, onComplete]);

  const handleSwipeDelete = useCallback(() => {
    swipeRef.current?.close();
    if (onDelete) onDelete();
  }, [onDelete]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const prevText = (previousWeight && previousReps)
    ? `${String(previousReps)} × ${String(previousWeight)}`
    : "-";

  // Completed sets aren't deletable - Swipeable is bypassed entirely so
  // there's no flicker / no half-open state.
  const swipeEnabled = !!onDelete && !completed && !disabled;

  // Full-height transparent pane; the inner Pressable centers the icon
  // vertically against whatever the row resolves to. No background, no
  // colored fill - the swipe gesture itself is the affordance.
  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <Pressable
        onPress={handleSwipeDelete}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Delete set ${setNumber}`}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  const rowContent = (
    <AnimatedPressable
      onPress={handleComplete}
      disabled={disabled}
      style={[
        styles.row,
        rowStyle,
        // Opaque base so the Swipeable's Delete action stays hidden behind
        // the row until the user drags it into view. Without this, the
        // red Delete bleeds through during the swipe.
        { backgroundColor: completed ? colors.successMuted : colors.card },
      ]}
    >
      {/* Set number */}
      <Text
        allowFontScaling={false}
        style={[styles.setNum, { color: colors.textMuted }]}
      >
        {setNumber}
      </Text>

      {/* Previous - tap to copy into current set's weight + reps. */}
      <Pressable
        onPress={(e) => {
          // Stop propagation so tapping doesn't toggle the row's completion.
          e.stopPropagation?.();
          if (
            !onCopyPrevious ||
            disabled ||
            completed ||
            !previousWeight ||
            !previousReps
          ) {
            return;
          }
          onCopyPrevious(previousWeight, previousReps);
        }}
        hitSlop={6}
        style={styles.prevWrap}
        accessibilityRole="button"
        accessibilityLabel={
          previousWeight && previousReps
            ? `Copy previous set: ${previousReps} reps at ${previousWeight} pounds`
            : "No previous set"
        }
        disabled={disabled || completed || !previousWeight || !previousReps}
      >
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.prev, { color: colors.textMuted }]}
        >
          {prevText}
        </Text>
      </Pressable>

      {/* Reps input - placed before weight per coach preference (rep target drives the set) */}
      <TextInput
        value={reps}
        onChangeText={onRepsChange}
        placeholder={previousReps ? String(previousReps) : "-"}
        placeholderTextColor={colors.inputPlaceholder}
        keyboardType="numeric"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: completed ? "transparent" : colors.border,
            backgroundColor: completed ? "transparent" : colors.bg,
          },
        ]}
        editable={!completed && !disabled}
        selectTextOnFocus
        allowFontScaling={false}
      />

      {/* Weight input */}
      <TextInput
        value={weight}
        onChangeText={onWeightChange}
        placeholder={previousWeight ? String(previousWeight) : "-"}
        placeholderTextColor={colors.inputPlaceholder}
        keyboardType="numeric"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: completed ? "transparent" : colors.border,
            backgroundColor: completed ? "transparent" : colors.bg,
          },
        ]}
        editable={!completed && !disabled}
        selectTextOnFocus
        allowFontScaling={false}
      />

      {/* Checkbox */}
      <View style={styles.checkWrap}>
        {completed ? (
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        ) : (
          <View style={[styles.emptyCheck, { borderColor: colors.border }]} />
        )}
      </View>
    </AnimatedPressable>
  );

  if (!swipeEnabled) return rowContent;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={32}
      overshootRight={false}
    >
      {rowContent}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  setNum: {
    width: 30,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  prevWrap: {
    width: 80,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  prev: {
    fontSize: 12,
    textAlign: "center",
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
  },
  checkWrap: {
    width: 32,
    alignItems: "center",
  },
  emptyCheck: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  deleteAction: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SetRowNew;
