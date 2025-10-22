import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Password conditions
  const isLengthValid = password.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // SignUp.tsx
  const onSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return Alert.alert("Sign up error", error.message);

    Alert.alert(
      "Check your email",
      "A confirmation email has been sent. Please verify your email to continue."
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
      {/* 🔙 Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: "absolute", top: 60, left: 24 }}
      >
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Create your account
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          marginBottom: 24,
          fontSize: 15,
          textAlign: "center",
        }}
      >
        Start your Coreva fitness journey today.
      </Text>

      {/* Email Input */}
      <TextInput
        placeholder="Enter your email address"
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

      {/* Password Input */}
      <TextInput
        placeholder="Enter your password"
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
          marginBottom: 10,
        }}
      />

      {/* ✅ Password Requirements */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Ionicons
            name={isLengthValid ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={isLengthValid ? "limegreen" : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={{ color: colors.textSecondary }}>Must be at least 8 characters</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={hasSpecialChar ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={hasSpecialChar ? "limegreen" : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={{ color: colors.textSecondary }}>Must contain one special character</Text>
        </View>
      </View>

      {/* ✅ Complete button */}
      <TouchableOpacity
        disabled={loading}
        onPress={onSignUp}
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
          {loading ? "Creating Account..." : "Sign Up"}
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
