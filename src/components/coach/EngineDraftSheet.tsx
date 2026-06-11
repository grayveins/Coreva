/**
 * EngineDraftSheet - the "generate with engine" flow for the coach program
 * builder. Coach picks goal / experience / days / equipment; we run the real
 * periodization engine and hand back an editable ProgramDraft. This is the
 * differentiator: the coach curates an engine-built block instead of building
 * from a blank screen.
 */

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress, hapticSuccess } from "@/src/animations/feedback/haptics";
import { generateProgram } from "@/lib/workout/engine/generator";
import { engineOutputToProgramDraft } from "@/lib/coach/programDraft";
import type { ProgramDraft } from "@/lib/coach/types";
import type {
  ExperienceLevel,
  FitnessGoal,
  GeneratorInput,
  SplitPreference,
  UserEquipment,
} from "@/lib/workout/generator/types";

type GoalOption = { value: FitnessGoal; label: string };
const GOALS: GoalOption[] = [
  { value: "hypertrophy", label: "Build muscle" },
  { value: "strength", label: "Strength" },
  { value: "fat_loss", label: "Fat loss" },
  { value: "general_fitness", label: "General" },
  { value: "athletic", label: "Athletic" },
];

const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const DAYS: (2 | 3 | 4 | 5 | 6)[] = [2, 3, 4, 5, 6];
const DURATIONS: (30 | 45 | 60 | 75 | 90)[] = [30, 45, 60, 75, 90];

const SPLITS: { value: SplitPreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "full_body", label: "Full body" },
  { value: "upper_lower", label: "Upper / Lower" },
  { value: "push_pull_legs", label: "PPL" },
  { value: "bro_split", label: "Bro split" },
];

const EQUIPMENT: { value: UserEquipment; label: string }[] = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "cables", label: "Cables" },
  { value: "machines", label: "Machines" },
  { value: "bench", label: "Bench" },
  { value: "squat_rack", label: "Squat rack" },
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "resistance_bands", label: "Bands" },
  { value: "bodyweight_only", label: "Bodyweight" },
];

const DEFAULT_EQUIPMENT: UserEquipment[] = [
  "barbell",
  "dumbbells",
  "cables",
  "machines",
  "bench",
  "squat_rack",
  "pull_up_bar",
];

type Props = {
  visible: boolean;
  onClose: () => void;
  programName: string;
  onGenerated: (draft: ProgramDraft) => void;
};

export function EngineDraftSheet({ visible, onClose, programName, onGenerated }: Props) {
  const { colors } = useTheme();
  const [goal, setGoal] = useState<FitnessGoal>("hypertrophy");
  const [experience, setExperience] = useState<ExperienceLevel>("intermediate");
  const [days, setDays] = useState<2 | 3 | 4 | 5 | 6>(4);
  const [duration, setDuration] = useState<30 | 45 | 60 | 75 | 90>(60);
  const [split, setSplit] = useState<SplitPreference>("auto");
  const [equipment, setEquipment] = useState<UserEquipment[]>(DEFAULT_EQUIPMENT);
  const [generating, setGenerating] = useState(false);

  const toggleEquipment = (e: UserEquipment) => {
    hapticPress();
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const onGenerate = () => {
    if (equipment.length === 0) {
      Alert.alert("Pick equipment", "Select at least one equipment type the client has.");
      return;
    }
    setGenerating(true);
    // Defer so the spinner paints before the (synchronous) engine runs.
    setTimeout(() => {
      try {
        const input: GeneratorInput = {
          userId: "coach-draft",
          experienceLevel: experience,
          fitnessGoal: goal,
          daysPerWeek: days,
          sessionDurationMinutes: duration,
          availableEquipment: equipment,
          splitPreference: split,
        };
        const output = generateProgram(input, { generateRationale: true });
        const draft = engineOutputToProgramDraft(output, { name: programName });
        hapticSuccess();
        onGenerated(draft);
        onClose();
      } catch (e) {
        Alert.alert("Generation failed", e instanceof Error ? e.message : "Try different settings.");
      } finally {
        setGenerating(false);
      }
    }, 50);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>
            Generate with engine
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: colors.textMuted }]}>
            The engine drafts a periodized block from these. You can edit everything afterward.
          </Text>

          <Section label="GOAL">
            <ChipRow
              items={GOALS}
              isActive={(g) => g.value === goal}
              onPress={(g) => setGoal(g.value)}
              labelOf={(g) => g.label}
            />
          </Section>

          <Section label="EXPERIENCE">
            <ChipRow
              items={EXPERIENCE}
              isActive={(x) => x.value === experience}
              onPress={(x) => setExperience(x.value)}
              labelOf={(x) => x.label}
            />
          </Section>

          <Section label="DAYS PER WEEK">
            <ChipRow
              items={DAYS}
              isActive={(d) => d === days}
              onPress={setDays}
              labelOf={(d) => `${d}`}
            />
          </Section>

          <Section label="SESSION LENGTH">
            <ChipRow
              items={DURATIONS}
              isActive={(d) => d === duration}
              onPress={setDuration}
              labelOf={(d) => `${d} min`}
            />
          </Section>

          <Section label="SPLIT">
            <ChipRow
              items={SPLITS}
              isActive={(s) => s.value === split}
              onPress={(s) => setSplit(s.value)}
              labelOf={(s) => s.label}
            />
          </Section>

          <Section label="EQUIPMENT AVAILABLE">
            <ChipRow
              items={EQUIPMENT}
              isActive={(e) => equipment.includes(e.value)}
              onPress={(e) => toggleEquipment(e.value)}
              labelOf={(e) => e.label}
            />
          </Section>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <Pressable
            onPress={onGenerate}
            disabled={generating}
            style={[styles.generateButton, { backgroundColor: colors.text }, generating && { opacity: 0.5 }]}
          >
            {generating ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.bg} />
                <Text style={[styles.generateText, { color: colors.bg }]}>Generate draft</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow<T>({
  items,
  isActive,
  onPress,
  labelOf,
}: {
  items: readonly T[];
  isActive: (item: T) => boolean;
  onPress: (item: T) => void;
  labelOf: (item: T) => string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chipRow}>
      {items.map((item, i) => {
        const active = isActive(item);
        return (
          <Pressable
            key={i}
            onPress={() => onPress(item)}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: active ? colors.text : "transparent" },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? colors.bg : colors.textSecondary }]}>
              {labelOf(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: spacing.lg },
  intro: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: spacing.md, lineHeight: 19 },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  generateButton: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  generateText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
