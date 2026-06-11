/**
 * WorkoutComplete - the post-workout payoff.
 *
 * Fires when the last set of the last exercise is completed (the context
 * dispatches SHOW_CELEBRATION + hapticCelebration). Replaces a previous Noop
 * stub, so finishing a workout now has a real moment instead of a silent jump
 * to the feeling check-in.
 *
 * Motion language (see docs/MOTION_AND_DELIGHT.md): monochrome, restraint, the
 * wow is motion + haptics not colour. A black badge springs in with an
 * expanding ring pulse, then the stats count up and stagger in. No confetti.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { CountUpText } from "@/src/animations/components/CountUpText";

type PR = { exercise: string; value: string; previous?: string };

type WorkoutCompleteStats = {
  /** Pre-formatted "m:ss". */
  duration: string;
  exercises: number;
  sets: number;
  totalVolume?: number;
  prs?: PR[];
  workoutsThisWeek: number;
};

type Props = {
  visible: boolean;
  stats: WorkoutCompleteStats;
  onContinue: () => void;
  onShare?: () => void;
};

export const WorkoutComplete: React.FC<Props> = ({ visible, stats, onContinue }) => {
  const { colors } = useTheme();

  // Badge spring-in + an expanding ring pulse behind it. The haptic is already
  // fired by the context on SHOW_CELEBRATION, so we don't double it here.
  const badgeScale = useSharedValue(0);
  const pulseScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      badgeScale.value = 0;
      pulseScale.value = 0;
      pulseOpacity.value = 0;
      badgeScale.value = withSpring(1, { damping: 11, stiffness: 170 });
      pulseOpacity.value = withTiming(0.14, { duration: 120 }, () => {
        pulseOpacity.value = withTiming(0, { duration: 520 });
      });
      pulseScale.value = withDelay(
        80,
        withTiming(2.4, { duration: 560, easing: Easing.out(Easing.quad) }),
      );
    }
  }, [visible, badgeScale, pulseScale, pulseOpacity]);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgeScale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const prCount = stats.prs?.length ?? 0;
  const hasVolume = !!stats.totalVolume && stats.totalVolume > 0;

  // Stagger order for the stat cards; volume is optional so delays shift.
  let d = 280;
  const nextDelay = () => {
    const v = d;
    d += 90;
    return v;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Hero badge */}
        <View style={styles.heroWrap}>
          <Animated.View
            pointerEvents="none"
            style={[styles.pulse, { borderColor: colors.text }, pulseStyle]}
          />
          <Animated.View style={[styles.badge, { backgroundColor: colors.text }, badgeStyle]}>
            <Ionicons name="checkmark" size={44} color={colors.bg} />
          </Animated.View>
        </View>

        <Animated.Text
          entering={FadeInDown.delay(160).duration(360)}
          allowFontScaling={false}
          style={[styles.title, { color: colors.text }]}
        >
          Workout complete
        </Animated.Text>

        {prCount > 0 ? (
          <Animated.View
            entering={FadeInUp.delay(220).duration(360)}
            style={[styles.prPill, { backgroundColor: colors.text }]}
          >
            <Ionicons name="flame" size={13} color={colors.bg} />
            <Text allowFontScaling={false} style={[styles.prPillText, { color: colors.bg }]}>
              {prCount} personal record{prCount === 1 ? "" : "s"}
            </Text>
          </Animated.View>
        ) : (
          <Animated.Text
            entering={FadeInUp.delay(220).duration(360)}
            allowFontScaling={false}
            style={[styles.subtitle, { color: colors.textMuted }]}
          >
            Logged and saved
          </Animated.Text>
        )}

        {/* Stat row */}
        <View style={styles.statRow}>
          {hasVolume && (
            <Animated.View entering={FadeInUp.delay(nextDelay()).duration(380)} style={styles.stat}>
              <CountUpText
                value={stats.totalVolume as number}
                duration={900}
                suffix=""
                style={{ ...styles.statValue, color: colors.text }}
              />
              <Text allowFontScaling={false} style={[styles.statLabel, { color: colors.textMuted }]}>
                LBS LIFTED
              </Text>
            </Animated.View>
          )}
          <Animated.View entering={FadeInUp.delay(nextDelay()).duration(380)} style={styles.stat}>
            <CountUpText
              value={stats.sets}
              duration={700}
              style={{ ...styles.statValue, color: colors.text }}
            />
            <Text allowFontScaling={false} style={[styles.statLabel, { color: colors.textMuted }]}>
              {stats.sets === 1 ? "SET" : "SETS"}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(nextDelay()).duration(380)} style={styles.stat}>
            <Text allowFontScaling={false} style={[styles.statValue, { color: colors.text }]}>
              {stats.duration}
            </Text>
            <Text allowFontScaling={false} style={[styles.statLabel, { color: colors.textMuted }]}>
              TIME
            </Text>
          </Animated.View>
        </View>

        <Animated.Text
          entering={FadeInUp.delay(d + 60).duration(380)}
          allowFontScaling={false}
          style={[styles.weekLine, { color: colors.textSecondary }]}
        >
          {stats.workoutsThisWeek} workout{stats.workoutsThisWeek === 1 ? "" : "s"} this week
        </Animated.Text>

        {/* CTA */}
        <Animated.View
          entering={FadeInUp.delay(d + 140).duration(380)}
          style={styles.ctaWrap}
        >
          <Pressable
            onPress={() => {
              hapticPress();
              onContinue();
            }}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.text },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text allowFontScaling={false} style={[styles.ctaText, { color: colors.bg }]}>
              Continue
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  heroWrap: { alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: spacing.sm },
  prPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  prPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    marginTop: spacing.xxl,
  },
  stat: { alignItems: "center", minWidth: 72 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  weekLine: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: spacing.xxl },
  ctaWrap: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: 48 },
  cta: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

export default WorkoutComplete;
