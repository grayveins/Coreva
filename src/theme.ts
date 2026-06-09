/**
 * ADPT Design System v4 — Minimal Black & White
 *
 * Design reference: Cal AI light mode
 * - White background, black text, no color accents
 * - Soft rounded cards on #F5F5F5 surfaces
 * - Single light theme (no dark mode in v1)
 *
 * HCI Standards:
 * - Touch targets: 56pt primary CTAs, 48pt secondary
 * - WCAG AA contrast: 4.5:1 text, 3:1 UI components
 * - Spacing: 4px base grid
 */

import { Platform } from "react-native";

// =============================================================================
// COLORS — Single light theme (Cal AI inspired)
// =============================================================================
const colors = {
  // Backgrounds
  bg: "#FFFFFF",
  bgSecondary: "#F5F5F5",
  bgTertiary: "#F0F0F0",

  // Primary — black CTAs, active states
  primary: "#000000",
  primaryDark: "#000000",
  primaryLight: "#333333",
  primaryMuted: "rgba(0, 0, 0, 0.06)",
  primaryFaint: "rgba(0, 0, 0, 0.03)",

  // Success — completed states only
  success: "#22C55E",
  successDark: "#16A34A",
  successMuted: "rgba(34, 197, 94, 0.10)",

  // Functional accents (use sparingly)
  intensity: "#000000",
  gold: "#000000",

  // Semantic
  error: "#EF4444",
  errorMuted: "rgba(239, 68, 68, 0.10)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.10)",
  info: "#6B7280",
  infoMuted: "rgba(107, 114, 128, 0.10)",

  // Text
  text: "#000000",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnPrimary: "#FFFFFF",

  // UI Elements
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  card: "#FFFFFF",
  cardAlt: "#F9FAFB",
  overlay: "rgba(0, 0, 0, 0.4)",

  // Interactive
  pressed: "rgba(0, 0, 0, 0.08)",
  selected: "rgba(0, 0, 0, 0.05)",
  disabled: "#F3F4F6",
  disabledText: "#D1D5DB",

  // Input
  inputBg: "#FFFFFF",
  inputBorder: "#E5E7EB",
  inputBorderFocus: "#000000",
  inputPlaceholder: "#9CA3AF",

  // Tab Bar
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#F3F4F6",
  tabBarActive: "#000000",
  tabBarInactive: "#9CA3AF",

  // Progress
  progressBg: "#E5E7EB",
  progressFill: "#000000",

  // Legacy compatibility aliases
  bgTop: "#FFFFFF",
  muted: "#6B7280",
  muted2: "#9CA3AF",
  chip: "#000000",
  ringBg: "#E5E7EB",
  accent: "#000000",
  accentMuted: "rgba(0, 0, 0, 0.06)",
  selectedBg: "rgba(0, 0, 0, 0.05)",
  pressedBg: "rgba(0, 0, 0, 0.08)",
  hoverBg: "rgba(0, 0, 0, 0.03)",
  shadow: "rgba(0, 0, 0, 0.04)",
  shadowStrong: "rgba(0, 0, 0, 0.08)",
} as const;

// Both aliases point to the same palette (no dark mode in v1)
export const darkColors = colors;
export const lightColors = colors;

// =============================================================================
// SPACING - 4px base grid
// =============================================================================
export const spacing = {
  xs: 4,       // Tight inline, icon padding
  sm: 8,       // Between related items
  md: 12,      // Default component internal padding
  base: 16,    // Standard gap
  lg: 20,      // Section padding (matches screenPadding)
  xl: 24,      // Between major sections
  xxl: 32,     // Large separations
  xxxl: 48,    // Screen-level
} as const;

// Alias for backward compatibility
export const space = {
  ...spacing,
  
  // Semantic aliases
  screenPadding: 20,   // Horizontal screen padding
  cardPadding: 16,     // Inside cards
  sectionGap: 24,      // Between sections
  itemGap: 12,         // Between list items
  
  // Legacy aliases
  s: 8,
  m: 12,
  l: 16,
} as const;

// =============================================================================
// LAYOUT - Screen-level constants for consistent structure
// =============================================================================
export const layout = {
  // Screen
  screenPaddingHorizontal: 20,
  screenPaddingVertical: 16,
  
  // Header
  headerHeight: 52,
  headerPaddingHorizontal: 16,
  
  // Content
  sectionGap: 24,      // Gap between major sections
  cardGap: 12,         // Gap between cards in a list
  
  // Input
  inputMinHeight: 48,  // Minimum input height (touch target)
  inputMaxHeight: 120, // Maximum expandable input height (~4 lines)
  
  // Tab bar (iOS includes safe area)
  tabBarHeight: 83,    // iOS: 49 content + 34 safe area
  
  // Touch targets (HCI standards)
  touchTargetMin: 44,
  touchTargetComfortable: 48,
  touchTargetPrimary: 56,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================
export const radius = {
  xs: 6,       // Small chips, badges
  sm: 8,       // Buttons (small)
  md: 12,      // Buttons, inputs
  lg: 16,      // Cards
  xl: 20,      // Large cards
  xxl: 24,     // Modals, sheets
  pill: 999,   // Fully rounded
} as const;

// =============================================================================
// TYPOGRAPHY - System fonts for native feel
// =============================================================================
export const typography = {
  // System font
  fontFamily: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  
  // Font weights
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  
  // Size scale
  sizes: {
    // Display
    largeTitle: 34,  // Screen titles
    title1: 28,      // Section headers
    title2: 22,      // Card titles
    title3: 20,      // Subsection headers
    
    // Body
    headline: 17,    // Emphasized body (semibold)
    body: 17,        // Standard body
    callout: 16,     // Secondary body
    subhead: 15,     // Supporting text
    
    // Small
    footnote: 13,    // Captions, hints
    caption1: 12,    // Small labels
    caption2: 11,    // Smallest text
    
    // Legacy aliases
    hero: 48,
    h1: 34,
    h2: 22,
    h3: 20,
    bodySmall: 15,
    caption: 13,
    tiny: 11,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  
  // Legacy font family aliases
  fonts: {
    heading: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
    subheading: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
    body: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
    bodyMedium: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
    bodySemiBold: Platform.select({ ios: "System", android: "Roboto", default: "System" }),
  },
} as const;

// =============================================================================
// COMPONENTS - HCI-compliant sizing
// =============================================================================
export const components = {
  // Buttons - gym-friendly touch targets
  button: {
    height: 56,            // Primary CTA (gym-friendly)
    heightLarge: 56,       // Alias for height (backward compat)
    heightSmall: 48,       // Secondary actions
    heightCompact: 44,     // Minimum touch target
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  
  // Inputs
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  
  // Cards
  card: {
    borderRadius: 16,
    padding: 16,
  },
  
  // Tab Bar
  tabBar: {
    height: Platform.select({ ios: 49 + 34, android: 56 }) as number,
    iconSize: 24,
    labelSize: 10,
  },
  
  // Navigation
  nav: {
    headerHeight: 44,
    backButtonSize: 48,    // Comfortable touch target
  },
  
  // Touch targets (HCI standards)
  touchTarget: {
    minimum: 44,           // Absolute minimum
    comfortable: 48,       // Standard interactive
    primary: 56,           // Primary CTAs (gym-friendly)
  },
} as const;

// =============================================================================
// GRADIENTS - For cards, muscle groups, etc.
// =============================================================================
export const gradients = {
  primary: ["#000000", "#1A1A1A"] as const,
  primarySubtle: ["rgba(0, 0, 0, 0.04)", "rgba(0, 0, 0, 0.02)"] as const,
  card: ["#FFFFFF", "#F9FAFB"] as const,
  cardHover: ["#F9FAFB", "#F3F4F6"] as const,
  chest: ["#000000", "#1A1A1A"] as const,
  back: ["#000000", "#1A1A1A"] as const,
  shoulders: ["#000000", "#1A1A1A"] as const,
  arms: ["#000000", "#1A1A1A"] as const,
  legs: ["#000000", "#1A1A1A"] as const,
  core: ["#000000", "#1A1A1A"] as const,
  fullBody: ["#000000", "#1A1A1A"] as const,
  success: ["#22C55E", "#16A34A"] as const,
  gold: ["#000000", "#1A1A1A"] as const,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 24,
    elevation: 6,
  },
  // Card shadow (warm, subtle)
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  // Floating elements
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// =============================================================================
// ANIMATION
// =============================================================================
export const animation = {
  // Spring configs for Reanimated
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    snappy: { damping: 15, stiffness: 400 },
    bouncy: { damping: 10, stiffness: 300 },
    stiff: { damping: 20, stiffness: 300 },
  },
  
  // Timing durations (ms)
  duration: {
    instant: 100,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
  
  // Scale for press animations
  pressScale: 0.97,
} as const;

// =============================================================================
// EFFORT SCALE - 5 levels with filled circles (RIR-based)
// =============================================================================
export const effortScale = {
  easy: {
    indicator: "○○○○○",
    level: 1,
    label: "Easy",
    rir: "4+",
    description: "Could do 4+ more",
  },
  moderate: {
    indicator: "●○○○○",
    level: 2,
    label: "Moderate",
    rir: "3",
    description: "Could do 3 more",
  },
  hard: {
    indicator: "●●○○○",
    level: 3,
    label: "Hard",
    rir: "2",
    description: "Could do 2 more",
  },
  veryHard: {
    indicator: "●●●○○",
    level: 4,
    label: "Very Hard",
    rir: "1",
    description: "Could do 1 more",
  },
  failure: {
    indicator: "●●●●●",
    level: 5,
    label: "Failure",
    rir: "0",
    description: "Couldn't do another",
  },
} as const;

// =============================================================================
// READINESS SCALE - Pre-workout energy assessment (professional, no emojis)
// Uses battery/gauge metaphor - intuitive and gender-neutral
// =============================================================================
export const readinessScale = {
  low: {
    level: 1,
    label: "Low Energy",
    shortLabel: "Low",
    adjustment: -0.10,
    description: "Reduce intensity 10%",
    icon: "battery-charging-outline" as const, // Ionicons
    barCount: 1,
  },
  moderate: {
    level: 2,
    label: "Ready",
    shortLabel: "Ready",
    adjustment: 0,
    description: "As planned",
    icon: "battery-half-outline" as const,
    barCount: 2,
  },
  high: {
    level: 3,
    label: "High Energy",
    shortLabel: "High",
    adjustment: 0.10,
    description: "Push harder +10%",
    icon: "battery-full-outline" as const,
    barCount: 3,
  },
} as const;

// Legacy alias for backward compatibility
export const feelingScale = {
  tired: { ...readinessScale.low, emoji: "" },
  normal: { ...readinessScale.moderate, emoji: "" },
  strong: { ...readinessScale.high, emoji: "" },
} as const;

// =============================================================================
// THEME OBJECTS
// =============================================================================
export const theme = {
  colors,
  spacing,
  space,
  layout,
  radius,
  typography,
  components,
  shadows,
  gradients,
  animation,
  effortScale,
  feelingScale,
  
  // Shortcuts for common access patterns
  fonts: typography.fonts,
  type: typography.sizes,
} as const;

export const lightTheme = {
  ...theme,
  colors: lightColors,
} as const;

// Alias for backward compatibility
export const darkTheme = theme;

// =============================================================================
// BODY REGIONS - For pain/discomfort check
// =============================================================================
export const bodyRegions = {
  shoulders: { label: "Shoulders", icon: "body-outline" as const },
  back: { label: "Back", icon: "body-outline" as const },
  chest: { label: "Chest", icon: "body-outline" as const },
  arms: { label: "Arms", icon: "fitness-outline" as const },
  core: { label: "Core", icon: "body-outline" as const },
  hips: { label: "Hips", icon: "body-outline" as const },
  knees: { label: "Knees", icon: "walk-outline" as const },
  ankles: { label: "Ankles", icon: "footsteps-outline" as const },
} as const;

// =============================================================================
// MUSCLE GROUPS - For progress visualization
// =============================================================================
export const muscleGroupColors = {
  chest: "#000000",
  back: "#1A1A1A",
  shoulders: "#333333",
  arms: "#4B5563",
  legs: "#6B7280",
  core: "#9CA3AF",
  fullBody: "#000000",
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type Theme = typeof theme;
export type ThemeColors = typeof darkColors;
export type EffortLevel = keyof typeof effortScale;
export type ReadinessLevel = keyof typeof readinessScale;
export type FeelingLevel = keyof typeof feelingScale;
export type BodyRegion = keyof typeof bodyRegions;
