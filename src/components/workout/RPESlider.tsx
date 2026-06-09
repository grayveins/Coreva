/**
 * RPESlider - Inline Rate of Perceived Exertion selector
 *
 * 10 tappable dots with color gradient:
 *   1-3 = success (green/easy)
 *   4-6 = warning (yellow/moderate)
 *   7-8 = intensity (orange/hard)
 *   9-10 = error (red/maximal)
 *
 * 32pt touch targets (40pt when selected). Haptic on tap.
 * Compact mode: smaller dots, no descriptor labels.
 */

import React, { useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";

type RPESliderProps = {
  value: number | null;
  onChange: (rpe: number) => void;
  compact?: boolean;
};

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const RPE_DESCRIPTORS: Record<number, string> = {
  1: "Easy",
  2: "Easy",
  3: "Light",
  4: "Moderate",
  5: "Moderate",
  6: "Hard",
  7: "Hard",
  8: "Very Hard",
  9: "Near Max",
  10: "Max Effort",
};

function useRPEColor(rpe: number) {
  const { colors } = useTheme();
  if (rpe <= 3) return colors.success;
  if (rpe <= 6) return colors.warning;
  if (rpe <= 8) return colors.intensity;
  return colors.error;
}

const RPEDot: React.FC<{
  rpe: number;
  isSelected: boolean;
  compact: boolean;
  onPress: (rpe: number) => void;
}> = ({ rpe, isSelected, compact, onPress }) => {
  const { colors } = useTheme();
  const color = useRPEColor(rpe);

  const dotSize = compact ? (isSelected ? 28 : 22) : (isSelected ? 40 : 32);
  const fontSize = compact ? 10 : 12;

  return (
    <Pressable
      onPress={() => onPress(rpe)}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={styles.dotTouchArea}
    >
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: isSelected ? color : "transparent",
            borderColor: isSelected ? color : colors.border,
            borderWidth: isSelected ? 0 : 1.5,
          },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={[
            styles.dotText,
            {
              fontSize,
              color: isSelected ? "#FFFFFF" : colors.textMuted,
              fontWeight: isSelected ? "700" : "500",
            },
          ]}
        >
          {rpe}
        </Text>
      </View>
    </Pressable>
  );
};

export const RPESlider: React.FC<RPESliderProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(
    (rpe: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(rpe);
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      {/* Label */}
      {!compact && (
        <Text
          allowFontScaling={false}
          style={[styles.label, { color: colors.textSecondary }]}
        >
          How hard was that?
        </Text>
      )}

      {/* Dots row */}
      <View style={styles.dotsRow}>
        {RPE_VALUES.map((rpe) => (
          <RPEDot
            key={rpe}
            rpe={rpe}
            isSelected={value === rpe}
            compact={compact}
            onPress={handlePress}
          />
        ))}
      </View>

      {/* Descriptor labels */}
      {!compact && (
        <View style={styles.descriptorRow}>
          <Text
            allowFontScaling={false}
            style={[styles.descriptor, { color: colors.success }]}
          >
            Easy
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.descriptor, { color: colors.warning }]}
          >
            Moderate
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.descriptor, { color: colors.error }]}
          >
            Max Effort
          </Text>
        </View>
      )}

      {/* Selected descriptor */}
      {value && !compact && (
        <Text
          allowFontScaling={false}
          style={[styles.selectedDescriptor, { color: colors.textSecondary }]}
        >
          RPE {value} - {RPE_DESCRIPTORS[value]}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotTouchArea: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 40,
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontFamily: "Inter_600SemiBold",
  },
  descriptorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  descriptor: {
    fontSize: 10,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  selectedDescriptor: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: spacing.sm,
  },
});

export default RPESlider;
