/**
 * Sign Up Screen - Clean, animated
 */

import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";

const LOGO = require("@/assets/images/icon.png");

export default function SignUp() {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const canSubmit = hasMinLength && hasSymbol;

  const onSignUp = async () => {
    if (!canSubmit) { Alert.alert("Password needs work", "Use at least 8 characters and 1 symbol."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { Alert.alert("Sign up error", error.message); return; }
    Alert.alert("Check your email", "We sent a confirmation link. Verify to finish creating your account.");
    router.replace("/sign-in");
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top row: back + logo */}
          <Animated.View entering={FadeInDown.duration(300)} style={s.topRow}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View style={s.backBtn} />
          </Animated.View>

          <View style={s.topSpacer} />

          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.header}>
            <Text allowFontScaling={false} style={s.title}>Create account</Text>
            <Text allowFontScaling={false} style={s.subtitle}>
              Takes 30 seconds. We timed it.
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.form}>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholderTextColor={colors.inputPlaceholder}
                style={s.input}
                keyboardAppearance="dark"
              />
            </View>

            <View>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  textContentType="newPassword"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={s.input}
                  keyboardAppearance="dark"
                />
              </View>
              {/* Requirements */}
              <View style={s.reqs}>
                <View style={s.reqRow}>
                  <Ionicons
                    name={hasMinLength ? "checkmark-circle" : "ellipse-outline"}
                    size={15}
                    color={hasMinLength ? colors.success : colors.disabledText}
                  />
                  <Text allowFontScaling={false} style={[s.reqText, hasMinLength && { color: colors.success }]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={s.reqRow}>
                  <Ionicons
                    name={hasSymbol ? "checkmark-circle" : "ellipse-outline"}
                    size={15}
                    color={hasSymbol ? colors.success : colors.disabledText}
                  />
                  <Text allowFontScaling={false} style={[s.reqText, hasSymbol && { color: colors.success }]}>
                    At least 1 symbol
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={onSignUp}
              disabled={loading || !canSubmit}
              style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
            >
              <Text allowFontScaling={false} style={s.btnText}>
                {loading ? "Creating account..." : "Create account"}
              </Text>
            </Pressable>
          </Animated.View>

          <View style={s.spacer} />

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.footer}>
            <Pressable onPress={() => router.replace("/sign-in")}>
              <Text allowFontScaling={false} style={s.footerText}>
                Already have an account?{" "}
                <Text style={s.footerLink}>Log in</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 },
    topSpacer: { flex: 0.4 },
    spacer: { flex: 1 },

    topRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    },
    logo: {
      width: 44, height: 44, borderRadius: 10,
    },

    header: { alignItems: "center", marginBottom: 32, gap: 8 },
    title: { color: colors.text, fontSize: 28, fontFamily: "Inter_600SemiBold" },
    subtitle: { color: colors.textMuted, fontSize: 15, fontFamily: "Inter_400Regular" },

    form: { gap: 14 },
    inputWrap: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.bgTertiary, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16,
    },
    input: {
      flex: 1, color: colors.text, fontSize: 16,
      fontFamily: "Inter_400Regular", paddingVertical: 16,
    },
    reqs: { marginTop: 10, gap: 6, paddingLeft: 4 },
    reqRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    reqText: { color: colors.disabledText, fontSize: 13, fontFamily: "Inter_400Regular" },

    btn: {
      height: 56, borderRadius: 28, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center", marginTop: 4,
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: colors.textOnPrimary, fontSize: 17, fontFamily: "Inter_600SemiBold" },

    footer: { alignItems: "center", paddingBottom: 8 },
    footerText: { color: colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" },
    footerLink: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  });
