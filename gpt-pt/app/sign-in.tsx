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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return Alert.alert("Login error", error.message);
    router.replace("/(app)/(tabs)");
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
