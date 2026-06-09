/**
 * CalorieRing - minimalist circular progress ring with centered hero text.
 *
 * Pure visual: parent supplies the value/label and the 0..1 progress.
 * Monochrome - track color = colors.border, fill = colors.text. No gradients,
 * no rounded caps that look "designed" - just a clean stroke that meets the
 * Cal AI / Linear quality bar.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/src/context/ThemeContext";

type Props = {
  /** Diameter in pixels. */
  size?: number;
  /** Stroke thickness. */
  strokeWidth?: number;
  /** 0..1 - fraction of the ring filled. Clamped. */
  progress: number;
  /** Big number in the center (e.g. "2,800"). */
  value: string;
  /** Caption under the number (e.g. "daily target"). */
  caption?: string;
  /** Tiny line above the number (e.g. "calories"). Optional. */
  eyebrow?: string;
};

export const CalorieRing: React.FC<Props> = ({
  size = 220,
  strokeWidth = 12,
  progress,
  value,
  caption,
  eyebrow,
}) => {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashOffset = c * (1 - clamped);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill - rotated -90deg so it grows from 12 o'clock */}
        {clamped > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.text}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {eyebrow && (
          <Text
            allowFontScaling={false}
            style={[styles.eyebrow, { color: colors.textMuted }]}
          >
            {eyebrow}
          </Text>
        )}
        <Text
          allowFontScaling={false}
          style={[styles.value, { color: colors.text }]}
        >
          {value}
        </Text>
        {caption && (
          <Text
            allowFontScaling={false}
            style={[styles.caption, { color: colors.textMuted }]}
          >
            {caption}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  value: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  caption: { fontSize: 13, fontFamily: "Inter_400Regular" },
});

export default CalorieRing;
