import { View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function StartJourney() {
  const { updateForm } = useOnboarding();

  const onNext = () => {
    updateForm({ journeyStage: "started" });
    router.push("/onboarding/weight-goal");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          Let’s get you started on your journey
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          To get to know you better, we need some more information about you.
        </Text>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: colors.buttonBg,
            borderRadius: 12,
            padding: 14,
            marginBottom: 30,
          }}
        >
          <Text style={{ textAlign: "center", color: colors.buttonText, fontWeight: "700", fontSize: 16 }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
