/**
 * DiscardWorkoutSheet - themed confirm before discarding an in-progress
 * workout. Replaces the default iOS Alert.alert that the action layer
 * used to fire from `discardWorkout()`.
 *
 * Visual language matches `EndWorkoutSheet` so the two confirms feel
 * like the same component family.
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DiscardWorkoutSheet: React.FC<Props> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();

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
              Discard workout?
            </Text>
            <Text allowFontScaling={false} style={[styles.body, { color: colors.textMuted }]}>
              Your in-progress sets won&apos;t be saved. This can&apos;t be undone.
            </Text>

            <Pressable
              onPress={onConfirm}
              style={[styles.primaryBtn, { backgroundColor: colors.text }]}
              accessibilityRole="button"
              accessibilityLabel="Discard"
            >
              <Text allowFontScaling={false} style={[styles.primaryText, { color: colors.bg }]}>
                Discard
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
    marginBottom: 6,
  },
  body: {
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

export default DiscardWorkoutSheet;
