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

type Msg = { role: "user" | "assistant"; content: string };

const C = {
  bg: "#F7FAFC",
  cardAI: "#EDF2F7",
  cardUser: "#4A5568",
  textDark: "#1A202C",
  textSub: "#4A5568",
  textOnAccent: "#FFFFFF",
  inputBg: "#FFFFFF",
  border: "#E2E8F0",
};

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I’m your AI coach. Ask about workouts or meals." },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Redirect if not logged in + load history
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/sign-in");
        return;
      }
      try {
        const res = await authedFetch("/chat/history", { method: "GET" });
        const hist = await res.json(); // [{role, content, created_at}... oldest -> newest]
        if (Array.isArray(hist) && hist.length > 0) {
          setMessages(hist.map((m: any) => ({ role: m.role, content: m.content })));
        }
      } catch (e) {
        console.log("history load error:", e);
      }
    });
  }, []);

  const send = async () => {
    const t = text.trim();
    if (!t || loading) return;

    const next = [...messages, { role: "user", content: t }];
    setMessages(next);
    setText("");
    setLoading(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      // POST to your backend /chat (JWT is added by authedFetch)
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
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Text style={{ color: C.textDark, fontSize: 20, fontWeight: "700" }}>Adaptive Coach</Text>
        <Text style={{ color: C.textSub, marginTop: 2 }}>Ask about workouts, meals, or macros</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <View key={i} style={{ marginBottom: 10, alignItems: isUser ? "flex-end" : "flex-start" }}>
              <View style={{
                maxWidth: "85%",
                backgroundColor: isUser ? C.cardUser : C.cardAI,
                paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12
              }}>
                <Text style={{ color: isUser ? C.textOnAccent : C.textDark }}>{m.content}</Text>
              </View>
            </View>
          );
        })}
        {loading && (
          <View style={{ alignItems: "flex-start" }}>
            <View style={{ backgroundColor: C.cardAI, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 }}>
              <Text style={{ color: C.textSub }}>Thinking…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, padding: 10, backgroundColor: C.bg }}>
        <View style={{
          flexDirection: "row", backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
          borderRadius: 12, paddingHorizontal: 10, alignItems: "center"
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={C.textSub}
            style={{ flex: 1, paddingVertical: 10, color: C.textDark }}
            multiline
          />
          <TouchableOpacity
            onPress={send}
            disabled={disabled}
            style={{
              marginLeft: 8, backgroundColor: disabled ? "#CBD5E0" : C.cardUser,
              borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "…" : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

