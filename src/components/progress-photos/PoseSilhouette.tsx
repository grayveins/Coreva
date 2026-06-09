/**
 * Minimal silhouettes for the pose intro card. Each shows a stylized
 * figure with the same Eyes/Hip guide lines that will appear in the
 * camera overlay, so the client knows what to align.
 */

import React from "react";
import Svg, { Circle, G, Line, Rect } from "react-native-svg";

import type { ProgressPose } from "@/src/lib/progressPhotos";

const W = 200;
const H = 280;
const STROKE = "#000";
const GUIDE = "#9CA3AF";

const HEAD_R = 22;
const HEAD_CY = 50;
const EYES_Y = 50;
const HIP_Y = 175;
const TORSO_TOP = HEAD_CY + HEAD_R + 4;
const TORSO_BOTTOM = HIP_Y;

export function PoseSilhouette({ pose }: { pose: ProgressPose }) {
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {pose === "front" && <FrontFigure />}
      {pose === "side" && <SideFigure />}
      {pose === "back" && <BackFigure />}

      {/* Eyes guide line */}
      <Line x1={4} y1={EYES_Y} x2={W - 4} y2={EYES_Y} stroke={GUIDE} strokeWidth={1} />
      {/* Hip guide line */}
      <Line x1={4} y1={HIP_Y} x2={W - 4} y2={HIP_Y} stroke={GUIDE} strokeWidth={1} />
    </Svg>
  );
}

function FrontFigure() {
  const cx = W / 2;
  return (
    <G>
      {/* Head */}
      <Circle cx={cx} cy={HEAD_CY} r={HEAD_R} stroke={STROKE} strokeWidth={1.5} fill="none" />
      {/* Eyes (just two dots so it reads as "facing forward") */}
      <Circle cx={cx - 7} cy={EYES_Y} r={1.5} fill={STROKE} />
      <Circle cx={cx + 7} cy={EYES_Y} r={1.5} fill={STROKE} />
      {/* Torso */}
      <Rect
        x={cx - 35}
        y={TORSO_TOP}
        width={70}
        height={TORSO_BOTTOM - TORSO_TOP}
        rx={14}
        stroke={STROKE}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Arms */}
      <Line x1={cx - 35} y1={TORSO_TOP + 18} x2={cx - 60} y2={HIP_Y - 10} stroke={STROKE} strokeWidth={1.5} />
      <Line x1={cx + 35} y1={TORSO_TOP + 18} x2={cx + 60} y2={HIP_Y - 10} stroke={STROKE} strokeWidth={1.5} />
      {/* Legs */}
      <Line x1={cx - 14} y1={HIP_Y} x2={cx - 18} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
      <Line x1={cx + 14} y1={HIP_Y} x2={cx + 18} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
    </G>
  );
}

function BackFigure() {
  const cx = W / 2;
  return (
    <G>
      {/* Head - no facial features */}
      <Circle cx={cx} cy={HEAD_CY} r={HEAD_R} stroke={STROKE} strokeWidth={1.5} fill="none" />
      {/* Torso */}
      <Rect
        x={cx - 35}
        y={TORSO_TOP}
        width={70}
        height={TORSO_BOTTOM - TORSO_TOP}
        rx={14}
        stroke={STROKE}
        strokeWidth={1.5}
        fill="none"
      />
      {/* Centerline (spine) */}
      <Line x1={cx} y1={TORSO_TOP + 4} x2={cx} y2={TORSO_BOTTOM - 4} stroke={STROKE} strokeWidth={0.8} strokeDasharray="3,3" />
      {/* Arms */}
      <Line x1={cx - 35} y1={TORSO_TOP + 18} x2={cx - 60} y2={HIP_Y - 10} stroke={STROKE} strokeWidth={1.5} />
      <Line x1={cx + 35} y1={TORSO_TOP + 18} x2={cx + 60} y2={HIP_Y - 10} stroke={STROKE} strokeWidth={1.5} />
      {/* Legs */}
      <Line x1={cx - 14} y1={HIP_Y} x2={cx - 18} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
      <Line x1={cx + 14} y1={HIP_Y} x2={cx + 18} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
    </G>
  );
}

function SideFigure() {
  const cx = W / 2;
  return (
    <G>
      {/* Head */}
      <Circle cx={cx} cy={HEAD_CY} r={HEAD_R} stroke={STROKE} strokeWidth={1.5} fill="none" />
      {/* Nose protrusion (a small dot to the right) */}
      <Circle cx={cx + HEAD_R + 1} cy={EYES_Y + 2} r={2} fill={STROKE} />
      {/* Single eye visible (profile) */}
      <Circle cx={cx + 4} cy={EYES_Y} r={1.5} fill={STROKE} />
      {/* Torso, slimmer in profile */}
      <Rect
        x={cx - 18}
        y={TORSO_TOP}
        width={36}
        height={TORSO_BOTTOM - TORSO_TOP}
        rx={10}
        stroke={STROKE}
        strokeWidth={1.5}
        fill="none"
      />
      {/* One visible arm (front) */}
      <Line x1={cx + 6} y1={TORSO_TOP + 16} x2={cx + 16} y2={HIP_Y - 6} stroke={STROKE} strokeWidth={1.5} />
      {/* Legs side-on (slight offset) */}
      <Line x1={cx - 4} y1={HIP_Y} x2={cx - 6} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
      <Line x1={cx + 6} y1={HIP_Y} x2={cx + 8} y2={H - 30} stroke={STROKE} strokeWidth={1.5} />
    </G>
  );
}
