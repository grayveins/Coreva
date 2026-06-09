/**
 * In-app meal plan viewer.
 *
 * Loads the signed Supabase storage URL inside a WebView so the user never
 * sees the bare `<project-ref>.supabase.co` URL that SFSafariViewController
 * otherwise exposes. Header is our own chrome (chevron-back + plan title).
 *
 * The signed URL is regenerated on this screen - we don't pass it through
 * the navigation stack, only the storage path + title.
 */

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import { useTheme } from "@/src/context/ThemeContext";
import { spacing } from "@/src/theme";
import { supabase } from "@/lib/supabase";

export default function ViewMealPlanScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ path?: string; title?: string }>();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.path) {
      setError("Missing plan");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.storage
        .from("meal-plans")
        .createSignedUrl(params.path as string, 3600);
      if (cancelled) return;
      if (err || !data?.signedUrl) {
        setError(err?.message ?? "Could not load plan");
        return;
      }
      setSignedUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.path]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.text }]}
        >
          {params.title || "Meal plan"}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {error ? (
        <View style={styles.center}>
          <Text allowFontScaling={false} style={{ color: colors.textMuted }}>
            {error}
          </Text>
        </View>
      ) : !signedUrl ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <WebView
          source={{ uri: signedUrl }}
          style={{ flex: 1, backgroundColor: colors.bg }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator color={colors.text} />
            </View>
          )}
          // PDFs render natively inside WKWebView on iOS.
          // No JavaScript needed; disabling cuts the attack surface.
          javaScriptEnabled={false}
          domStorageEnabled={false}
          // The URL bar is never shown - we own this chrome.
          allowsBackForwardNavigationGestures={false}
        />
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
    paddingVertical: 12,
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
