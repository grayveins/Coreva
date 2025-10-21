import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";
import { RulerPicker } from "react-native-ruler-picker";

export default function SpecificGoal() {
  const { updateForm } = useOnboarding();
  const [weight, setWeight] = useState(150); // initial weight

  const onNext = () => {
    updateForm({ specificGoal: `${weight} lbs` });
    router.push("/onboarding/gym-focus");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingHorizontal: 24,
          paddingTop: 70,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 26,
            fontWeight: "700",
            marginBottom: 6,
          }}
        >
          Set a specific weight goal
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 30 }}>
          Be in control of your gains
        </Text>


        {/* Ruler Picker */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <RulerPicker
            min={80}
            max={300}
            step={1}
            fractionDigits={0}
            initialValue={weight}
            shortStepHeight={120}
            unit="lbs"
            unitTextStyle={{ color: colors.textSecondary, fontSize: 14 }} // ✅ ensures <Text>
            width={300}
            height={150}
            onValueChange={(value: string) => setWeight(Number(value))}
            onValueChangeEnd={(value: string) => setWeight(Number(value))}
          />
        </View>

        {/* Goal Rate Section */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 10,
          }}
        >
          What’s your target goal rate
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 10 }}>
          Recommended
        </Text>

        {/* Info Boxes */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 30,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginRight: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
              Daily budget
            </Text>
            <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 18 }}>
              1000kcal
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
              Projected date
            </Text>
            <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 18 }}>
              29 Sep 2025
            </Text>
          </View>
        </View>


        {/* Next Button */}
        <TouchableOpacity
          onPress={onNext}
          style={{
            backgroundColor: colors.buttonBg,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 16 }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}
