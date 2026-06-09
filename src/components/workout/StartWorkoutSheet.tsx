/**
 * StartWorkoutSheet — Trainerize-style "start a workout" bottom sheet.
 *
 * Opened from the FAB. Lists the client's active-phase workouts (tap to
 * preview/start) plus an "Empty workout" option — instead of dumping the
 * user on the Workouts tab.
 */

import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { supabase } from "@/lib/supabase";
import { hapticPress } from "@/src/animations/feedback/haptics";

type PhaseWorkout = { id: string; name: string; exercises: any[] };

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const StartWorkoutSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState<string | null>(null);
  const [phaseName, setPhaseName] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<PhaseWorkout[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setProgramName(null);
        setWorkouts([]);
        setLoading(false);
        return;
      }
      const { data: program } = await supabase
        .from("coaching_programs")
        .select("name, program_phases(status, phase_workouts(id, name, exercises))")
        .eq("client_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const p = program as any;
      if (!p) {
        setProgramName(null);
        setPhaseName(null);
        setWorkouts([]);
        setLoading(false);
        return;
      }
      const phases = p.program_phases ?? [];
      const active = phases.find((ph: any) => ph.status === "active") ?? phases[0];
      setProgramName(p.name ?? null);
      setPhaseName(active?.name ?? null);
      setWorkouts(active?.phase_workouts ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const startEmpty = () => {
    onClose();
    hapticPress();
    router.push({ pathname: "/(workout)/active", params: { name: "Workout", sourceType: "empty" } });
  };

  const openWorkout = (w: PhaseWorkout) => {
    onClose();
    hapticPress();
    router.push({
      pathname: "/(workout)/program-detail",
      params: {
        name: w.name,
        exercises: JSON.stringify(w.exercises || []),
        phaseName: phaseName || "",
      },
    });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          entering={FadeInDown.duration(220)}
          style={[styles.sheet, { backgroundColor: colors.bg }]}
        >
          <Animated.View entering={FadeIn.duration(180)}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
              Start a workout
            </Text>

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ paddingBottom: spacing.sm }}
                showsVerticalScrollIndicator={false}
              >
                {workouts.length > 0 && (
                  <>
                    {(programName || phaseName) && (
                      <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textMuted }]}>
                        {[programName, phaseName].filter(Boolean).join(" · ").toUpperCase()}
                      </Text>
                    )}
                    {workouts.map((w) => {
                      const exerciseCount = w.exercises?.length || 0;
                      const totalSets = (w.exercises || []).reduce((s: number, e: any) => s + (e.sets || 0), 0);
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => openWorkout(w)}
                          style={[styles.row, { backgroundColor: colors.bgSecondary }]}
                        >
                          <View style={[styles.rowIcon, { backgroundColor: colors.bg }]}>
                            <Ionicons name="barbell-outline" size={18} color={colors.text} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text allowFontScaling={false} style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                              {w.name}
                            </Text>
                            {(exerciseCount > 0 || totalSets > 0) && (
                              <Text allowFontScaling={false} style={[styles.rowMeta, { color: colors.textMuted }]}>
                                {[
                                  exerciseCount > 0 ? `${exerciseCount} exercises` : null,
                                  totalSets > 0 ? `${totalSets} sets` : null,
                                ].filter(Boolean).join(" · ")}
                              </Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {/* Empty workout — always available */}
                <Pressable onPress={startEmpty} style={[styles.row, styles.emptyRow, { borderColor: colors.border }]}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.bgSecondary }]}>
                    <Ionicons name="add" size={20} color={colors.text} />
                  </View>
                  <Text allowFontScaling={false} style={[styles.rowTitle, { color: colors.text }]}>
                    Empty workout
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.lg },
  title: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginBottom: spacing.base },
  loading: { paddingVertical: 40, alignItems: "center" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  emptyRow: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});

export default StartWorkoutSheet;
