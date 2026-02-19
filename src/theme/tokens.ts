import { Platform } from "react-native";

const monoFont =
  Platform.select({
    android: "monospace",
    ios: "Menlo",
    web: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  }) ?? "monospace";

export const theme = {
  colors: {
    // Obsidian-inspired dark palette with Minecraft/fantasy earthy tones
    background: "#0d0d14",
    surface: "#161620",
    surfaceMuted: "#1d1d2a",
    surfaceElevated: "#222234",
    // Primary accent: enchantment table purple/violet
    accent: "#7c6af7",
    accentSecondary: "#5b4fcf",
    accentGlow: "#a594ff",
    // Minecraft earthy/nature tones as secondaries
    accentGreen: "#4a7c59",
    accentGreenBright: "#5a9c6e",
    accentStone: "#4a4a5a",
    // Text
    textPrimary: "#e0ddf5",
    textSecondary: "#706e8a",
    textMuted: "#3e3c52",
    // Borders: pixel-crisp
    border: "#2a2840",
    borderSubtle: "#1a1828",
    borderHighlight: "#3d3860",
    // Danger: enchanted red
    danger: "#d44a6a",
    // Overlay
    overlay: "rgba(6, 6, 12, 0.88)",
    // Glow colors
    glowA: "#2e2260",
    glowB: "#1a1040",
    glowViolet: "#4a3ab0",
    glowGreen: "#1a3d28",
    // Grid
    grid: "#17162a",
  },
  radius: {
    // Slightly less round = more blocky/pixelated feel
    lg: 8,
    md: 4,
    sm: 2,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    heading: "Manrope_600SemiBold",
    body: "Manrope_400Regular",
    bodyStrong: "Manrope_600SemiBold",
    mono: monoFont,
  },
} as const;
