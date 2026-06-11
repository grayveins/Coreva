import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { hasSupabaseConfig, supabaseConfigError } from "@/lib/supabase";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { ActiveWorkoutProvider } from "@/src/context/ActiveWorkoutContext";

// Hold the native splash until our fonts resolve so text never flashes in
// the fallback system font before Inter is ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // These four weights are the only Inter weights referenced across the app.
  // Until this was wired up they were declared in styles but never loaded,
  // so every `fontFamily: "Inter_*"` silently fell back to the system font
  // at regular weight.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Keep the splash up until fonts resolve (or fail) - rendering early would
  // show the unstyled fallback for a frame.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!hasSupabaseConfig) {
    return (
      <SafeAreaView style={styles.configSafe}>
        <StatusBar style="dark" />
        <View style={styles.configShell}>
          <View style={styles.configCard}>
            <Text style={styles.configEyebrow}>Build configuration issue</Text>
            <Text style={styles.configTitle}>
              ADPT cannot connect to Supabase in this build.
            </Text>
            <Text style={styles.configBody}>{supabaseConfigError}</Text>
            <Text style={styles.configBody}>
              Add EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY to the EAS preview environment,
              rebuild, then reinstall the app.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary label="App">
      <GestureHandlerRootView style={styles.gestureRoot}>
      <ThemeProvider>
        <KeyboardProvider>
          <ActiveWorkoutProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ gestureEnabled: false }} />
              <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
              <Stack.Screen name="sign-in" options={{ gestureEnabled: false }} />
              <Stack.Screen name="sign-up" options={{ gestureEnabled: false }} />
              <Stack.Screen name="settings" />

              <Stack.Screen
                name="(app)"
                options={{ gestureEnabled: false, animation: "fade" }}
              />

              <Stack.Screen
                name="onboarding"
                options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
              />

              <Stack.Screen
                name="(workout)"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                  gestureEnabled: true,
                }}
              />
            </Stack>
          </ActiveWorkoutProvider>
        </KeyboardProvider>
      </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  configSafe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  configShell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  configCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  configEyebrow: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "#2563EB",
  },
  configTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    color: "#0F172A",
  },
  configBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#475569",
  },
});
