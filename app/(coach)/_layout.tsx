/**
 * Coach route group - the coach-facing surface (roster + program builder).
 *
 * Guards on coach role: non-coaches are redirected home. Wrapped in an
 * ErrorBoundary per house rules (top-level route groups must be).
 */

import React from "react";
import { Stack, Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { useCoachRole } from "@/src/hooks/useCoachRole";

export default function CoachLayout() {
  const { colors } = useTheme();
  const { loading, isCoach } = useCoachRole();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isCoach) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <ErrorBoundary label="Coach">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="program-builder" />
      </Stack>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
