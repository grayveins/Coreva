import { useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function Lifestyle() {
  const { updateForm } = useOnboarding();
  const [selected, setSelected] = useState<string>("");

  const lifestyles = ["Sedentary", "Light exercise", "Medium exercise", "Heavy exercise"];

  const onNext = () => {
    if (!selected) return Alert.alert("Missing info", "Please select your lifestyle.");
    updateForm({ lifestyle: selected });
    router.push("/onboarding/specific-goal");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          What’s your lifestyle?
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          We’ll adjust your meal plan based on your lifestyle.
        </Text>

        {lifestyles.map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setSelected(l)}
            style={{
              backgroundColor: selected === l ? colors.accent : colors.inputBg,
              borderRadius: 20,
              paddingVertical: 12,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: selected === l ? "#fff" : colors.textPrimary }}>{l}</Text>
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
