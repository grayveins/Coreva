import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingGender() {
  const { updateForm } = useOnboarding();
  const [selectedGender, setSelectedGender] = useState<string>("");
  const genders = ["Female", "Male", "Non-binary"];

  const onNext = () => {
    if (!selectedGender) {
      Alert.alert("Missing info", "Please select your gender.");
      return;
    }
    updateForm({ gender: selectedGender });
    router.push("/onboarding/user-info");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          What’s your gender?
        </Text>

        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          This allows your coach to personalize your experience.
        </Text>

        {genders.map((g) => (
          <TouchableOpacity
            key={g}
            onPress={() => setSelectedGender(g)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedGender === g ? colors.accent : colors.inputBg,
              borderRadius: 20,
              paddingVertical: 12,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: selectedGender === g ? "#fff" : colors.textPrimary,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: colors.buttonBg,
            borderRadius: 12,
            padding: 14,
            marginTop: 24,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: colors.buttonText,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
