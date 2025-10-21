import { useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function GymDays() {
  const { updateForm } = useOnboarding();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onNext = () => {
    if (selectedDays.length === 0) return;
    updateForm({ gymDays: selectedDays });
    router.push("/onboarding/story");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          How many days do you want to work out for?
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          Let’s start at your own pace.
        </Text>

        {days.map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => toggleDay(day)}
            style={{
              backgroundColor: selectedDays.includes(day) ? colors.accent : colors.inputBg,
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: selectedDays.includes(day) ? "#fff" : colors.textPrimary,
                fontWeight: "500",
              }}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: selectedDays.length ? colors.buttonBg : colors.inputBg,
            borderRadius: 50,
            padding: 14,
            marginBottom: 30,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: selectedDays.length ? colors.buttonText : colors.textSecondary,
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
