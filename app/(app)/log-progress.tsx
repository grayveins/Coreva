/**
 * Log progress - body stats entry (weight + body fat %).
 *
 * Cal AI-style: chevron-back header, hero title with date, big card inputs
 * with prominent numerals, bottom-fixed primary CTA. Inter font throughout
 * to match the rest of the app.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { format } from "date-fns";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { spacing, radius } from "@/src/theme";
import { hapticPress, hapticSuccess } from "@/src/animations/feedback/haptics";
import { showToast } from "@/src/animations";

export default function LogProgress() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();

  const targetDate = params.date || new Date().toISOString().split("T")[0];
  const isToday = targetDate === new Date().toISOString().split("T")[0];
  const displayDate = format(new Date(targetDate + "T12:00:00"), "EEEE, MMM d");

  const [weight, setWeight] = useState("");
  const [fatPct, setFatPct] = useState("");
  const [saving, setSaving] = useState(false);

  const weightRef = useRef<TextInput>(null);

  // Autofocus the first field on mount so the keyboard is up immediately -
  // user came here to log a number, not to read.
  useEffect(() => {
    const t = setTimeout(() => weightRef.current?.focus(), 240);
    return () => clearTimeout(t);
  }, []);

  const canSave = !saving && (!!weight.trim() || !!fatPct.trim());

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    hapticPress();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Not signed in", "Please sign in again before saving.");
        return;
      }

      const weightKg = weight.trim() ? parseFloat(weight) / 2.205 : null;
      const fat = fatPct.trim() ? parseFloat(fatPct) : null;

      const { error } = await supabase.from("body_stats").upsert(
        {
          client_id: user.id,
          date: targetDate,
          weight_kg: weightKg ? Math.round(weightKg * 100) / 100 : null,
          body_fat_pct: fat,
          source: "manual",
        },
        { onConflict: "client_id,date,source" },
      );

      if (error) {
        Alert.alert("Couldn't save", error.message);
        return;
      }
      hapticSuccess();
      showToast({ message: "Progress logged", type: "exerciseComplete" });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        {/* Header - chevron-back, no border */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeIn.duration(220)}>
            {/* Hero title block */}
            <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
              Log progress
            </Text>
            <Text allowFontScaling={false} style={[styles.subtitle, { color: colors.textMuted }]}>
              {isToday ? "Today" : displayDate}
            </Text>

            {/* Inputs */}
            <NumberCard
              ref={weightRef}
              label="Body weight"
              unit="lbs"
              value={weight}
              onChangeText={setWeight}
              onSubmitEditing={() => {
                /* tab-down to fat % is implicit via keyboard return */
              }}
              colors={colors}
            />

            <NumberCard
              label="Body fat"
              unit="%"
              value={fatPct}
              onChangeText={setFatPct}
              colors={colors}
            />

            <Text
              allowFontScaling={false}
              style={[styles.hint, { color: colors.textMuted }]}
            >
              Enter at least one value. We&apos;ll update your trend automatically.
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.bg,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? colors.text : colors.bgSecondary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={saving ? "Saving" : "Save"}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.saveText,
                { color: canSave ? colors.bg : colors.textMuted },
              ]}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type NumberCardProps = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (v: string) => void;
  onSubmitEditing?: () => void;
  colors: any;
};

const NumberCard = React.forwardRef<TextInput, NumberCardProps>(
  ({ label, unit, value, onChangeText, onSubmitEditing, colors }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <View
        style={[
          styles.numberCard,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: focused ? colors.text : "transparent",
          },
        ]}
      >
        <Text
          allowFontScaling={false}
          style={[styles.numberLabel, { color: colors.textMuted }]}
        >
          {label}
        </Text>
        <View style={styles.numberRow}>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmitEditing}
            keyboardType="decimal-pad"
            placeholder="-"
            placeholderTextColor={colors.textMuted}
            style={[styles.numberInput, { color: colors.text }]}
            allowFontScaling={false}
            returnKeyType="done"
          />
          <Text
            allowFontScaling={false}
            style={[styles.numberUnit, { color: colors.textMuted }]}
          >
            {unit}
          </Text>
        </View>
      </View>
    );
  },
);
NumberCard.displayName = "NumberCard";

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },

  // Hero
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    marginBottom: 28,
  },

  // Number card
  numberCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 4,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  numberLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  numberInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    padding: 0,
  },
  numberUnit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  // Footer CTA
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
