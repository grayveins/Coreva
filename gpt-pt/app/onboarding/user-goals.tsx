import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

const goals = [
  { id: "fitness", label: "I have fitness goals", icon: "barbell-outline" },
  { id: "weight", label: "I have weight goals", icon: "scale-outline" },
  { id: "both", label: "I want both", icon: "flame-outline" },
];

export default function OnboardingUserGoals() {
  const { updateForm } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const onNext = () => {
    if (!selectedGoal) return;
    updateForm({ goal: selectedGoal });
    router.push("/onboarding/plan-summary");
  };

  const onSkip = () => {
    router.push("/onboarding/plan-summary");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: "space-between",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Section */}
          <View>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </TouchableOpacity>

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 28,
                fontWeight: "700",
                marginBottom: 8,
              }}
            >
              What’s your goal?
            </Text>

            <Text style={{ color: colors.textSecondary, marginBottom: 32 }}>
              This allows your coach to personalize your experience.
            </Text>

            {/* Goal Options */}
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                onPress={() => setSelectedGoal(goal.id)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor:
                    selectedGoal === goal.id ? colors.accent : colors.inputBg,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 14,
                }}
              >
                <Ionicons
                  name={goal.icon as any}
                  size={22}
                  color={selectedGoal === goal.id ? "#fff" : colors.textPrimary}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    color: selectedGoal === goal.id ? "#fff" : colors.textPrimary,
                    fontSize: 16,
                    fontWeight: "500",
                  }}
                >
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Section */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              disabled={!selectedGoal}
              onPress={onNext}
              style={{
                backgroundColor: selectedGoal
                  ? colors.buttonBg
                  : colors.inputBg,
                borderRadius: 50,
                paddingVertical: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: selectedGoal ? colors.buttonText : colors.textSecondary,
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Next
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSkip}>
              <Text
                style={{
                  textAlign: "center",
                  color: colors.textSecondary,
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
                I already have a goal plan
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
