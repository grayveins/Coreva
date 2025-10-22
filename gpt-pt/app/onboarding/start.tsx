import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingStart() {
  const params = useLocalSearchParams();
  const email = Array.isArray(params.email) ? params.email[0] : params.email || "";
  const password = Array.isArray(params.password) ? params.password[0] : params.password || "";

  const { updateForm } = useOnboarding();
  const [name, setName] = useState("");

  const onNext = () => {
    if (!name) {
      Alert.alert("Missing info", "Please enter your name.");
      return;
    }

    updateForm({ name, email, password });
    router.push("/onboarding/gender");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, padding: 24, justifyContent: "flex-start" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
            What’s your first name?
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
            Welcome to your tailored bodybuilding experience.
          </Text>

          <TextInput
            placeholder="Tap anywhere to start typing"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={{
              backgroundColor: colors.inputBg,
              color: colors.textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 24,
            }}
          />

          <TouchableOpacity
            onPress={onNext}
            style={{
              backgroundColor: colors.buttonBg,
              borderRadius: 12,
              padding: 14,
              marginTop: "auto",
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
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
