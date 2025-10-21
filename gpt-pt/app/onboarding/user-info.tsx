import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingUserInfo() {
  const { updateForm } = useOnboarding();

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [heightUnit, setHeightUnit] = useState<"in" | "cm">("in");

  const onNext = () => {
    if (!age || !weight || !height) {
      Alert.alert("Missing info", "Please fill out all fields.");
      return;
    }

    updateForm({
      age,
      weight: `${weight} ${weightUnit}`,
      height: `${height} ${heightUnit}`,
    });

    router.push("/onboarding/user-goals");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
            What’s your age?
          </Text>

          <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
            This allows your coach to personalize your experience.
          </Text>

          {/* AGE */}
          <TextInput
            placeholder="Enter your age"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
            style={{
              backgroundColor: colors.inputBg,
              color: colors.textPrimary,
              borderRadius: 12,
              padding: 14,
              marginBottom: 24,
            }}
          />

          {/* WEIGHT */}
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
            What’s your weight?
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              style={{
                flex: 1,
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                borderRadius: 12,
                padding: 14,
                marginRight: 10,
              }}
            />
            {(["lbs", "kg"] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => setWeightUnit(unit)}
                style={{
                  backgroundColor: weightUnit === unit ? colors.accent : colors.inputBg,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginLeft: 4,
                }}
              >
                <Text
                  style={{
                    color: weightUnit === unit ? "#fff" : colors.textPrimary,
                    fontWeight: "500",
                  }}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* HEIGHT */}
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
            What’s your height?
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
              style={{
                flex: 1,
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                borderRadius: 12,
                padding: 14,
                marginRight: 10,
              }}
            />
            {(["in", "cm"] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => setHeightUnit(unit)}
                style={{
                  backgroundColor: heightUnit === unit ? colors.accent : colors.inputBg,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginLeft: 4,
                }}
              >
                <Text
                  style={{
                    color: heightUnit === unit ? "#fff" : colors.textPrimary,
                    fontWeight: "500",
                  }}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={onNext}
            style={{
              backgroundColor: colors.buttonBg,
              borderRadius: 12,
              padding: 14,
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
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
