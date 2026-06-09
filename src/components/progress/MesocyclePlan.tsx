/**
 * MesocyclePlan
 *
 * Visual 4-week mesocycle block showing the user where they are in their
 * training cycle. No competitor surfaces this - it gives users confidence
 * that their programming is periodised and purposeful.
 *
 * Phases:
 *  - Accumulation (W1-2): building volume to stimulate growth
 *  - Intensification (W3): pushing harder with increased intensity
 *  - Deload (W4): recovery week - the body grows during rest
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius, typography } from "@/src/theme";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "accumulation" | "intensification" | "deload";

type MesocyclePlanProps = {
  currentWeek: number; // 1-4
  phase: Phase;
  totalWeeks?: number; // default 4
  compact?: boolean; // true = just the 4 columns, no description
};

// ─── Phase Config ───────────────────────────────────────────────────────────

type PhaseInfo = {
  label: string;
  colorKey: "primary" | "gold" | "success";
  volumeMultiplier: number;
};

const WEEK_PHASES: PhaseInfo[] = [
  { label: "Build", colorKey: "primary", volumeMultiplier: 0.8 },
  { label: "Build", colorKey: "primary", volumeMultiplier: 1.0 },
  { label: "Push", colorKey: "gold", volumeMultiplier: 0.9 },
  { label: "Recover", colorKey: "success", volumeMultiplier: 0.6 },
];

const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  accumulation: "Building volume to stimulate growth",
  intensification: "Pushing harder with increased intensity",
  deload: "Recovery week \u2014 your body grows during rest",
};

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_BAR_HEIGHT = 64;
const BAR_WIDTH = 28;

// ─── Component ──────────────────────────────────────────────────────────────

export const MesocyclePlan: React.FC<MesocyclePlanProps> = ({
  currentWeek,
  phase,
  totalWeeks = 4,
  compact = false,
}) => {
  const { colors } = useTheme();

  const weeks = WEEK_PHASES.slice(0, totalWeeks);

  return (
    <Animated.View
      entering={FadeInUp.duration(400).damping(18)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Title */}
      {!compact && (
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.bodySemiBold },
          ]}
        >
          Training Block
        </Text>
      )}

      {/* 4-column week grid */}
      <View style={styles.weekRow}>
        {weeks.map((weekInfo, idx) => {
          const weekNum = idx + 1;
          const isCurrent = weekNum === currentWeek;
          const phaseColor = colors[weekInfo.colorKey];
          const barHeight = Math.round(
            weekInfo.volumeMultiplier * MAX_BAR_HEIGHT
          );

          return (
            <Animated.View
              key={weekNum}
              entering={FadeInUp.duration(350).delay(idx * 60)}
              style={[
                styles.weekColumn,
                isCurrent && [
                  styles.weekColumnActive,
                  {
                    borderColor: phaseColor,
                    backgroundColor: `${phaseColor}10`,
                  },
                ],
              ]}
            >
              {/* Week label */}
              <Text
                allowFontScaling={false}
                style={[
                  styles.weekLabel,
                  {
                    color: isCurrent ? colors.text : colors.textMuted,
                    fontFamily: typography.fonts.bodySemiBold,
                  },
                ]}
              >
                W{weekNum}
              </Text>

              {/* Volume bar */}
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: colors.progressBg },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: isCurrent ? phaseColor : `${phaseColor}55`,
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>

              {/* Phase name */}
              <Text
                allowFontScaling={false}
                style={[
                  styles.phaseLabel,
                  {
                    color: isCurrent ? phaseColor : colors.textMuted,
                    fontFamily: typography.fonts.body,
                  },
                ]}
              >
                {weekInfo.label}
              </Text>

              {/* Dot indicator for current week */}
              {isCurrent && (
                <View
                  style={[styles.currentDot, { backgroundColor: phaseColor }]}
                />
              )}
            </Animated.View>
          );
        })}
      </View>

      {/* Phase description */}
      {!compact && (
        <Animated.View
          entering={FadeInUp.duration(350).delay(280)}
          style={[styles.descriptionRow, { borderTopColor: colors.border }]}
        >
          <Text
            style={[
              styles.descriptionTitle,
              {
                color: colors.text,
                fontFamily: typography.fonts.bodySemiBold,
              },
            ]}
          >
            You&apos;re in Week {currentWeek}
          </Text>
          <Text
            style={[
              styles.descriptionBody,
              {
                color: colors.textSecondary,
                fontFamily: typography.fonts.body,
              },
            ]}
          >
            {PHASE_DESCRIPTIONS[phase]}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.base,
  },
  title: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.semibold,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  weekColumn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    gap: spacing.sm,
  },
  weekColumnActive: {
    borderWidth: 1.5,
  },
  weekLabel: {
    fontSize: typography.sizes.caption1,
    fontWeight: typography.weights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: MAX_BAR_HEIGHT,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
  },
  phaseLabel: {
    fontSize: typography.sizes.caption2,
    fontWeight: typography.weights.medium,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  descriptionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  descriptionTitle: {
    fontSize: typography.sizes.subhead,
    fontWeight: typography.weights.semibold,
  },
  descriptionBody: {
    fontSize: typography.sizes.footnote,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.footnote * typography.lineHeights.relaxed,
  },
});
