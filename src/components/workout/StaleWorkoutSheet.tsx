/**
 * StaleWorkoutSheet - shown on app launch when a persisted workout draft is
 * "stale": left running for hours, or started on an earlier calendar day.
 *
 * Leaving a workout running forever is counterintuitive, so instead of
 * silently resuming we ask what to do. Saving caps the duration to the real
 * activity window (see `computeSessionTimestamps`).
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  /** Human-readable age of the draft, e.g. "yesterday" or "3 days ago". */
  startedLabel: string;
  title: string;
  completedSets: number;
  onResume: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

export const StaleWorkoutSheet: React.FC<Props> = ({
  visible,
  startedLabel,
  title,
  completedSets,
  onResume,
  onSave,
  onDiscard,
}) => {
  const { colors } = useTheme();
  const canSave = completedSets > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onResume}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onResume} />
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={[styles.sheet, { backgroundColor: colors.bg }]}
        >
          <Animated.View entering={FadeIn.duration(180)}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
              Still working out?
            </Text>
            <Text allowFontScaling={false} style={[styles.body, { color: colors.textMuted }]}>
              “{title}” has been running since {startedLabel}.{" "}
              {canSave
                ? `You logged ${completedSets} set${completedSets === 1 ? "" : "s"}.`
                : "No sets were logged."}
            </Text>

            {canSave && (
              <Pressable
                onPress={onSave}
                style={[styles.primaryBtn, { backgroundColor: colors.text }]}
                accessibilityRole="button"
                accessibilityLabel="Save & Finish"
              >
                <Text allowFontScaling={false} style={[styles.primaryText, { color: colors.bg }]}>
                  Save &amp; finish
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onResume}
              style={[
                styles.secondaryBtn,
                { borderColor: colors.border },
                !canSave && { backgroundColor: colors.text, borderColor: colors.text },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Resume workout"
            >
              <Text
                allowFontScaling={false}
                style={[styles.secondaryText, { color: canSave ? colors.text : colors.bg }]}
              >
                Resume
              </Text>
            </Pressable>

            <Pressable
              onPress={onDiscard}
              style={styles.discardBtn}
              accessibilityRole="button"
              accessibilityLabel="Discard workout"
            >
              <Text allowFontScaling={false} style={[styles.discardText, { color: colors.textMuted }]}>
                Discard
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.lg },
  title: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  primaryBtn: { height: 52, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  secondaryText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  discardBtn: { height: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  discardText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

export default StaleWorkoutSheet;
