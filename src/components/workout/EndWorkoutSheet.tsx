/**
 * EndWorkoutSheet - confirm-on-end bottom sheet for active workouts.
 *
 * Two modes, set by the caller:
 *   - normal  → user logged ≥1 set; show big X / Y hero + Save & Finish.
 *   - empty   → no sets logged at all; show Discard prompt.
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  mode: "normal" | "empty";
  completedSets: number;
  totalSets: number;
  skippedExercises: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export const EndWorkoutSheet: React.FC<Props> = ({
  visible,
  mode,
  completedSets,
  totalSets,
  skippedExercises,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();
  const isEmpty = mode === "empty";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={[styles.sheet, { backgroundColor: colors.bg }]}
        >
          <Animated.View entering={FadeIn.duration(180)}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
              {isEmpty ? "Discard workout?" : "Finish workout?"}
            </Text>

            {isEmpty ? (
              <Text
                allowFontScaling={false}
                style={[styles.emptyBody, { color: colors.textMuted }]}
              >
                No sets logged yet - nothing to save.
              </Text>
            ) : (
              <View style={styles.heroBlock}>
                <View style={styles.ratioRow}>
                  <Text
                    allowFontScaling={false}
                    style={[styles.bigNum, { color: colors.text }]}
                  >
                    {completedSets}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    style={[styles.slash, { color: colors.textMuted }]}
                  >
                    /
                  </Text>
                  <Text
                    allowFontScaling={false}
                    style={[styles.bigNum, { color: colors.textMuted }]}
                  >
                    {totalSets}
                  </Text>
                </View>
                <Text
                  allowFontScaling={false}
                  style={[styles.heroCaption, { color: colors.textMuted }]}
                >
                  sets completed
                </Text>
                {skippedExercises > 0 && (
                  <Text
                    allowFontScaling={false}
                    style={[styles.skipCaption, { color: colors.textMuted }]}
                  >
                    {skippedExercises} exercise{skippedExercises === 1 ? "" : "s"} skipped
                  </Text>
                )}
              </View>
            )}

            <Pressable
              onPress={onConfirm}
              style={[styles.primaryBtn, { backgroundColor: colors.text }]}
              accessibilityRole="button"
              accessibilityLabel={isEmpty ? "Discard" : "Save & Finish"}
            >
              <Text allowFontScaling={false} style={[styles.primaryText, { color: colors.bg }]}>
                {isEmpty ? "Discard" : "Save & Finish"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              style={styles.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text
                allowFontScaling={false}
                style={[styles.cancelText, { color: colors.textMuted }]}
              >
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  ratioRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  bigNum: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  slash: {
    fontSize: 32,
    fontFamily: "Inter_400Regular",
  },
  heroCaption: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  skipCaption: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

export default EndWorkoutSheet;
