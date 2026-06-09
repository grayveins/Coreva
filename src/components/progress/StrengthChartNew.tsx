/**
 * StrengthChartNew
 *
 * Pure View-based e1RM progression chart for a single exercise.
 * Gold-highlighted PR points. No external chart library.
 * Tap-to-inspect with tooltips showing exact e1RM + date.
 */

import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

type StrengthChartProps = {
  exerciseName: string;
  data: { date: string; e1rm: number }[];
  unit: "lb" | "kg";
  height?: number;
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const DOT_SIZE = 6;
const DOT_SIZE_PR = 10;
const LINE_WIDTH = 2;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const Y_LABEL_COUNT = 5;

// ─── Component ─────────────────────────────────────────────────────────────────

export const StrengthChartNew: React.FC<StrengthChartProps> = ({
  exerciseName,
  data,
  unit,
  height = 200,
}) => {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const chartWidth = containerWidth - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;

  // Identify PR points (running max of e1RM)
  const prIndices = useMemo(() => {
    const indices = new Set<number>();
    let runningMax = 0;
    data.forEach((d, i) => {
      if (d.e1rm > runningMax) {
        runningMax = d.e1rm;
        indices.add(i);
      }
    });
    return indices;
  }, [data]);

  // All-time best
  const allTimeBest = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((best, d) => (d.e1rm > best.e1rm ? d : best), data[0]);
  }, [data]);

  // Current (latest) e1RM
  const current = data.length > 0 ? data[data.length - 1] : null;

  // Compute scales and pixel positions
  const { minY, maxY, yTicks, points } = useMemo(() => {
    if (data.length === 0) {
      return { minY: 0, maxY: 100, yTicks: [], points: [] };
    }

    const values = data.map((d) => d.e1rm);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin || 10;
    const pad = range * 0.15;
    const min = Math.floor((rawMin - pad) / 5) * 5;
    const max = Math.ceil((rawMax + pad) / 5) * 5;

    const step = (max - min) / (Y_LABEL_COUNT - 1);
    const ticks = Array.from({ length: Y_LABEL_COUNT }, (_, i) =>
      Math.round(min + step * i)
    );

    const pts = data.map((d, i) => {
      const xFrac = data.length === 1 ? 0.5 : i / (data.length - 1);
      const yFrac = max === min ? 0.5 : (d.e1rm - min) / (max - min);
      return {
        x: PADDING_LEFT + xFrac * chartWidth,
        y: PADDING_TOP + (1 - yFrac) * chartHeight,
        e1rm: d.e1rm,
        date: d.date,
        isPR: prIndices.has(i),
      };
    });

    return { minY: min, maxY: max, yTicks: ticks, points: pts };
  }, [data, chartWidth, chartHeight, prIndices]);

  // Lines between points
  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      result.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
      });
    }
    return result;
  }, [points]);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text
          allowFontScaling={false}
          style={[styles.emptyText, { color: colors.textMuted }]}
        >
          Log {exerciseName} to see your e1RM trend
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {containerWidth === 0 ? null : (
        <View style={StyleSheet.absoluteFill}>
          {/* Y-axis labels + grid lines */}
          {yTicks.map((tick, i) => {
            const yFrac =
              maxY === minY ? 0.5 : (tick - minY) / (maxY - minY);
            const y = PADDING_TOP + (1 - yFrac) * chartHeight;
            return (
              <React.Fragment key={`y-${i}`}>
                <View
                  style={[
                    styles.gridLine,
                    {
                      top: y,
                      left: PADDING_LEFT,
                      width: chartWidth,
                      backgroundColor: colors.border,
                    },
                  ]}
                />
                <Text
                  allowFontScaling={false}
                  style={[styles.yLabel, { top: y - 7, color: colors.textMuted }]}
                >
                  {tick}
                </Text>
              </React.Fragment>
            );
          })}

          {/* Gradient fill below line */}
          {points.map((pt, i) => {
            const barHeight = PADDING_TOP + chartHeight - pt.y;
            const spacing =
              points.length > 1
                ? (points[points.length - 1].x - points[0].x) /
                  (points.length - 1)
                : 4;
            return (
              <View
                key={`fill-${i}`}
                style={{
                  position: "absolute",
                  left: pt.x - spacing / 2,
                  top: pt.y,
                  width: spacing,
                  height: barHeight,
                  backgroundColor: colors.primary,
                  opacity: 0.06,
                }}
              />
            );
          })}

          {/* Connecting lines */}
          {lines.map((line, i) => {
            const dx = line.x2 - line.x1;
            const dy = line.y2 - line.y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`line-${i}`}
                style={{
                  position: "absolute",
                  left: line.x1,
                  top: line.y1 - LINE_WIDTH / 2,
                  width: length,
                  height: LINE_WIDTH,
                  backgroundColor: colors.primary,
                  borderRadius: LINE_WIDTH / 2,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: "left center",
                }}
              />
            );
          })}

          {/* Data point dots */}
          {points.map((pt, i) => {
            const isSelected = selectedIdx === i;
            const isPR = pt.isPR;
            const isLast = i === points.length - 1;
            const dotSize = isPR || isSelected ? DOT_SIZE_PR : DOT_SIZE;
            const dotColor = isPR ? colors.gold : colors.primary;
            return (
              <Pressable
                key={`dot-${i}`}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
                hitSlop={12}
                style={{
                  position: "absolute",
                  left: pt.x - dotSize / 2,
                  top: pt.y - dotSize / 2,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: isPR || isLast ? dotColor : colors.card,
                  borderWidth: 2,
                  borderColor: dotColor,
                  zIndex: 10,
                }}
              />
            );
          })}

          {/* Tooltip */}
          {selectedIdx !== null && points[selectedIdx] && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(100)}
              style={[
                styles.tooltip,
                {
                  backgroundColor: colors.bgTertiary,
                  borderColor: colors.border,
                  left: Math.min(
                    Math.max(PADDING_LEFT, points[selectedIdx].x - 50),
                    containerWidth - PADDING_RIGHT - 100
                  ),
                  top: points[selectedIdx].y - 52,
                },
              ]}
            >
              <View style={styles.tooltipRow}>
                <Text
                  allowFontScaling={false}
                  style={[styles.tooltipValue, { color: colors.text }]}
                >
                  {points[selectedIdx].e1rm} {unit}
                </Text>
                {points[selectedIdx].isPR && (
                  <Ionicons name="trophy" size={12} color={colors.gold} />
                )}
              </View>
              <Text
                allowFontScaling={false}
                style={[styles.tooltipDate, { color: colors.textMuted }]}
              >
                {format(parseISO(points[selectedIdx].date), "MMM d, yyyy")}
              </Text>
            </Animated.View>
          )}

          {/* X-axis labels */}
          {points.map((pt, i) => {
            if (points.length <= 6 || i % 2 === 0 || i === points.length - 1) {
              return (
                <Text
                  key={`x-${i}`}
                  allowFontScaling={false}
                  style={[
                    styles.xLabel,
                    {
                      left: pt.x - 20,
                      top: PADDING_TOP + chartHeight + 8,
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {format(parseISO(pt.date), "M/d")}
                </Text>
              );
            }
            return null;
          })}
        </View>
      )}

      {/* Header overlay: current e1RM + all-time best */}
      <View style={styles.headerOverlay}>
        <View>
          <Text
            allowFontScaling={false}
            style={[styles.headerLabel, { color: colors.textMuted }]}
          >
            Current e1RM
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.headerValue, { color: colors.text }]}
          >
            {current?.e1rm ?? "-"}{" "}
            <Text style={[styles.headerUnit, { color: colors.textMuted }]}>
              {unit}
            </Text>
          </Text>
        </View>
        {allTimeBest && (
          <View style={styles.headerRight}>
            <View style={styles.prBadge}>
              <Ionicons name="trophy" size={11} color={colors.gold} />
              <Text
                allowFontScaling={false}
                style={[styles.prText, { color: colors.gold }]}
              >
                Best: {allTimeBest.e1rm} {unit}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  empty: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  gridLine: {
    position: "absolute",
    height: StyleSheet.hairlineWidth,
  },
  yLabel: {
    position: "absolute",
    left: 0,
    width: PADDING_LEFT - 6,
    textAlign: "right",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    fontVariant: ["tabular-nums"],
  },
  xLabel: {
    position: "absolute",
    width: 40,
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  tooltip: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 20,
    alignItems: "center",
    minWidth: 100,
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tooltipValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  tooltipDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  headerValue: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  headerUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  prText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
});

export default StrengthChartNew;
