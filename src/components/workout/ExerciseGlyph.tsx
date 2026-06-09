/**
 * ExerciseGlyph — a small rounded tile with an equipment-based icon, used as
 * a visual anchor on exercise rows (we don't carry exercise thumbnails).
 * Differentiates the common equipment types; generic barbell otherwise.
 */

import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { EquipmentIcon } from "./EquipmentIcon";

type Props = {
  equipment?: string | null;
  size?: number;
  /** Tile background; defaults to bgSecondary. */
  tint?: string;
  style?: ViewStyle;
};

export function ExerciseGlyph({ equipment, size = 38, tint, style }: Props) {
  const { colors } = useTheme();
  const iconSize = Math.round(size * 0.56);

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: tint ?? colors.bgSecondary },
        style,
      ]}
    >
      <EquipmentIcon equipment={equipment} size={iconSize} color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

export default ExerciseGlyph;
