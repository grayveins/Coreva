/**
 * Coach roster - the daily-open surface. All clients, each with adherence at a
 * glance, sorted by who needs attention (driven by the get_coach_roster RPC).
 * Tapping a client opens the program builder for them.
 */

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict, parseISO } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { useCoachRole } from "@/src/hooks/useCoachRole";
import { useCoachRoster } from "@/src/hooks/useCoachRoster";
import { needsAttention, type RosterEntry } from "@/lib/coach/roster";

function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return null;
  }
}

function ClientRow({ entry }: { entry: RosterEntry }) {
  const { colors } = useTheme();
  const flag = needsAttention(entry);

  const openBuilder = () => {
    hapticPress();
    router.push({
      // Cast: typed-routes manifest regenerates on next expo start to include
      // the new (coach) group.
      pathname: "/(coach)/program-builder" as any,
      params: { clientId: entry.clientId, clientName: entry.name },
    });
  };

  const signals: string[] = [];
  signals.push(`${entry.workoutsThisWeek} workout${entry.workoutsThisWeek === 1 ? "" : "s"} this wk`);
  if (entry.currentStreak > 0) signals.push(`${entry.currentStreak}d streak`);
  const last = relativeDay(entry.lastWorkoutAt);
  if (last) signals.push(`last ${last}`);

  return (
    <Pressable
      onPress={openBuilder}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        flag && { borderColor: colors.warning, borderWidth: 1.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text allowFontScaling={false} style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {entry.name}
          </Text>
          <Text allowFontScaling={false} style={[styles.program, { color: colors.textMuted }]} numberOfLines={1}>
            {entry.activeProgramName ?? "No active program"}
          </Text>
        </View>
        {flag && (
          <View style={[styles.flagPill, { backgroundColor: colors.warningMuted }]}>
            <Ionicons name="alert-circle" size={13} color={colors.warning} />
            <Text allowFontScaling={false} style={[styles.flagText, { color: colors.warning }]}>
              Needs attention
            </Text>
          </View>
        )}
        {entry.status !== "active" && (
          <View style={[styles.statusPill, { backgroundColor: colors.bgSecondary }]}>
            <Text allowFontScaling={false} style={[styles.statusText, { color: colors.textSecondary }]}>
              {entry.status}
            </Text>
          </View>
        )}
      </View>

      <Text allowFontScaling={false} style={[styles.signals, { color: colors.textSecondary }]}>
        {signals.join("  ·  ")}
      </Text>

      {(entry.missedLast7 > 0 || entry.pendingCheckIns > 0) && (
        <View style={styles.alertRow}>
          {entry.missedLast7 > 0 && (
            <Text allowFontScaling={false} style={[styles.alert, { color: colors.error }]}>
              {entry.missedLast7} missed this week
            </Text>
          )}
          {entry.pendingCheckIns > 0 && (
            <Text allowFontScaling={false} style={[styles.alert, { color: colors.warning }]}>
              {entry.pendingCheckIns} check-in{entry.pendingCheckIns === 1 ? "" : "s"} to review
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export default function CoachRosterScreen() {
  const { colors } = useTheme();
  const { coachId } = useCoachRole();
  const { roster, loading, refreshing, error, refresh } = useCoachRoster(coachId);

  const counts = useMemo(() => {
    const active = roster.filter((r) => r.status === "active").length;
    const attention = roster.filter(needsAttention).length;
    return { active, attention };
  }, [roster]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
            Clients
          </Text>
          <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textMuted }]}>
            {counts.active} active
            {counts.attention > 0 ? ` · ${counts.attention} need attention` : ""}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/(app)/(tabs)")} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
        >
          {error && (
            <Text allowFontScaling={false} style={[styles.error, { color: colors.error }]}>
              {error}
            </Text>
          )}

          {roster.length === 0 && !error ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text allowFontScaling={false} style={[styles.emptyTitle, { color: colors.text }]}>
                No clients yet
              </Text>
              <Text allowFontScaling={false} style={[styles.emptySub, { color: colors.textMuted }]}>
                Invite a client, then build their first program here.
              </Text>
            </View>
          ) : (
            roster.map((entry) => <ClientRow key={entry.clientId} entry={entry} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 28, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  row: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    gap: 6,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  program: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  flagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  flagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  signals: { fontSize: 13, fontFamily: "Inter_400Regular" },
  alertRow: { flexDirection: "row", gap: spacing.md, marginTop: 2 },
  alert: { fontSize: 12, fontFamily: "Inter_500Medium" },
  error: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: spacing.md },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: spacing.xl },
});
