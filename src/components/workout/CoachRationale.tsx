/**
 * CoachRationale
 *
 * Collapsible card that explains WHY the AI chose specific exercises,
 * weights, and programming for the user. Key differentiator - no
 * competitor does this.
 *
 * Collapsed: single line "Your coach adapted today's workout" + chevron
 * Expanded: list of RationaleItem cards with icon, title, detail
 */

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/context/ThemeContext";
import type { RationaleItem, RationaleType } from "@/lib/workout/engine/rationale";

// =============================================================================
// TYPES
// =============================================================================

type CoachRationaleProps = {
  items: RationaleItem[];
  limitationAreas?: string[];
};

// =============================================================================
// TYPE → COLOR MAP
// =============================================================================

function useTypeColor(type: RationaleType): string {
  const { colors } = useTheme();

  switch (type) {
    case "selection":
      return colors.primary;
    case "progression":
      return colors.gold;
    case "adaptation":
      return colors.intensity;
    case "recovery":
      return colors.success;
    default:
      return colors.primary;
  }
}

// =============================================================================
// RATIONALE ROW
// =============================================================================

function RationaleRow({
  item,
  isLast,
  limitationAreas,
}: {
  item: RationaleItem;
  isLast: boolean;
  limitationAreas?: string[];
}) {
  const { colors } = useTheme();
  const iconColor = useTypeColor(item.type);

  // Highlight if this item mentions a limitation area
  const isHighlighted =
    item.type === "adaptation" &&
    limitationAreas != null &&
    limitationAreas.length > 0;

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={item.icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text
          allowFontScaling={false}
          style={[
            styles.rowTitle,
            { color: isHighlighted ? colors.intensity : colors.text },
          ]}
        >
          {item.title}
        </Text>
        <Text
          allowFontScaling={false}
          style={[styles.rowDetail, { color: colors.textSecondary }]}
        >
          {item.detail}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CoachRationale({ items, limitationAreas }: CoachRationaleProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Animation values
  const rotation = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);

    rotation.value = withSpring(next ? 1 : 0, { damping: 15, stiffness: 400 });
    contentHeight.value = withTiming(next ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    contentOpacity.value = withTiming(next ? 1 : 0, {
      duration: next ? 300 : 150,
    });
  }, [expanded, rotation, contentHeight, contentOpacity]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: contentHeight.value * 600, // generous max
    opacity: contentOpacity.value,
    overflow: "hidden" as const,
  }));

  if (items.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: colors.primary,
        },
      ]}
    >
      {/* Collapsed header - always visible */}
      <Pressable
        onPress={toggle}
        style={styles.header}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          <Text allowFontScaling={false} style={[styles.headerText, { color: colors.text }]}>
            Your coach adapted today&apos;s workout
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Animated.View>
      </Pressable>

      {/* Expanded body */}
      <Animated.View style={bodyStyle}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {items.map((item, i) => (
          <RationaleRow
            key={`${item.type}-${i}`}
            item={item}
            isLast={i === items.length - 1}
            limitationAreas={limitationAreas}
          />
        ))}
      </Animated.View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerText: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDetail: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CoachRationale;
