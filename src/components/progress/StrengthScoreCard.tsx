/**
 * StrengthScoreCard - Premium "ADPT Score" display
 *
 * Solo Leveling / Valorant inspired design:
 * - Hero section: Gauge + large score + rank title + percentile
 * - Big 4 Breakdown: Per-lift colors, wide progress bars, 1RM prominent
 * - Next Milestone: Rarity-colored progress card
 * - Share icon (top-right corner, not a button in the flow)
 */

import React from "react";
import { StyleSheet, Text, View, Pressable, Share } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import type { StrengthScoreResult, MilestoneRarity } from "@/lib/strengthScore";
import { TOTAL_MILESTONES } from "@/lib/strengthScore";

type StrengthScoreCardProps = {
  score: StrengthScoreResult;
  onLiftPress?: (liftName: string) => void;
  onMilestonesPress?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRarityColor(colors: ReturnType<typeof useTheme>["colors"], rarity: MilestoneRarity): string {
  const map: Record<MilestoneRarity, string> = {
    common: colors.success,
    uncommon: colors.primary,
    rare: colors.info,
    epic: colors.intensity,
    legendary: colors.gold,
  };
  return map[rarity];
}

function getScoreRankTitle(score: number): string {
  if (score >= 800) return "LEGENDARY";
  if (score >= 650) return "ELITE";
  if (score >= 500) return "ADVANCED";
  if (score >= 300) return "INTERMEDIATE";
  if (score >= 100) return "NOVICE";
  return "BEGINNER";
}

function getScoreRankColor(colors: ReturnType<typeof useTheme>["colors"], score: number): string {
  if (score >= 800) return colors.gold;
  if (score >= 650) return "#FF6B35";
  if (score >= 500) return colors.info;
  if (score >= 300) return colors.primary;
  if (score >= 100) return colors.textSecondary;
  return colors.textMuted;
}

const LIFT_COLORS: Record<string, string> = {
  "Bench Press": "#3B82F6",
  "Squat": "#60A5FA",
  "Deadlift": "#FF6B35",
  "Overhead Press": "#7FA07F",
};

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

const GAUGE_SIZE = 220;
const GAUGE_STROKE = 10;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CENTER = GAUGE_SIZE / 2;
const START_ANGLE = 150;
const SWEEP_ANGLE = 240;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function ScoreGauge({ score, maxScore = 999 }: { score: number; maxScore?: number }) {
  const { colors } = useTheme();
  const fraction = Math.min(score / maxScore, 1);
  const fillAngle = START_ANGLE + SWEEP_ANGLE * fraction;
  const dot = polarToCartesian(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS, fillAngle);

  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE * 0.58} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE * 0.58}`}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#7FA07F" />
          <Stop offset="35%" stopColor="#3B82F6" />
          <Stop offset="65%" stopColor="#60A5FA" />
          <Stop offset="85%" stopColor="#FF6B35" />
          <Stop offset="100%" stopColor="#FFD700" />
        </LinearGradient>
      </Defs>

      {/* Background track */}
      <Path
        d={describeArc(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS, START_ANGLE, START_ANGLE + SWEEP_ANGLE)}
        fill="none"
        stroke={colors.border}
        strokeWidth={GAUGE_STROKE}
        strokeLinecap="round"
        opacity={0.4}
      />

      {/* Filled arc */}
      {score > 0 && (
        <Path
          d={describeArc(GAUGE_CENTER, GAUGE_CENTER, GAUGE_RADIUS, START_ANGLE, fillAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
        />
      )}

      {/* Indicator dot - larger, more prominent */}
      {score > 0 && (
        <>
          <Circle cx={dot.x} cy={dot.y} r={7} fill="#FFD700" opacity={0.3} />
          <Circle cx={dot.x} cy={dot.y} r={5} fill="#FFD700" />
          <Circle cx={dot.x} cy={dot.y} r={2.5} fill={colors.card} />
        </>
      )}
    </Svg>
  );
}

// ─── Animated Score ───────────────────────────────────────────────────────────

function AnimatedScore({ value, color }: { value: number; color: string }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <Text allowFontScaling={false} style={[styles.scoreNumber, { color }]}>
      {displayValue}
    </Text>
  );
}

// ─── Share Handler ────────────────────────────────────────────────────────────

function buildShareMessage(score: StrengthScoreResult): string {
  const lines = [`My Strength Score: ${score.totalScore} SS 💪`];
  lines.push(`Stronger than ${score.percentile}% of gym-goers\n`);
  score.big4Scores.forEach((lift) => {
    if (lift.estimated1RM > 0) {
      lines.push(`${lift.liftName}: ${lift.estimated1RM} lbs (${lift.ratio}x BW)`);
    }
  });
  if (score.achievedCount > 0) {
    lines.push(`\n${score.achievedCount}/${TOTAL_MILESTONES} milestones achieved`);
  }
  lines.push("\nWhat's your score? 👉 adpt.fit");
  return lines.join("\n");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StrengthScoreCard({ score, onLiftPress, onMilestonesPress }: StrengthScoreCardProps) {
  const { colors } = useTheme();
  const nextColor = score.nextMilestone ? getRarityColor(colors, score.nextMilestone.rarity) : colors.gold;
  const { achievedCount } = score;
  const rankColor = getScoreRankColor(colors, score.totalScore);
  const rankTitle = getScoreRankTitle(score.totalScore);

  const handleShare = async () => {
    hapticPress();
    try {
      await Share.share({ message: buildShareMessage(score) });
    } catch {
      // User cancelled
    }
  };

  // Empty state
  if (score.liftsUsed === 0) {
    return (
      <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="barbell-outline" size={28} color={colors.primary} />
          </View>
          <Text allowFontScaling={false} style={[styles.emptyTitle, { color: colors.text }]}>
            Strength Score
          </Text>
          <Text allowFontScaling={false} style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Log your first Bench, Squat, Deadlift, or OHP to unlock your SS
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>

      {/* ══════════════ HERO: Gauge + Score + Rank ══════════════ */}
      <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
        {/* Share icon - top right */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareIcon,
            { backgroundColor: colors.gold + "12" },
            pressed && { opacity: 0.5 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={18} color={colors.gold} />
        </Pressable>

        {/* Gauge */}
        <View style={styles.gaugeContainer}>
          <ScoreGauge score={score.totalScore} />
          <View style={styles.scoreOverlay}>
            <AnimatedScore value={score.totalScore} color={rankColor} />
            <Text allowFontScaling={false} style={[styles.ssLabel, { color: `${rankColor}80` }]}>
              SS
            </Text>
          </View>
        </View>

        {/* Rank title - the Solo Leveling flex */}
        <Text allowFontScaling={false} style={[styles.rankTitle, { color: rankColor }]}>
          {rankTitle}
        </Text>

        {/* Percentile */}
        <Text allowFontScaling={false} style={[styles.percentileText, { color: colors.textSecondary }]}>
          Stronger than {score.percentile}% of lifters at your weight
        </Text>

        {score.missingBodyweight && (
          <Text allowFontScaling={false} style={[styles.missingBwHint, { color: colors.textMuted }]}>
            Add your weight in Settings for a more accurate score
          </Text>
        )}
      </View>

      {/* ══════════════ NEXT MILESTONE ══════════════ */}
      {score.nextMilestone && (
        <Pressable
          onPress={() => {
            if (onMilestonesPress) { hapticPress(); onMilestonesPress(); }
          }}
          style={({ pressed }) => [
            styles.milestoneCard,
            { backgroundColor: colors.card },
            pressed && onMilestonesPress && { opacity: 0.7 },
          ]}
        >
          <View style={styles.milestoneTop}>
            <View style={styles.milestoneLeft}>
              <View style={[styles.milestoneIconBg, { backgroundColor: nextColor + "20" }]}>
                <Ionicons
                  name={score.nextMilestone.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={nextColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text allowFontScaling={false} style={[styles.milestoneLabel, { color: colors.text }]}>
                  {score.nextMilestone.label}
                </Text>
                <Text allowFontScaling={false} style={[styles.milestoneDesc, { color: colors.textMuted }]}>
                  {score.nextMilestone.description}
                </Text>
              </View>
            </View>
            <Text allowFontScaling={false} style={[styles.milestonePercent, { color: nextColor }]}>
              {Math.round(score.nextMilestone.progress * 100)}%
            </Text>
          </View>
          <View style={[styles.milestoneBarBg, { backgroundColor: colors.bg }]}>
            <View
              style={[
                styles.milestoneBarFill,
                { backgroundColor: nextColor, width: `${Math.round(score.nextMilestone.progress * 100)}%` },
              ]}
            />
          </View>
        </Pressable>
      )}

      {!score.nextMilestone && achievedCount > 0 && (
        <View style={[styles.milestoneCard, { backgroundColor: colors.card }]}>
          <View style={styles.milestoneTop}>
            <View style={styles.milestoneLeft}>
              <Ionicons name="trophy" size={16} color={colors.gold} />
              <Text allowFontScaling={false} style={[styles.milestoneLabel, { color: colors.gold }]}>
                All milestones achieved!
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ══════════════ BIG 4 BREAKDOWN ══════════════ */}
      <View style={[styles.breakdownCard, { backgroundColor: colors.card }]}>
        <Text allowFontScaling={false} style={[styles.sectionTitle, { color: colors.textMuted }]}>
          BIG 4 LIFTS
        </Text>

        {score.big4Scores.map((lift, index) => {
          const hasData = lift.points > 0;
          const fillPercent = Math.min((lift.points / 250) * 100, 100);
          const liftColor = LIFT_COLORS[lift.liftName] || colors.primary;

          return (
            <Pressable
              key={lift.liftName}
              onPress={() => {
                if (hasData && onLiftPress) { hapticPress(); onLiftPress(lift.liftName); }
              }}
              style={({ pressed }) => [
                styles.liftRow,
                index < score.big4Scores.length - 1 && [styles.liftRowBorder, { borderColor: colors.border }],
                pressed && hasData && { opacity: 0.7 },
              ]}
            >
              {hasData ? (
                <>
                  <View style={styles.liftTopRow}>
                    <Text allowFontScaling={false} style={[styles.liftName, { color: colors.text }]}>
                      {lift.liftName}
                    </Text>
                    <Text allowFontScaling={false} style={[styles.liftWeight, { color: colors.text }]}>
                      {lift.estimated1RM} <Text style={[styles.liftUnit, { color: colors.textMuted }]}>lbs</Text>
                    </Text>
                  </View>
                  <View style={styles.liftBottomRow}>
                    <Text allowFontScaling={false} style={[styles.liftRatio, { color: colors.textMuted }]}>
                      {lift.ratio}x BW
                    </Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.bg }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { backgroundColor: liftColor, width: `${fillPercent}%` },
                        ]}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.liftTopRow}>
                  <Text allowFontScaling={false} style={[styles.liftName, { color: colors.textMuted }]}>
                    {lift.liftName}
                  </Text>
                  <Text allowFontScaling={false} style={[styles.noData, { color: colors.textMuted }]}>
                    No data
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ══════════════ MILESTONES LINK ══════════════ */}
      {onMilestonesPress && (
        <Pressable
          onPress={() => { hapticPress(); onMilestonesPress(); }}
          style={({ pressed }) => [
            styles.milestonesLink,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="trophy" size={14} color={colors.gold} />
          <Text allowFontScaling={false} style={[styles.milestonesLinkText, { color: colors.textMuted }]}>
            {achievedCount}/{TOTAL_MILESTONES} milestones
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </Pressable>
      )}

      {score.liftsUsed < 4 && (
        <Text allowFontScaling={false} style={[styles.liftsHint, { color: colors.textMuted }]}>
          {4 - score.liftsUsed} lift{4 - score.liftsUsed > 1 ? "s" : ""} missing - score is estimated
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.base,
    marginBottom: spacing.base,
  },

  // Hero section
  heroCard: {
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: "center",
    position: "relative",
  },
  shareIcon: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  gaugeContainer: {
    alignItems: "center",
    position: "relative",
    height: 130,
  },
  scoreOverlay: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    lineHeight: 70,
  },
  ssLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: -2,
  },
  rankTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 3,
    marginTop: spacing.sm,
  },
  percentileText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: spacing.xs,
  },
  missingBwHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // Milestone card
  milestoneCard: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  milestoneTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  milestoneLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    flex: 1,
  },
  milestoneIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  milestoneDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  milestonePercent: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  milestoneBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  milestoneBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Breakdown card
  breakdownCard: {
    borderRadius: 16,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  liftRow: {
    paddingVertical: spacing.base,
  },
  liftRowBorder: {
    borderBottomWidth: 1,
  },
  liftTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liftName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  liftWeight: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  liftUnit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  liftBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    marginTop: 6,
  },
  liftRatio: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 56,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  noData: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },

  // Milestones link
  milestonesLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
  },
  milestonesLinkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Hints
  liftsHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});

export default StrengthScoreCard;
