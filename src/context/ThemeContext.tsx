/**
 * Theme Context - single light theme (Cal AI inspired)
 * No dark mode in v1. useTheme() returns the same palette always.
 */

import React, { createContext, useContext, useMemo } from "react";
import {
  lightColors,
  space,
  radius,
  typography,
  components,
  shadows,
  animation,
} from "../theme";

type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colorScheme: "light";
  isDark: false;
  colors: ThemeColors;
  space: typeof space;
  radius: typeof radius;
  typography: typeof typography;
  components: typeof components;
  shadows: typeof shadows;
  animation: typeof animation;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const value = useMemo<ThemeContextValue>(() => ({
    colorScheme: "light",
    isDark: false,
    colors: lightColors,
    space,
    radius,
    typography,
    components,
    shadows,
    animation,
  }), []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      colorScheme: "light",
      isDark: false,
      colors: lightColors,
      space,
      radius,
      typography,
      components,
      shadows,
      animation,
    };
  }

  return context;
}

export function useColors() {
  const { colors } = useTheme();
  return colors;
}

export function useIsDark(): boolean {
  return false;
}
