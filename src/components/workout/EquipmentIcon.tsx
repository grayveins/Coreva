/**
 * EquipmentIcon — custom line icons for gym equipment, since the standard
 * icon libraries have no machine / cable / smith / bench glyphs. Drawn from
 * simple SVG primitives (24x24 viewBox), Trainerize-style, monochrome.
 */

import React from "react";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

export type EquipmentKind =
  | "dumbbell"
  | "barbell"
  | "machine"
  | "cable"
  | "smith"
  | "bench"
  | "kettlebell"
  | "bands"
  | "ball"
  | "bodyweight";

export function equipmentKind(equipment?: string | null): EquipmentKind {
  const e = (equipment ?? "").toLowerCase();
  if (e.includes("smith")) return "smith";
  if (e.includes("machine")) return "machine";
  if (e.includes("cable")) return "cable";
  if (e.includes("dumbbell")) return "dumbbell";
  if (e.includes("kettle")) return "kettlebell";
  if (e.includes("band")) return "bands";
  if (e.includes("ball")) return "ball";
  if (e.includes("bench")) return "bench";
  if (e.includes("body")) return "bodyweight";
  // barbell, e-z curl bar, other, foam roll, etc. -> generic barbell
  return "barbell";
}

type Props = {
  equipment?: string | null;
  /** Or pass an explicit kind to skip string matching. */
  kind?: EquipmentKind;
  size?: number;
  color?: string;
};

export function EquipmentIcon({ equipment, kind, size = 20, color = "#000" }: Props) {
  const k = kind ?? equipmentKind(equipment);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {ICONS[k]}
      </G>
    </Svg>
  );
}

const ICONS: Record<EquipmentKind, React.ReactNode> = {
  // short bar + a plate block on each end
  dumbbell: (
    <>
      <Line x1={8} y1={12} x2={16} y2={12} strokeWidth={2} />
      <Line x1={6} y1={8.5} x2={6} y2={15.5} />
      <Line x1={8.5} y1={9.5} x2={8.5} y2={14.5} />
      <Line x1={18} y1={8.5} x2={18} y2={15.5} />
      <Line x1={15.5} y1={9.5} x2={15.5} y2={14.5} />
    </>
  ),
  // long bar with plates inset from the ends
  barbell: (
    <>
      <Line x1={3} y1={12} x2={21} y2={12} />
      <Line x1={7} y1={8} x2={7} y2={16} strokeWidth={2} />
      <Line x1={9} y1={9.5} x2={9} y2={14.5} />
      <Line x1={17} y1={8} x2={17} y2={16} strokeWidth={2} />
      <Line x1={15} y1={9.5} x2={15} y2={14.5} />
    </>
  ),
  // weight stack
  machine: (
    <>
      <Rect x={8} y={5} width={8} height={13} rx={1.2} />
      <Line x1={9.5} y1={8} x2={14.5} y2={8} />
      <Line x1={9.5} y1={10.5} x2={14.5} y2={10.5} />
      <Line x1={9.5} y1={13} x2={14.5} y2={13} />
      <Line x1={12} y1={18} x2={12} y2={21} />
    </>
  ),
  // overhead pulley + straight-bar handle
  cable: (
    <>
      <Line x1={8} y1={4} x2={16} y2={4} />
      <Circle cx={12} cy={6.5} r={2.2} />
      <Line x1={12} y1={8.7} x2={12} y2={16} />
      <Line x1={8.5} y1={16} x2={15.5} y2={16} strokeWidth={2} />
    </>
  ),
  // barbell inside a vertical frame
  smith: (
    <>
      <Line x1={6} y1={3} x2={6} y2={21} />
      <Line x1={18} y1={3} x2={18} y2={21} />
      <Line x1={4} y1={12} x2={20} y2={12} />
      <Line x1={9} y1={9.5} x2={9} y2={14.5} strokeWidth={2} />
      <Line x1={15} y1={9.5} x2={15} y2={14.5} strokeWidth={2} />
    </>
  ),
  // flat bench with legs
  bench: (
    <>
      <Rect x={4} y={9.5} width={16} height={3} rx={1.5} />
      <Line x1={7} y1={12.5} x2={6} y2={18} />
      <Line x1={17} y1={12.5} x2={18} y2={18} />
    </>
  ),
  // bell body + squared handle
  kettlebell: (
    <>
      <Path d="M9.5 11 V9 a2.5 2.5 0 0 1 5 0 V11" />
      <Circle cx={12} cy={15} r={4.2} />
    </>
  ),
  // resistance band: wave with end grips
  bands: (
    <>
      <Path d="M5 12 q3 -5 6 0 q3 5 6 0 q3 -5 6 0" />
    </>
  ),
  // medicine / exercise ball
  ball: (
    <>
      <Circle cx={12} cy={12} r={7} />
      <Path d="M5.5 10 q6.5 3 13 0" />
      <Path d="M5.5 14 q6.5 -3 13 0" />
    </>
  ),
  // simple figure
  bodyweight: (
    <>
      <Circle cx={12} cy={5.5} r={2.2} />
      <Line x1={12} y1={8} x2={12} y2={15} />
      <Line x1={7} y1={11} x2={17} y2={11} />
      <Line x1={12} y1={15} x2={9} y2={20} />
      <Line x1={12} y1={15} x2={15} y2={20} />
    </>
  ),
};

export default EquipmentIcon;
