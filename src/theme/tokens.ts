import { Platform } from "react-native";

const monoFont =
  Platform.select({
    android: "monospace",
    ios: "Menlo",
    web: 'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  }) ?? "monospace";

export const theme = {
  colors: {
    background: "#F3EEE4",
    surface: "#FFFBF4",
    surfaceMuted: "#EDE4D5",
    accent: "#77624C",
    accentSecondary: "#9E896F",
    textPrimary: "#2F2922",
    textSecondary: "#6B6155",
    border: "#DCCFBC",
    danger: "#B16450",
    overlay: "rgba(41, 34, 27, 0.3)",
    glowA: "#E8DAC5",
    glowB: "#D9C6A9",
  },
  radius: {
    lg: 24,
    md: 16,
    sm: 10,
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
