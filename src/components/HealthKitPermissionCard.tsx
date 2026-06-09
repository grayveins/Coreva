/**
 * Apple Health permission prompt + denied-state recovery affordance.
 * Sits above the metric cards on Home and only renders on iOS.
 *
 * State machine:
 *   not_asked       → "Connect Apple Health" CTA → calls onConnect()
 *   likely_granted  → component renders nothing
 *   likely_denied   → "Open Settings" deep link (system Settings, not the
 *                     Health app - that's the only place the user can
 *                     re-grant scopes once denied)
 *   unsupported     → renders nothing (Android, simulator without HK)
 *
 * Dismissable in the denied state; dismissal persists under
 * "@adpt/healthkit/dismissed" so we don't nag.
 */

import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";
import type { HealthKitPermissionState } from "@/src/hooks/useHealthKit";

const DISMISSED_KEY = "@adpt/healthkit/dismissed";

export function HealthKitPermissionCard({
  state,
  onConnect,
}: {
  state: HealthKitPermissionState;
  onConnect: () => void;
}) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((v) => {
      if (v === "1") setDismissed(true);
    });
  }, []);

  if (state === "unsupported" || state === "likely_granted") return null;
  if (state === "likely_denied" && dismissed) return null;

  const handleConnect = () => {
    hapticPress();
    onConnect();
  };

  const handleOpenSettings = () => {
    hapticPress();
    Linking.openURL("app-settings:").catch(() => {
      // No good fallback - silently swallow if iOS rejects the URL.
    });
  };

  const handleDismiss = async () => {
    hapticPress();
    setDismissed(true);
    await AsyncStorage.setItem(DISMISSED_KEY, "1");
  };

  if (state === "not_asked") {
    return (
      <Pressable
        onPress={handleConnect}
        style={[styles.card, { backgroundColor: colors.bgSecondary }]}
        accessibilityRole="button"
        accessibilityLabel="Connect Apple Health"
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
          <Ionicons name="heart-outline" size={20} color={colors.text} />
        </View>
        <View style={styles.body}>
          <Text
            allowFontScaling={false}
            style={[styles.title, { color: colors.text }]}
          >
            Connect Apple Health
          </Text>
          <Text
            allowFontScaling={false}
            style={[styles.subtitle, { color: colors.textMuted }]}
          >
            Sync your weight, steps, and active energy automatically.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </Pressable>
    );
  }

  // likely_denied - small dismissable nudge, not a full CTA.
  return (
    <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
        <Ionicons name="heart-dislike-outline" size={18} color={colors.textMuted} />
      </View>
      <View style={styles.body}>
        <Text
          allowFontScaling={false}
          style={[styles.title, { color: colors.text }]}
        >
          Apple Health is off
        </Text>
        <Pressable onPress={handleOpenSettings} hitSlop={6}>
          <Text
            allowFontScaling={false}
            style={[styles.link, { color: colors.text }]}
          >
            Open Settings to re-enable
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={handleDismiss} hitSlop={10} style={styles.dismiss}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    minHeight: 64,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  subtitle: { fontSize: 13 },
  link: { fontSize: 13, fontWeight: "600", textDecorationLine: "underline" },
  chevron: { marginLeft: 4 },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
