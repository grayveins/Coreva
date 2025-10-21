import { useState } from "react";
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function GymLevel() {
  const { updateForm } = useOnboarding();
  const [selected, setSelected] = useState<string>("");

  const options = [
    { title: "Beginner", desc: "I'm just starting out" },
    { title: "Intermediate", desc: "I've been going for a while" },
    { title: "Advanced", desc: "I know what I'm doing" },
  ];

  const onNext = () => {
    if (!selected) return;
    updateForm({ gymLevel: selected });
    router.push("/onboarding/gym-days");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          How long have you been working out?
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          We’ll start with what you’re comfortable with.
        </Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.title}
            onPress={() => setSelected(opt.title)}
            style={{
              backgroundColor: selected === opt.title ? colors.accent : colors.inputBg,
              paddingVertical: 14,
              borderRadius: 20,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: selected === opt.title ? "#fff" : colors.textPrimary,
                fontWeight: "600",
              }}
            >
              {opt.title}
            </Text>
            <Text
              style={{
                textAlign: "center",
                color: selected === opt.title ? "#eee" : colors.textSecondary,
                fontSize: 12,
              }}
            >
              {opt.desc}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: selected ? colors.buttonBg : colors.inputBg,
            borderRadius: 50,
            padding: 14,
            marginBottom: 30,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: selected ? colors.buttonText : colors.textSecondary,
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
