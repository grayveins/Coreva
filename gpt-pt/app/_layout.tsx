import { Stack } from "expo-router";
import { OnboardingProvider } from "./context/OnboardingContext";

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingProvider>
  );
}
