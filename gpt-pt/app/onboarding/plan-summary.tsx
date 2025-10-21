import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function PlanSummary() {
  const { updateForm } = useOnboarding();
  const [planSummary, setPlanSummary] = useState("");

  const onNext = () => {
    if (!planSummary.trim()) {
      return;
    }
    updateForm({ planSummary });
    router.push("/onboarding/start-journey");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          Tell us about your plan
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          Give us a quick summary of your plan and the coach will build out the rest.
        </Text>

        {/* Input */}
        <TextInput
          placeholder="Tap anywhere to start typing"
          placeholderTextColor={colors.textSecondary}
          multiline
          value={planSummary}
          onChangeText={setPlanSummary}
          style={{
            backgroundColor: colors.inputBg,
            color: colors.textPrimary,
            borderRadius: 12,
            padding: 14,
            minHeight: 120,
            textAlignVertical: "top",
            marginBottom: 24,
          }}
        />

        {/* Next Button */}
        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: planSummary ? colors.buttonBg : colors.inputBg,
            borderRadius: 50,
            padding: 14,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: planSummary ? colors.buttonText : colors.textSecondary,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
