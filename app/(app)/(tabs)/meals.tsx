/**
 * Nutrition tab - Cal AI / MacroFactor inspired layout, monochrome.
 *
 * Surfaces only data we have today (coach-set targets + binary "hit goal"
 * flag + meal-plan PDFs). Visual scaffolding for future food-logging.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { supabase } from "@/lib/supabase";
import { isSignedInUserCoach } from "@/src/lib/mealPlans";
import {
  useDailyFlag,
  dailyFlagPrefix,
  ymdFromDailyFlagKey,
} from "@/src/hooks/useDailyFlag";
import { useTodayNutrition } from "@/src/hooks/useTodayNutrition";
import { hapticPress, hapticSuccess } from "@/src/animations/feedback/haptics";
import { Skeleton } from "@/src/animations/components/SkeletonLoader";
import { CalorieRing } from "@/src/components/CalorieRing";
import { MfpConnectCard } from "@/src/components/MfpConnectCard";

type MacroTargets = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
};

type MealPlan = {
  id: string;
  title: string;
  storage_path: string;
  uploaded_at: string;
};

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MealsScreen() {
  const { colors } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [macros, setMacros] = useState<MacroTargets | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekHits, setWeekHits] = useState(0);

  const today = todayLocalISO();
  const macroFlag = useDailyFlag("macros", today, userId);
  // Today's actual intake - fed by useHealthKit's foreground sync via
  // the daily_nutrition table. Null when the user hasn't connected
  // HealthKit yet (or HealthKit returned nothing).
  const { data: todayIntake, refresh: refreshIntake } = useTodayNutrition(userId);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [macroRes, planRes, coach, allKeys] = await Promise.all([
      supabase
        .from("client_macros")
        .select("calories, protein_g, carbs_g, fat_g, notes")
        .eq("client_id", user.id)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("meal_plans")
        .select("id, title, storage_path, uploaded_at")
        .eq("client_id", user.id)
        .order("uploaded_at", { ascending: false }),
      isSignedInUserCoach(),
      AsyncStorage.getAllKeys().catch(() => [] as readonly string[]),
    ]);

    if (macroRes.data) setMacros(macroRes.data);
    if (planRes.data) setMealPlans(planRes.data);
    setIsCoach(coach);

    // Count this week's macro hits - last 7 days inclusive. Scoped by
    // user_id so a fresh account doesn't inherit prior accounts' flags.
    const userPrefix = dailyFlagPrefix(user.id, "macros");
    const macroKeys = (allKeys as readonly string[]).filter((k) =>
      k.startsWith(userPrefix),
    );
    if (macroKeys.length > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      const cutoffYmd = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
      const pairs = await AsyncStorage.multiGet(macroKeys).catch(
        () => [] as [string, string | null][],
      );
      let count = 0;
      for (const [k, v] of pairs) {
        if (v !== "1") continue;
        const ymd = ymdFromDailyFlagKey(k);
        if (!ymd) continue;
        if (ymd >= cutoffYmd && ymd <= today) count += 1;
      }
      setWeekHits(count);
    } else {
      setWeekHits(0);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshIntake()]);
    setRefreshing(false);
  }, [fetchData, refreshIntake]);

  const openPdf = useCallback((path: string, title: string) => {
    // Route to our in-app viewer so the bare supabase.co signed URL is
    // never visible. The viewer regenerates a fresh signed URL itself.
    router.push({
      pathname: "/(app)/view-meal-plan",
      params: { path, title },
    });
  }, []);

  const onToggleHit = useCallback(() => {
    if (macroFlag.on) hapticPress();
    else hapticSuccess();
    macroFlag.toggle();
    // Optimistically reflect the toggle in the week count.
    setWeekHits((c) => Math.max(0, c + (macroFlag.on ? -1 : 1)));
  }, [macroFlag]);

  // When we have real intake data, the ring shows consumed-vs-target with
  // the consumed value in the center and the ring filling proportionally.
  // Without intake data, fall back to showing the target as the hero
  // number and the binary "hit goal" toggle as before.
  const hasIntake = !!todayIntake?.calories;
  const ringHero = useMemo(() => {
    if (hasIntake) {
      return {
        eyebrow: "calories",
        value: (todayIntake!.calories as number).toLocaleString(),
        caption:
          macros?.calories != null
            ? `of ${macros.calories.toLocaleString()} target`
            : "logged today",
        progress:
          macros?.calories && todayIntake!.calories
            ? Math.min(1, (todayIntake!.calories as number) / macros.calories)
            : 0,
      };
    }
    return {
      eyebrow: "calories",
      value: macros?.calories ? macros.calories.toLocaleString() : "-",
      caption: "daily target",
      progress: macroFlag.on ? 1 : 0,
    };
  }, [hasIntake, todayIntake, macros?.calories, macroFlag.on]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.titleRow}>
        <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
          Nutrition
        </Text>
        {isCoach && (
          <Pressable
            onPress={() => router.push("/(app)/upload-meal-plan" as any)}
            hitSlop={12}
            style={[styles.uploadIcon, { backgroundColor: colors.bgSecondary }]}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {loading ? (
          <MealsSkeleton />
        ) : (
          <Animated.View entering={FadeIn.duration(220)}>
            {/* Hero ring - auto-tracks consumed vs target when HealthKit
                feeds data; falls back to a tap-to-hit toggle otherwise. */}
            {macros ? (
              <View style={styles.heroBlock}>
                <Pressable
                  onPress={hasIntake ? undefined : onToggleHit}
                  disabled={hasIntake}
                  accessibilityRole={hasIntake ? "text" : "button"}
                >
                  <CalorieRing
                    size={220}
                    progress={ringHero.progress}
                    value={ringHero.value}
                    eyebrow={ringHero.eyebrow}
                    caption={ringHero.caption}
                  />
                </Pressable>
                <Text
                  allowFontScaling={false}
                  style={[styles.hitLine, { color: colors.textMuted }]}
                >
                  {hasIntake
                    ? `Auto-synced from Apple Health`
                    : macroFlag.on
                      ? "✓ Hit today"
                      : "Tap ring to mark hit"}
                  {!hasIntake && weekHits > 0
                    ? `  ·  ${weekHits} day${weekHits === 1 ? "" : "s"} this week`
                    : ""}
                </Text>
              </View>
            ) : (
              <View style={[styles.emptyHero, { borderColor: colors.border }]}>
                <Ionicons name="nutrition-outline" size={32} color={colors.textMuted} />
                <Text
                  allowFontScaling={false}
                  style={[styles.emptyTitle, { color: colors.text }]}
                >
                  No targets set
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[styles.emptyText, { color: colors.textMuted }]}
                >
                  Your coach hasn&apos;t set nutrition targets yet.
                </Text>
              </View>
            )}

            {/* Macro cards row */}
            {macros && (macros.protein_g != null || macros.carbs_g != null || macros.fat_g != null) && (
              <View style={styles.macroRow}>
                <MacroCard
                  label="Protein"
                  grams={macros.protein_g}
                  consumed={hasIntake ? todayIntake?.protein_g ?? null : null}
                  colors={colors}
                />
                <MacroCard
                  label="Carbs"
                  grams={macros.carbs_g}
                  consumed={hasIntake ? todayIntake?.carbs_g ?? null : null}
                  colors={colors}
                />
                <MacroCard
                  label="Fat"
                  grams={macros.fat_g}
                  consumed={hasIntake ? todayIntake?.fat_g ?? null : null}
                  colors={colors}
                />
              </View>
            )}

            {/* MFP / Cronometer / Lose It bridge education - only when
                HealthKit has actually wired up; otherwise this card is
                misleading because we can't read anything yet. */}
            {hasIntake && <MfpConnectCard />}

            {/* Coach notes */}
            {macros?.notes ? (
              <View style={[styles.notesCard, { backgroundColor: colors.bgSecondary }]}>
                <Text
                  allowFontScaling={false}
                  style={[styles.notesLabel, { color: colors.textMuted }]}
                >
                  COACH NOTES
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[styles.notesBody, { color: colors.text }]}
                >
                  {macros.notes}
                </Text>
              </View>
            ) : null}

            {/* Meal plans */}
            <View style={styles.section}>
              <Text
                allowFontScaling={false}
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Meal plans
              </Text>
              {mealPlans.length > 0 ? (
                <View style={styles.planList}>
                  {mealPlans.map((plan, i) => {
                    const isLast = i === mealPlans.length - 1;
                    return (
                      <Pressable
                        key={plan.id}
                        onPress={() => openPdf(plan.storage_path, plan.title)}
                        style={[
                          styles.planRow,
                          !isLast && {
                            borderBottomColor: colors.border,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        <View style={[styles.planIcon, { backgroundColor: colors.bgSecondary }]}>
                          <Ionicons name="document-text-outline" size={18} color={colors.text} />
                        </View>
                        <View style={styles.planInfo}>
                          <Text
                            allowFontScaling={false}
                            style={[styles.planTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {plan.title}
                          </Text>
                          <Text
                            allowFontScaling={false}
                            style={[styles.planDate, { color: colors.textMuted }]}
                          >
                            {new Date(plan.uploaded_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text
                  allowFontScaling={false}
                  style={[styles.emptyPlans, { color: colors.textMuted }]}
                >
                  No meal plans uploaded
                </Text>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroCard({
  label,
  grams,
  consumed,
  colors,
}: {
  label: string;
  /** Coach-set target in grams. Null = no target. */
  grams: number | null;
  /** Today's consumed value in grams. Null = no intake data; show target only. */
  consumed: number | null;
  colors: any;
}) {
  const hasConsumed = consumed != null;
  return (
    <View style={[styles.macroCard, { borderColor: colors.border }]}>
      <Text
        allowFontScaling={false}
        style={[styles.macroValue, { color: colors.text }]}
      >
        {hasConsumed ? Math.round(consumed!) : grams != null ? `${grams}` : "-"}
      </Text>
      <Text
        allowFontScaling={false}
        style={[styles.macroUnit, { color: colors.textMuted }]}
      >
        {hasConsumed && grams != null ? `/ ${grams}g` : "g"}
      </Text>
      <Text
        allowFontScaling={false}
        style={[styles.macroLabel, { color: colors.textMuted }]}
      >
        {label}
      </Text>
    </View>
  );
}

function MealsSkeleton() {
  return (
    <View style={{ gap: spacing.lg, marginTop: spacing.xs }}>
      <View style={{ alignItems: "center", marginVertical: spacing.lg }}>
        <Skeleton width={220} height={220} borderRadius={110} />
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Skeleton width="32%" height={84} borderRadius={radius.md} />
        <Skeleton width="32%" height={84} borderRadius={radius.md} />
        <Skeleton width="32%" height={84} borderRadius={radius.md} />
      </View>
      <Skeleton width="40%" height={18} style={{ marginTop: spacing.md }} />
      <Skeleton width="100%" height={56} borderRadius={radius.md} />
      <Skeleton width="100%" height={56} borderRadius={radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.base,
    marginBottom: spacing.md,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  uploadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingBottom: 60 },

  // Hero
  heroBlock: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  hitLine: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: spacing.md,
  },
  emptyHero: {
    alignItems: "center",
    paddingVertical: spacing.xl + 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Macro cards
  macroRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  macroCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 0,
  },
  macroValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  macroUnit: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -2 },
  macroLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 6,
  },

  // Coach notes
  notesCard: {
    padding: spacing.base,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    gap: 6,
  },
  notesLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  notesBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  // Meal plans
  section: { marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: spacing.sm,
  },
  planList: {},
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  planDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyPlans: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
