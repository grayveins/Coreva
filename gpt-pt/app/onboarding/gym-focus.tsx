import { useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function GymFocus() {
  const { updateForm } = useOnboarding();
  const [focus, setFocus] = useState<string>("");

  const focuses = ["Gain Strength", "Gain Muscle", "A balance of both"];

  const onNext = () => {
    if (!focus) return Alert.alert("Missing info", "Please select your focus.");
    updateForm({ gymFocus: focus });
    router.push("/onboarding/gym-equipment"); // ✅ next step
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          What’s your main focus going to the gym?
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          We’ll adjust your plan based on your focus.
        </Text>

        {focuses.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFocus(f)}
            style={{
              backgroundColor: focus === f ? colors.accent : colors.inputBg,
              borderRadius: 20,
              paddingVertical: 12,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: focus === f ? "#fff" : colors.textPrimary }}>{f}</Text>
          </TouchableOpacity>
        ))}

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
