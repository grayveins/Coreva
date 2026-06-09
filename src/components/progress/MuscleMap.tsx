/**
 * MuscleMap
 *
 * Front + back body silhouettes with muscle highlights overlaid.
 * Each muscle image is layered on top of the base silhouette
 * with opacity proportional to training volume.
 *
 * Uses the actual muscle highlight images from assets/muscles/.
 */

import React, { useMemo } from "react";
import { View, Image, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import { MUSCLE_IMAGES, BODY_SILHOUETTES } from "@/src/constants/muscles";

export type MuscleGroupData = {
  muscle: string;
  intensity: number; // 0-1
};

type MuscleMapProps = {
  data: MuscleGroupData[];
};

// Which muscle images go on which view
const FRONT_MUSCLES = ["chest", "front-delts", "biceps", "abs", "obliques", "quads"];
const BACK_MUSCLES = ["lats", "lowerback", "rear-delts", "triceps", "glutes", "hamstrings", "calves"];

// Map display-level muscle names to image keys
const MUSCLE_NAME_TO_IMAGE: Record<string, string> = {
  chest: "chest",
  shoulders: "front-delts",
  "front delts": "front-delts",
  "side delts": "front-delts",
  "rear delts": "rear-delts",
  biceps: "biceps",
  arms: "biceps", // arms → biceps front + triceps back
  triceps: "triceps",
  back: "lats",
  lats: "lats",
  "upper back": "lats",
  "lower back": "lowerback",
  core: "abs",
  abs: "abs",
  obliques: "obliques",
  quads: "quads",
  legs: "quads", // legs → quads front + hamstrings back
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
};

// For "Arms" and "Legs" display groups, map to both front+back images
const COMPOUND_GROUPS: Record<string, string[]> = {
  arms: ["biceps", "triceps"],
  legs: ["quads", "hamstrings", "calves"],
};

const BODY_WIDTH = (Dimensions.get("window").width - 80) / 2; // Two bodies side by side with padding
const BODY_HEIGHT = BODY_WIDTH * 1.55; // Aspect ratio of the body images

export const MuscleMap: React.FC<MuscleMapProps> = ({ data }) => {
  const { colors } = useTheme();

  // Build a map from image key → intensity (0-1)
  const intensityMap = useMemo(() => {
    const map = new Map<string, number>();

    data.forEach(({ muscle, intensity }) => {
      const lower = muscle.toLowerCase();

      // Check if this is a compound group (Arms, Legs)
      const compounds = COMPOUND_GROUPS[lower];
      if (compounds) {
        compounds.forEach((imgKey) => {
          const existing = map.get(imgKey) || 0;
          map.set(imgKey, Math.max(existing, intensity));
        });
        return;
      }

      const imgKey = MUSCLE_NAME_TO_IMAGE[lower];
      if (imgKey) {
        const existing = map.get(imgKey) || 0;
        map.set(imgKey, Math.max(existing, intensity));
      }
    });

    return map;
  }, [data]);

  // Build legend data sorted by intensity
  const legend = useMemo(() => {
    return data
      .filter((d) => d.intensity > 0)
      .sort((a, b) => b.intensity - a.intensity)
      .map((d) => ({
        label: d.muscle,
        intensity: d.intensity,
      }));
  }, [data]);

  const renderBody = (view: "front" | "back") => {
    const baseSilhouette = view === "front" ? BODY_SILHOUETTES.front : BODY_SILHOUETTES.back;
    const muscleKeys = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;

    return (
      <View style={[styles.bodyContainer, { width: BODY_WIDTH, height: BODY_HEIGHT }]}>
        {/* Base silhouette */}
        <Image
          source={baseSilhouette}
          style={[styles.bodyImage, { width: BODY_WIDTH, height: BODY_HEIGHT }]}
          resizeMode="contain"
        />

        {/* Muscle overlays */}
        {muscleKeys.map((imgKey) => {
          const intensity = intensityMap.get(imgKey) || 0;
          if (intensity === 0) return null;

          const imageSource = MUSCLE_IMAGES[imgKey as keyof typeof MUSCLE_IMAGES];
          if (!imageSource) return null;

          // Min opacity 0.3, max 1.0 for visible muscles
          const opacity = 0.3 + intensity * 0.7;

          return (
            <Animated.View
              key={imgKey}
              entering={FadeIn.delay(100).duration(400)}
              style={[styles.overlay, { opacity }]}
            >
              <Image
                source={imageSource}
                style={[styles.bodyImage, { width: BODY_WIDTH, height: BODY_HEIGHT }]}
                resizeMode="contain"
              />
            </Animated.View>
          );
        })}

        {/* View label */}
        <Text allowFontScaling={false} style={[styles.viewLabel, { color: colors.textMuted }]}>
          {view === "front" ? "Front" : "Back"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Body views side by side */}
      <View style={styles.bodiesRow}>
        {renderBody("front")}
        {renderBody("back")}
      </View>

      {/* Legend - compact horizontal bars */}
      {legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <Text
                allowFontScaling={false}
                style={[styles.legendLabel, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <View style={[styles.legendBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.legendBarFill,
                    {
                      width: `${item.intensity * 100}%`,
                      backgroundColor: colors.primary,
                      opacity: 0.4 + item.intensity * 0.6,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  bodiesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  bodyContainer: {
    position: "relative",
  },
  bodyImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  viewLabel: {
    position: "absolute",
    bottom: -2,
    alignSelf: "center",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  // Legend
  legend: {
    width: "100%",
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendLabel: {
    width: 90,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  legendBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  legendBarFill: {
    height: "100%",
    borderRadius: 2,
  },
});

export default MuscleMap;
