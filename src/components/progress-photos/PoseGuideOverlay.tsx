/**
 * Camera overlay matching Trainerize's pose guide:
 *  - Pose name (orange) top-left
 *  - Top-center label (Nose / Center of head)
 *  - Full-height vertical centerline
 *  - Two full-width horizontal lines (Eyes/Ears, Hip), each with the label
 *    sitting at the left edge directly on the line
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ProgressPose } from "@/src/lib/progressPhotos";

const LINE_COLOR = "rgba(255, 255, 255, 0.7)";
const LABEL_COLOR = "rgba(255, 255, 255, 0.9)";
const POSE_LABEL_COLOR = "#000000";

const POSE_LABELS: Record<ProgressPose, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  other: "Other",
};

const TOP_LABEL: Record<ProgressPose, string> = {
  front: "Nose",
  side: "Center of head",
  back: "Center of head",
  other: "",
};

const HORIZONTAL_LINE_LABEL_TOP: Record<ProgressPose, string> = {
  front: "Eyes",
  side: "Eyes",
  back: "Ears",
  other: "",
};

// Y positions as fraction of the camera area height
const EYES_Y = 0.30;
const HIP_Y = 0.70;

export function PoseGuideOverlay({ pose }: { pose: ProgressPose }) {
  const insets = useSafeAreaInsets();
  // Push the top labels below the iPhone status bar / Dynamic Island.
  const topOffset = insets.top + 12;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Top-left pose label (clear of the status bar) */}
      <View style={[styles.topLeft, { top: topOffset }]}>
        <Text style={[styles.poseLabel, { color: POSE_LABEL_COLOR }]}>
          {POSE_LABELS[pose]}
        </Text>
      </View>

      {/* Top-center label (Nose / Center of head) */}
      {TOP_LABEL[pose] ? (
        <View style={[styles.topCenter, { top: topOffset }]}>
          <Text style={styles.guideLabel}>{TOP_LABEL[pose]}</Text>
        </View>
      ) : null}

      {/* Vertical centerline - full height */}
      <View style={styles.verticalLine} />

      {/* Eyes / Ears horizontal line */}
      <HorizontalGuide
        label={HORIZONTAL_LINE_LABEL_TOP[pose]}
        topPercent={EYES_Y}
      />

      {/* Hip horizontal line */}
      <HorizontalGuide label="Hip" topPercent={HIP_Y} />
    </View>
  );
}

function HorizontalGuide({
  label,
  topPercent,
}: {
  label: string;
  topPercent: number;
}) {
  return (
    <View
      style={[
        styles.horizontalRow,
        { top: `${topPercent * 100}%` },
      ]}
    >
      <View style={styles.horizontalLine} />
      <Text style={styles.horizontalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    left: 16,
  },
  topCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  poseLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  guideLabel: {
    color: LABEL_COLOR,
    fontSize: 14,
  },
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: StyleSheet.hairlineWidth + 0.5,
    backgroundColor: LINE_COLOR,
  },
  // Horizontal rows are absolutely positioned. The line spans full width
  // behind the label, and the label text floats just above it on the left.
  horizontalRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 0,
    justifyContent: "center",
  },
  horizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth + 0.5,
    backgroundColor: LINE_COLOR,
  },
  horizontalLabel: {
    position: "absolute",
    left: 16,
    top: -22, // sits just above the line
    color: LABEL_COLOR,
    fontSize: 14,
  },
});
