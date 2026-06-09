/**
 * Tab Layout - Home, Calendar, Workouts, Meals, Chat.
 */

import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";
import { layout, spacing } from "@/src/theme";
import { FloatingActionButton } from "@/src/components/FloatingActionButton";
import { useUnreadMessages } from "@/src/hooks/useUnreadMessages";

/** Tab icon with spring scale on focus change */
function AnimatedTabIcon({
  name,
  outlineName,
  size,
  color,
  focused,
  children,
}: {
  name: keyof typeof Ionicons.glyphMap;
  outlineName: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  focused: boolean;
  children?: React.ReactNode;
}) {
  const scale = useSharedValue(focused ? 1.15 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, {
      damping: 12,
      stiffness: 200,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={focused ? name : outlineName} size={size} color={color} />
      {children}
    </Animated.View>
  );
}

// Simple centered header for Workout/Progress screens
function SimpleHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.simpleHeader, 
        { 
          backgroundColor: colors.bg,
          paddingTop: insets.top + spacing.sm,
        }
      ]}
    >
      <Text 
        allowFontScaling={false} 
        style={[styles.simpleHeaderTitle, { color: colors.text }]}
      >
        {title}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadMessages();
  // Tab bar configuration - use dynamic safe area
  // On home-indicator phones, insets.bottom is ~34, giving an ~83px bar.
  // On iPhone SE/SE2/SE3 (no home indicator), insets.bottom is 0 - without
  // the floor below, the bar collapses to 49px and the negative
  // paddingBottom math clips labels off-screen.
  const tabBarHeight = Platform.OS === "ios" ? Math.max(49 + insets.bottom, 64) : 60;
  const iconSize = 24;
  
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom - 6, 8) : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: typography.sizes.caption2,
          fontWeight: typography.weights.medium,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="home"
              outlineName="home-outline"
              size={iconSize}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="calendar"
              outlineName="calendar-outline"
              size={iconSize}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="workout"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="barbell"
              outlineName="barbell-outline"
              size={iconSize}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="restaurant"
              outlineName="restaurant-outline"
              size={iconSize}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name="chatbubble"
              outlineName="chatbubble-outline"
              size={iconSize}
              color={color}
              focused={focused}
            >
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.text }]} />
              )}
            </AnimatedTabIcon>
          ),
        }}
      />

      {/* Hidden legacy tabs - Expo Router requires the files to exist */}
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
    </Tabs>
    <FloatingActionButton />
    </>
  );
}

const styles = StyleSheet.create({
  simpleHeader: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.sm,
  },
  simpleHeaderTitle: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
