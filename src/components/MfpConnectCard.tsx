/**
 * MfpConnectCard - instructional card teaching users how to bridge
 * MyFitnessPal (or any other tracker) into ADPT via Apple Health.
 *
 * MFP doesn't expose a public read API, so this is the realistic path:
 *   MFP → Apple Health → ADPT (read via HealthKit)
 *
 * The card deep-links to the Health app's Browse → Nutrition surface so
 * the user can verify data is actually flowing in. Dismissible - the
 * dismissal is persistent so we don't nag.
 *
 * Should be rendered ONLY when HealthKit is `likely_granted`. Showing it
 * when HealthKit isn't connected is a worse UX than not showing anything.
 */

import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";

const DISMISS_KEY = "@adpt/mfp_connect_card/dismissed";

export const MfpConnectCard: React.FC = () => {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => setDismissed(v === "1"))
      .catch(() => setDismissed(false));
  }, []);

  if (dismissed !== false) return null;

  const onOpenHealth = () => {
    hapticPress();
    // x-apple-health:// drops the user into the Health app. From there
    // they can navigate to Browse → Nutrition or Sources → MyFitnessPal
    // to verify writes. Apple doesn't provide a deep-link to specific
    // sub-screens, but landing in Health is the documented pattern.
    Linking.openURL("x-apple-health://").catch(() => {
      Linking.openURL("https://apps.apple.com/us/app/health/id1242545199");
    });
  };

  const onDismiss = async () => {
    hapticPress();
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.bgSecondary, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
          <Ionicons name="link" size={16} color={colors.text} />
        </View>
        <Text allowFontScaling={false} style={[styles.title, { color: colors.text }]}>
          Logging with MyFitnessPal?
        </Text>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      <Text allowFontScaling={false} style={[styles.body, { color: colors.textMuted }]}>
        Open MyFitnessPal → <Text style={{ color: colors.text }}>Settings → Apps → Apple Health</Text>{" "}
        and enable <Text style={{ color: colors.text }}>Calories</Text>,{" "}
        <Text style={{ color: colors.text }}>Protein</Text>,{" "}
        <Text style={{ color: colors.text }}>Carbs</Text>, and{" "}
        <Text style={{ color: colors.text }}>Fat</Text>. ADPT reads from Apple Health automatically - no separate connection needed.
      </Text>
      <Text allowFontScaling={false} style={[styles.body, { color: colors.textMuted, marginTop: 6 }]}>
        Same trick works for Cronometer, Lose It!, Carbon, and any other tracker that writes to Apple Health.
      </Text>
      <Pressable onPress={onOpenHealth} style={styles.cta}>
        <Text allowFontScaling={false} style={[styles.ctaText, { color: colors.text }]}>
          Open Apple Health →
        </Text>
      </Pressable>
    </View>
  );
};

export default MfpConnectCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  ctaText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
