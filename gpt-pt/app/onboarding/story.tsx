import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";

export default function Story() {
  const { updateForm } = useOnboarding();
  const [story, setStory] = useState("");

  const onNext = () => {
    updateForm({ story });
    router.push("/onboarding/breakdown");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          What’s your story?
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
          Tell us about your journey and what matters most to you.
        </Text>

        <TextInput
          placeholder="Tap anywhere to start typing"
          placeholderTextColor={colors.textSecondary}
          multiline
          value={story}
          onChangeText={setStory}
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

        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: colors.buttonBg,
            borderRadius: 50,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text style={{ textAlign: "center", color: colors.buttonText, fontWeight: "700", fontSize: 16 }}>
            Next
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/onboarding/breakdown")}>
          <Text style={{ textAlign: "center", color: colors.textSecondary, fontWeight: "500" }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
