/**
 * Global new-message banner for the mobile client app.
 *
 * HCI principles applied:
 *  - Visibility of system status: a brief banner surfaces a new message even
 *    when the user is on Workouts/Calendar/Meals, so they don't miss it.
 *  - Don't be annoying: never fires when the user is already on the chat
 *    screen (anti-pattern: notifying about something they're looking at).
 *  - Subtle by default: a soft haptic, no sound - this is the client app,
 *    used in gyms with phone face-down.
 *  - Recognition over recall: the banner shows a short preview of the message
 *    so the user can decide whether to interrupt their flow.
 */

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { useTheme } from "@/src/context/ThemeContext";
import { spacing, radius } from "@/src/theme";
import { hapticPress } from "@/src/animations/feedback/haptics";

type IncomingMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
};

const VISIBLE_MS = 4000;

export function MessageNotifier() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  // Stash the latest "is the user on chat?" in a ref so the realtime callback
  // (closed over once at subscribe time) sees the live value.
  const onChatRef = useRef(false);
  onChatRef.current = segments.some((s) => s === "chat");

  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState<IncomingMessage | null>(null);

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) setUserId(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifier:mobile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (onChatRef.current) return;

          setVisible(payload.new as IncomingMessage);
          hapticPress();

          translateY.value = withSequence(
            withTiming(0, { duration: 200 }),
            withDelay(VISIBLE_MS, withTiming(-120, { duration: 200 }))
          );
          opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(VISIBLE_MS, withTiming(0, { duration: 200 }))
          );

          if (dismissTimer.current) clearTimeout(dismissTimer.current);
          dismissTimer.current = setTimeout(() => {
            setVisible(null);
          }, VISIBLE_MS + 500);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [userId, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    // Render a hidden placeholder so the animated values stay attached and
    // the next message animates from the same node without flicker.
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.banner,
          { top: insets.top + spacing.sm },
          animatedStyle,
        ]}
      />
    );
  }

  const preview =
    visible.message_type === "text"
      ? (visible.content ?? "").slice(0, 140)
      : `[${visible.message_type}]`;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top + spacing.sm,
          backgroundColor: colors.text,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open message"
        onPress={() => {
          translateY.value = withTiming(-120, { duration: 200 });
          opacity.value = withTiming(0, { duration: 200 });
          router.push("/(app)/(tabs)/chat" as never);
        }}
        style={styles.row}
      >
        <View style={styles.textCol}>
          <Text
            allowFontScaling={false}
            style={[styles.title, { color: colors.bg }]}
          >
            New message
          </Text>
          {preview ? (
            <Text
              allowFontScaling={false}
              numberOfLines={2}
              style={[styles.body, { color: colors.bg }]}
            >
              {preview}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: "700" },
  body: { fontSize: 13, opacity: 0.9 },
});
