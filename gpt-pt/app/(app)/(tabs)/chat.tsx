import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { authedFetch } from "../../../lib/api";
import { Ionicons } from "@expo/vector-icons";

const colors = {
  background: "#0D0D0D",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0A0",
  accent: "#B7FF4A",
  buttonBg: "#B7FF4A",
  buttonText: "#0D0D0D",
  inputBg: "#1A1A1A",
  inputBorder: "#2A2A2A",
  card: "#1C1C1E",
};

type Msg = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I’m your AI coach. Ask about workouts or meals." },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auth check + load chat history
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/sign-in");
        return;
      }
      try {
        const res = await authedFetch("/chat/history", { method: "GET" });
        const hist = await res.json();
        if (Array.isArray(hist) && hist.length > 0) {
          setMessages(
            hist.map((m: any) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: String(m.content ?? ""),
            }))
          );
        }
      } catch (e) {
        console.log("history load error:", e);
      }
    });
  }, []);

  const send = async () => {
    const t = text.trim();
    if (!t || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setText("");
    setLoading(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      const res = await authedFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data?.reply ?? "Sorry, I couldn’t process that.";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: "Server error. Try again." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const disabled = !text.trim() || loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.inputBorder,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700" }}>
          Adaptive Coach
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <View
              key={i}
              style={{
                marginBottom: 12,
                alignItems: isUser ? "flex-end" : "flex-start",
              }}
            >
              {isUser ? (
                <View
                  style={{
                    backgroundColor: colors.accent,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 16,
                    maxWidth: "85%",
                  }}
                >
                  <Text
                    style={{
                      color: colors.buttonText,
                      fontSize: 15,
                      lineHeight: 20,
                    }}
                  >
                    {m.content}
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 15,
                    lineHeight: 22,
                    backgroundColor: "transparent",
                  }}
                >
                  {m.content}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Coach is thinking bar */}
      {loading && (
        <View
          style={{
            backgroundColor: colors.card,
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="pulse" size={16} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "600" }}>
            Coach is thinking
          </Text>
        </View>
      )}

      {/* Composer */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.inputBorder,
          padding: 10,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: 12,
            paddingHorizontal: 10,
          }}
        >
          {/* + button */}
          <TouchableOpacity
            style={{
              marginRight: 8,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={20} color={colors.buttonText} />
          </TouchableOpacity>

          {/* Input */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Send a message"
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              paddingVertical: 10,
              color: colors.textPrimary,
              fontSize: 15,
            }}
            multiline
          />

          {/* Send */}
          <TouchableOpacity
            onPress={send}
            disabled={disabled}
            style={{
              marginLeft: 8,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: disabled ? "#333" : colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={disabled ? "#777" : colors.buttonText}
              style={{ transform: [{ rotate: "45deg" }] }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
