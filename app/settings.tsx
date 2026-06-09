/**
 * Settings Screen - Clean, minimal
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";

import { useTheme } from "@/src/context/ThemeContext";
import { useSubscription } from "@/src/hooks/useSubscription";
import { useReverseTrial } from "@/src/hooks/useReverseTrial";
import { useHealthKit } from "@/src/hooks/useHealthKit";
import { hapticPress } from "@/src/animations/feedback/haptics";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPro, isTrialing: rcTrialActive, restorePurchases } = useSubscription();
  const { isTrialActive: reverseTrial, daysRemaining } = useReverseTrial();
  const [hkUserId, setHkUserId] = useState<string | null>(null);
  // Resolve auth.uid once for the HealthKit hook so its body-stat upserts
  // can write under the right client_id. Cheap one-shot read.
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setHkUserId(data.user?.id ?? null));
  }, []);
  const {
    permissionState: hkPermissionState,
    requestAuth: requestHealthKitAuth,
  } = useHealthKit(hkUserId);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleManageSubscription = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
    }
  };

  const handleUpgrade = () => {
    hapticPress();
    router.push("/onboarding/editorial");
  };

  const handleRestore = async () => {
    hapticPress();
    await restorePurchases();
  };

  const handleAppleHealthRow = () => {
    hapticPress();
    if (hkPermissionState === "not_asked") {
      requestHealthKitAuth();
      return;
    }
    if (hkPermissionState === "likely_denied") {
      Linking.openURL("app-settings:").catch(() => {});
      return;
    }
    // likely_granted - deep link to Apple Health → Sources where the user
    // can adjust per-scope sharing. Fall back to system Settings if the
    // deep link is unavailable (older iOS or simulators).
    Linking.openURL("x-apple-health://Sources/").catch(() => {
      Linking.openURL("app-settings:").catch(() => {});
    });
  };

  const appleHealthValue =
    hkPermissionState === "likely_granted"
      ? "Connected"
      : hkPermissionState === "likely_denied"
        ? "Off - open Settings"
        : "Not connected";

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/sign-in");
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const isOnTrial = reverseTrial && !isPro;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text allowFontScaling={false} style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Subscription card ────────────────────────────────────── */}
        {isPro ? (
          <View style={[styles.proCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.proCardHeader}>
              <View style={[styles.proBadge, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="star" size={14} color={colors.primary} />
                <Text allowFontScaling={false} style={[styles.proBadgeText, { color: colors.primary }]}>
                  Pro
                </Text>
              </View>
              {rcTrialActive && (
                <View style={[styles.trialChip, { backgroundColor: colors.gold + "20" }]}>
                  <Text allowFontScaling={false} style={[styles.trialChipText, { color: colors.gold }]}>Trial</Text>
                </View>
              )}
            </View>
            <Pressable onPress={handleManageSubscription} style={[styles.manageBtn, { borderColor: colors.border }]}>
              <Text allowFontScaling={false} style={[styles.manageBtnText, { color: colors.text }]}>
                Manage Subscription
              </Text>
              <Ionicons name="open-outline" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleUpgrade} style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.upgradeLeft}>
              <View style={[styles.upgradeIcon, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="flash" size={20} color={colors.primary} />
              </View>
              <View style={styles.upgradeText}>
                <Text allowFontScaling={false} style={[styles.upgradeTitle, { color: colors.text }]}>
                  {isOnTrial ? `Pro Trial - ${daysRemaining}d left` : "Upgrade to Pro"}
                </Text>
                <Text allowFontScaling={false} style={[styles.upgradeSub, { color: colors.textMuted }]}>
                  {isOnTrial ? "Keep unlimited access" : "Unlimited workouts, full history & more"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* ── General ──────────────────────────────────────────────── */}
        <Section title="General" colors={colors}>
          <Row icon="notifications-outline" label="Notifications" colors={colors}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <Row icon="moon-outline" label="Dark Mode" value={isDark ? "On" : "Off"} colors={colors} last />
        </Section>

        {/* ── Account ──────────────────────────────────────────────── */}
        <Section title="Account" colors={colors}>
          <Row icon="refresh-outline" label="Restore Purchases" colors={colors} onPress={handleRestore} />
          <Row icon="log-out-outline" label="Sign Out" colors={colors} onPress={handleSignOut} destructive last />
        </Section>

        {/* ── Integrations (iOS only) ──────────────────────────────── */}
        {Platform.OS === "ios" && (
          <Section title="Integrations" colors={colors}>
            <Row
              icon="heart-outline"
              label="Apple Health"
              value={appleHealthValue}
              colors={colors}
              onPress={handleAppleHealthRow}
              last
            />
          </Section>
        )}

        {/* ── Support ──────────────────────────────────────────────── */}
        <Section title="Support" colors={colors}>
          <Row icon="help-circle-outline" label="Help & FAQ" colors={colors}
            onPress={() => Linking.openURL("mailto:support@adpt.fit")} />
          <Row icon="document-text-outline" label="Privacy Policy" colors={colors}
            onPress={() => Linking.openURL("https://adpt.fit/privacy")} />
          <Row icon="document-outline" label="Terms of Service" colors={colors}
            onPress={() => Linking.openURL("https://adpt.fit/terms")} last />
        </Section>

        {/* Version */}
        <Text allowFontScaling={false} style={[styles.version, { color: colors.disabledText }]}>
          ADPT v{appVersion}
        </Text>
      </ScrollView>
    </View>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function Section({ title, children, colors }: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.section}>
      <Text allowFontScaling={false} style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title}
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ icon, label, value, onPress, right, destructive, last, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  last?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={19} color={destructive ? colors.error : colors.textSecondary} />
      <Text allowFontScaling={false} style={[styles.rowLabel, { color: destructive ? colors.error : colors.text }]}>
        {label}
      </Text>
      {value && <Text allowFontScaling={false} style={[styles.rowValue, { color: colors.textMuted }]}>{value}</Text>}
      {right}
      {onPress && !right && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>{content}</Pressable>;
  }
  return content;
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 52, paddingHorizontal: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  // Pro card
  proCard: { borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, marginBottom: 24 },
  proCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  proBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  trialChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  trialChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  proSubtext: { fontSize: 13, fontFamily: "Inter_400Regular" },
  manageBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  manageBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // Upgrade card
  upgradeCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 24,
  },
  upgradeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  upgradeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  upgradeText: { flex: 1, gap: 2 },
  upgradeTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  upgradeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.6,
    marginBottom: 8, marginLeft: 4,
  },
  sectionCard: { borderRadius: 14, overflow: "hidden" },

  // Rows
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },

  // Version
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },
});
