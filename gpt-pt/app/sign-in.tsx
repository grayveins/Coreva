import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { colors } from "../constants/Colors";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);

    try {
      // 1️⃣ Sign in the user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        Alert.alert("Login error", signInError.message);
        return;
      }

      const userId = signInData.user?.id;
      if (!userId) {
        Alert.alert("Error", "User not found after login.");
        return;
      }

      // 2️⃣ Check if profile exists
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // 3️⃣ If profile does not exist, create minimal profile
      if (profileError && profileError.code === "PGRST116") {
        const { data: newProfile, error: insertError } = await supabase.from("profiles").insert([
          {
            id: userId,
            onboarding_complete: false,
            created_at: new Date(),
          },
        ]).select().single();

        if (insertError) {
          Alert.alert("Error creating profile", insertError.message);
          return;
        }

        profile = newProfile; // use the newly created profile
      } else if (profileError) {
        // Other errors
        Alert.alert("Error fetching profile", profileError.message);
        return;
      }

      // 4️⃣ Redirect based on onboarding status
      const onboardingComplete = profile?.onboarding_complete ?? false;
      if (!onboardingComplete) {
        router.replace("/onboarding/start");
      } else {
        router.replace("/(app)/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 8,
        }}
      >
        Welcome back 👋
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          marginBottom: 24,
          fontSize: 15,
        }}
      >
        Log in to continue your Coreva journey.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: colors.inputBg,
          color: colors.textPrimary,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          marginBottom: 12,
        }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          backgroundColor: colors.inputBg,
          color: colors.textPrimary,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={onLogin}
        style={{
          backgroundColor: colors.buttonBg,
          opacity: loading ? 0.7 : 1,
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
          {loading ? "Logging in…" : "Log in"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/sign-up")}
        style={{ marginTop: 18 }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Don’t have an account?{" "}
          <Text style={{ color: colors.accent, fontWeight: "600" }}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
