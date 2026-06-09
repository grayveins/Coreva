/**
 * PreWorkoutCheckin
 * 
 * Modal/sheet that appears before starting a workout.
 * Collects: Energy level + Any pain/discomfort areas
 * This data is used to auto-adjust the workout.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/context/ThemeContext";
import { readinessScale, bodyRegions, type ReadinessLevel, type BodyRegion } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";

type PreWorkoutCheckinProps = {
  visible: boolean;
  onClose: () => void;
  onStart: (data: CheckinData) => void;
  workoutType: string;
  estimatedDuration: number;
};

export type CheckinData = {
  readiness: ReadinessLevel;
  painAreas: BodyRegion[];
  adjustmentPercent: number;
};

export const PreWorkoutCheckin: React.FC<PreWorkoutCheckinProps> = ({
  visible,
  onClose,
  onStart,
  workoutType,
  estimatedDuration,
}) => {
  const { colors } = useTheme();
  
  const [readiness, setReadiness] = useState<ReadinessLevel>("moderate");
  const [painAreas, setPainAreas] = useState<BodyRegion[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const handleReadinessSelect = (level: ReadinessLevel) => {
    hapticPress();
    setReadiness(level);
  };

  const handlePainToggle = (area: BodyRegion) => {
    hapticPress();
    setPainAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleContinue = () => {
    hapticPress();
    setStep(2);
  };

  const handleStart = () => {
    hapticPress();
    const adjustment = readinessScale[readiness].adjustment;
    onStart({
      readiness,
      painAreas,
      adjustmentPercent: adjustment * 100,
    });
    // Reset for next time
    setStep(1);
    setPainAreas([]);
    setReadiness("moderate");
  };

  const handleClose = () => {
    setStep(1);
    setPainAreas([]);
    setReadiness("moderate");
    onClose();
  };

  const selectedLevel = readinessScale[readiness];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[styles.sheet, { backgroundColor: colors.card }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
                {step === 1 ? "Pre-Workout Check" : "Anything Off Today?"}
              </Text>
              <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textMuted }]}>
                {step === 1 
                  ? `${workoutType} • ~${estimatedDuration} min`
                  : "We'll adjust exercises if needed"
                }
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {step === 1 ? (
            /* Step 1: Energy/Readiness */
            <Animated.View entering={FadeIn.duration(200)}>
              <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                How&apos;s your energy level?
              </Text>
              
              <View style={styles.readinessGrid}>
                {(Object.keys(readinessScale) as ReadinessLevel[]).map((key) => {
                  const level = readinessScale[key];
                  const isSelected = readiness === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleReadinessSelect(key)}
                      style={[
                        styles.readinessCard,
                        { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
                      ]}
                    >
                      {/* Energy bars */}
                      <View style={styles.energyBarsLarge}>
                        {[1, 2, 3].map((bar) => {
                          const barHeight = 12 + (bar * 8);
                          const isFilled = bar <= level.barCount;
                          return (
                            <View
                              key={bar}
                              style={[
                                styles.energyBarLarge,
                                {
                                  height: barHeight,
                                  backgroundColor: isFilled
                                    ? (isSelected ? colors.primary : colors.textSecondary)
                                    : colors.border,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.readinessLabel,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {level.label}
                      </Text>
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.readinessDesc,
                          { color: isSelected ? colors.primary : colors.textMuted },
                        ]}
                      >
                        {level.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Continue Button */}
              <Pressable
                onPress={handleContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text allowFontScaling={false} style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>
                  Continue
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.textOnPrimary} />
              </Pressable>
            </Animated.View>
          ) : (
            /* Step 2: Pain/Discomfort Check */
            <Animated.View entering={FadeIn.duration(200)}>
              <Text allowFontScaling={false} style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Any pain or tightness? (Optional)
              </Text>
              
              <View style={styles.painGrid}>
                {(Object.keys(bodyRegions) as BodyRegion[]).map((key) => {
                  const region = bodyRegions[key];
                  const isSelected = painAreas.includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handlePainToggle(key)}
                      style={[
                        styles.painChip,
                        { backgroundColor: colors.bgSecondary, borderColor: colors.border },
                        isSelected && { borderColor: colors.intensity, backgroundColor: colors.errorMuted },
                      ]}
                    >
                      <Ionicons
                        name={region.icon}
                        size={18}
                        color={isSelected ? colors.intensity : colors.textMuted}
                      />
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.painChipText,
                          { color: isSelected ? colors.intensity : colors.text },
                        ]}
                      >
                        {region.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {painAreas.length > 0 && (
                <View style={[styles.adaptationCard, { backgroundColor: colors.primaryMuted }]}>
                  <View style={styles.adaptationHeader}>
                    <View style={[styles.adaptationIconContainer, { backgroundColor: colors.primary + "20" }]}>
                      <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                    </View>
                    <Text allowFontScaling={false} style={[styles.adaptationTitle, { color: colors.text }]}>
                      Adapting Your Workout
                    </Text>
                  </View>
                  
                  <Text allowFontScaling={false} style={[styles.adaptationBody, { color: colors.textSecondary }]}>
                    We&apos;ll modify exercises to work around your {painAreas.map(area => bodyRegions[area].label.toLowerCase()).join(" and ")}. Your progress won&apos;t be affected - we&apos;re optimizing for long-term results.
                  </Text>

                  <View style={styles.adaptationBullets}>
                    <View style={styles.adaptationBullet}>
                      <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                      <Text allowFontScaling={false} style={[styles.adaptationBulletText, { color: colors.textSecondary }]}>
                        High-stress movements will be swapped for safer alternatives
                      </Text>
                    </View>
                    <View style={styles.adaptationBullet}>
                      <Ionicons name="analytics" size={14} color={colors.primary} />
                      <Text allowFontScaling={false} style={[styles.adaptationBulletText, { color: colors.textSecondary }]}>
                        We&apos;ll track how it feels and adjust future sessions
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.adaptationNote, { backgroundColor: colors.card }]}>
                    <Ionicons name="bulb-outline" size={14} color={colors.textMuted} />
                    <Text allowFontScaling={false} style={[styles.adaptationNoteText, { color: colors.textMuted }]}>
                      Listen to your body. Skip any exercise that causes sharp pain.
                    </Text>
                  </View>
                </View>
              )}

              {/* Summary */}
              <View style={[styles.summary, { backgroundColor: colors.bgSecondary }]}>
                <View style={styles.summaryRow}>
                  <Text allowFontScaling={false} style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    Energy
                  </Text>
                  <Text allowFontScaling={false} style={[styles.summaryValue, { color: colors.text }]}>
                    {selectedLevel.label}
                  </Text>
                </View>
                {selectedLevel.adjustment !== 0 && (
                  <View style={styles.summaryRow}>
                    <Text allowFontScaling={false} style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Intensity adjustment
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.summaryValue,
                        { color: selectedLevel.adjustment > 0 ? colors.success : colors.intensity },
                      ]}
                    >
                      {selectedLevel.adjustment > 0 ? "+" : ""}{selectedLevel.adjustment * 100}%
                    </Text>
                  </View>
                )}
                {painAreas.length > 0 && (
                  <View style={styles.summaryRow}>
                    <Text allowFontScaling={false} style={[styles.summaryLabel, { color: colors.textMuted }]}>
                      Areas to watch
                    </Text>
                    <Text allowFontScaling={false} style={[styles.summaryValue, { color: colors.text }]}>
                      {painAreas.length} selected
                    </Text>
                  </View>
                )}
              </View>

              {/* Start Button */}
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text allowFontScaling={false} style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>
                  {painAreas.length > 0 ? "Start Adapted Workout" : "Start Workout"}
                </Text>
                <Ionicons name="play" size={20} color={colors.textOnPrimary} />
              </Pressable>

              {/* Back button */}
              <Pressable
                onPress={() => setStep(1)}
                style={styles.backButton}
              >
                <Text allowFontScaling={false} style={[styles.backButtonText, { color: colors.textMuted }]}>
                  Back
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 16,
  },
  readinessGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  readinessCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  energyBarsLarge: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 12,
    height: 40,
  },
  energyBarLarge: {
    width: 12,
    borderRadius: 3,
  },
  readinessLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  readinessDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  painGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  painChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  painChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  // Adaptation Card (shown when pain areas selected)
  adaptationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  adaptationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  adaptationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  adaptationTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  adaptationBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 12,
  },
  adaptationBullets: {
    gap: 8,
    marginBottom: 12,
  },
  adaptationBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  adaptationBulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  adaptationNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  adaptationNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  summary: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});

export default PreWorkoutCheckin;
