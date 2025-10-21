import { useState } from "react";
import { View, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function WeightGoal() {
  const { updateForm } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<string>("");

  const goals = [
    "I want to lose weight",
    "I want to maintain my weight",
    "I want to gain weight",
    "I have a specific weight goal",
  ];

  const onNext = () => {
    if (!selectedGoal) return Alert.alert("Missing info", "Please select a goal.");
    updateForm({ weightGoal: selectedGoal });
    router.push("/onboarding/lifestyle");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          Set a weight goal
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          What do you want to work towards?
        </Text>

        {goals.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGoal(g)}
            style={{
              backgroundColor: selectedGoal === g ? colors.accent : colors.inputBg,
              borderRadius: 20,
              paddingVertical: 12,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: selectedGoal === g ? "#fff" : colors.textPrimary }}>{g}</Text>
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
