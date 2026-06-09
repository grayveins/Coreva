/**
 * ExerciseGlyph — a small rounded tile with an equipment-based icon, used as
 * a visual anchor on exercise rows (we don't carry exercise thumbnails).
 * Differentiates the common equipment types; generic barbell otherwise.
 */

import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";

type Props = {
  equipment?: string | null;
  size?: number;
  /** Tile background; defaults to bgSecondary. */
  tint?: string;
  style?: ViewStyle;
};

export function ExerciseGlyph({ equipment, size = 38, tint, style }: Props) {
  const { colors } = useTheme();
  const e = (equipment ?? "").toLowerCase();
  const iconSize = Math.round(size * 0.5);
  const color = colors.text;

  let icon: React.ReactNode;
  if (e.includes("dumbbell")) {
    icon = <MaterialCommunityIcons name="dumbbell" size={iconSize} color={color} />;
  } else if (e.includes("kettle")) {
    icon = <MaterialCommunityIcons name="kettlebell" size={iconSize} color={color} />;
  } else if (e.includes("body") || e.includes("bodyweight")) {
    icon = <Ionicons name="body-outline" size={iconSize} color={color} />;
  } else if (e.includes("band")) {
    icon = <MaterialCommunityIcons name="vector-line" size={iconSize} color={color} />;
  } else {
    // barbell, machine, cable, smith, other → generic barbell
    icon = <Ionicons name="barbell-outline" size={iconSize} color={color} />;
  }

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: tint ?? colors.bgSecondary },
        style,
      ]}
    >
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

export default ExerciseGlyph;
