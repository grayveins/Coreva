import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/Colors";
import { useOnboarding } from "../context/OnboardingContext";
import { supabase } from "../../lib/supabase"; // make sure this path is correct
import { useState } from "react";

export default function Breakdown() {
  const { form } = useOnboarding();
  const [loading, setLoading] = useState(false);

  const onComplete = async () => {
    try {
      setLoading(true);

      // Step 1: Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: form.email!,
        password: form.password!,
      });

      if (error) {
        Alert.alert("Sign up error", error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        Alert.alert("Unexpected error", "No user returned from Supabase.");
        setLoading(false);
        return;
      }

      // Step 2: Save onboarding data to profiles table
      const { error: insertError } = await supabase.from("profiles").insert([
        {
          id: user.id, // must match your profiles schema
          gender: form.gender,
          age: form.age,
          weight: form.weight,
          height: form.height,
          goal: form.goal,
          weight_goal: form.weightGoal,
          lifestyle: form.lifestyle,
          specific_goal: form.specificGoal,
          gym_focus: form.gymFocus,
          gym_equipment: form.gymEquipment,
          gym_level: form.gymLevel,
          gym_days: form.gymDays,
          story: form.story,
          created_at: new Date(),
        },
      ]);

      if (insertError) {
        Alert.alert("Database error", insertError.message);
        setLoading(false);
        return;
      }

      Alert.alert("Success", "Your account has been created!");
      router.replace("/sign-in");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 80 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
        Your plan breakdown
      </Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>
        Review your info and complete your signup.
      </Text>

      {/* Summary preview */}
      <View style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Email</Text>
        <Text style={{ color: colors.textSecondary }}>{form.email}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: "600", marginTop: 12 }}>Goal</Text>
        <Text style={{ color: colors.textSecondary }}>{form.goal || "—"}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: "600", marginTop: 12 }}>Gym Level</Text>
        <Text style={{ color: colors.textSecondary }}>{form.gymLevel || "—"}</Text>
      </View>

      {/* ✅ Complete button */}
      <TouchableOpacity
        disabled={loading}
        onPress={onComplete}
        style={{
          backgroundColor: colors.buttonBg,
          borderRadius: 50,
          padding: 16,
          opacity: loading ? 0.6 : 1,
          marginBottom: 40,
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
          {loading ? "Creating Account..." : "Complete"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
