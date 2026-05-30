/**
 * ExerciseSwapModal — Exercise substitution
 *
 * Sources alternatives from the real Supabase `exercises` library (same data
 * as the Add-Exercise picker) instead of a hardcoded list, so swaps include
 * the full curated library + custom exercises and preserve the exercise id for
 * history/PR tracking. Results are sorted so movements sharing the current
 * exercise's primary muscles surface first; a search box narrows further.
 *
 * Deliberately filter-light: no equipment/muscle chips. A swap is a quick
 * "find me something similar" action, not a library browse.
 */

import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { useExercises, type DBExercise } from "@/src/hooks/useExercises";

export type SwapSelection = {
  id: string;
  name: string;
  muscles: string[];
};

type ExerciseSwapModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: SwapSelection) => void;
  currentExercise: string;
  currentMuscles: string[];
};

export const ExerciseSwapModal: React.FC<ExerciseSwapModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  currentExercise,
  currentMuscles,
}) => {
  const { colors } = useTheme();
  const { exercises, loading, search, setSearch } = useExercises();

  const targetMuscles = useMemo(
    () => new Set(currentMuscles.map((m) => m.toLowerCase())),
    [currentMuscles]
  );

  // `exercises` is already search-filtered by the hook. Exclude the current
  // movement, then rank by how many primary muscles overlap with it so the
  // closest substitutes float to the top.
  const results = useMemo(() => {
    const currentLower = currentExercise.trim().toLowerCase();
    const overlap = (ex: DBExercise) =>
      (ex.primary_muscles ?? []).filter((m) => targetMuscles.has(m.toLowerCase())).length;
    return exercises
      .filter((ex) => ex.name.toLowerCase() !== currentLower)
      .map((ex) => ({ ex, score: overlap(ex) }))
      .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
      .map((r) => r.ex);
  }, [exercises, currentExercise, targetMuscles]);

  const handleSelect = (ex: DBExercise) => {
    hapticPress();
    onSelectExercise({
      id: ex.id,
      name: ex.name,
      muscles: ex.primary_muscles ?? [],
    });
    onClose();
  };

  const renderItem = ({ item }: { item: DBExercise }) => (
    <Pressable
      onPress={() => handleSelect(item)}
      style={({ pressed }) => [
        styles.exerciseRow,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.bgSecondary },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Swap to ${item.name}`}
    >
      <View style={styles.exerciseInfo}>
        <Text allowFontScaling={false} style={[styles.exerciseName, { color: colors.text }]}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          {item.equipment && (
            <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textMuted }]}>
              {item.equipment}
            </Text>
          )}
          {(item.primary_muscles ?? []).length > 0 && (
            <Text allowFontScaling={false} style={[styles.metaText, { color: colors.textSecondary }]}>
              {(item.primary_muscles ?? []).join(" · ")}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
            Swap Exercise
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Replacing indicator */}
        <View style={[styles.currentExercise, { backgroundColor: colors.bgSecondary }]}>
          <Text allowFontScaling={false} style={[styles.currentLabel, { color: colors.textMuted }]}>
            REPLACING
          </Text>
          <Text allowFontScaling={false} style={[styles.currentName, { color: colors.text }]}>
            {currentExercise}
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises..."
              placeholderTextColor={colors.inputPlaceholder}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="barbell-outline" size={48} color={colors.textMuted} />
                <Text allowFontScaling={false} style={[styles.emptyText, { color: colors.textMuted }]}>
                  No exercises found.{"\n"}Try a different search.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  currentExercise: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentName: {
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  searchContainer: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: 40,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  exerciseInfo: { flex: 1, gap: 4 },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ExerciseSwapModal;
