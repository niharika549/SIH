// Design tokens for SkillAlign.
//
// Centralized theme colors used throughout the app.
// The theme has been updated to a deep navy / blue visual style
// to match the SkillAlign brand identity.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: deep navy theme
  // ---------------------------------------------------------------------------
  surface: "#071743",
  onSurface: "#FFFFFF",

  surfaceSecondary: "#0B1E4A",
  onSurfaceSecondary: "#FFFFFF",

  surfaceTertiary: "#102B63",
  onSurfaceTertiary: "#D6E1F5",

  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#071743",

  muted: "#AAB9D6",

  // ---------------------------------------------------------------------------
  // Brand
  // ---------------------------------------------------------------------------
  brand: "#1F6FEB",
  onBrand: "#FFFFFF",

  brandPrimary: "#1F6FEB",
  onBrandPrimary: "#FFFFFF",

  brandSecondary: "#18D99B",
  onBrandSecondary: "#071743",

  brandTertiary: "#163B80",
  onBrandTertiary: "#DCE8FF",

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------
  success: "#22C55E",
  onSuccess: "#FFFFFF",

  warning: "#F59E0B",
  onWarning: "#071743",

  error: "#EF4444",
  onError: "#FFFFFF",

  info: "#3B82F6",
  onInfo: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#203A70",
  borderStrong: "#36548A",
  divider: "#1B3365",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = {
  light,
};

// -----------------------------------------------------------------------------
// Color scheme control
// -----------------------------------------------------------------------------

export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified".
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces on the scheme the app currently ships.
// Dark mode can be added later without changing the rest of the app.
setColorScheme?.(themes.dark ? null : defaultScheme);

// -----------------------------------------------------------------------------
// Theme hook
// -----------------------------------------------------------------------------

export function useTheme(): {
  scheme: ColorScheme;
  colors: ThemeColors;
} {
  const system = useColorScheme();

  const scheme: ColorScheme =
    system && themes[system] ? system : defaultScheme;

  return {
    scheme,
    colors: themes[scheme] ?? themes.light,
  };
}

// -----------------------------------------------------------------------------
// Themed StyleSheet
// -----------------------------------------------------------------------------

export function makeStyles<
  T extends
    | StyleSheet.NamedStyles<T>
    | StyleSheet.NamedStyles<any>
>(
  factory: (
    colors: ThemeColors,
  ) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();

    return useMemo(
      () => StyleSheet.create(factory(colors)),
      [colors],
    );
  };
}