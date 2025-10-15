import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { colors } from "../constants/Colors";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return Alert.alert("Sign up error", error.message);

    Alert.alert(
      "Account created",
      "Please check your inbox to confirm your email."
    );
    router.replace("/sign-in");
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
        Create your account
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          marginBottom: 24,
          fontSize: 15,
        }}
      >
        Start your Coreva fitness journey today.
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
        onPress={onSignUp}
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
          {loading ? "Creating…" : "Sign up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/sign-in")}
        style={{ marginTop: 18 }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <Text style={{ color: colors.accent, fontWeight: "600" }}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
