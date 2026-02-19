import { Platform } from "react-native";

const monoFont =
  Platform.select({
    android: "monospace",
    ios:     "Menlo",
    web:     'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  }) ?? "monospace";

/* ─────────────────────────────────────────────────────────
 * Stardew-inspired palette
 *
 * Daylight sky + farm wood + crop greens.
 * Bright and cozy, with high-contrast game-like panel edges.
 * ───────────────────────────────────────────────────────── */
export const theme = {
  colors: {
    // Daytime sky + wood panels
    background:      "#8fc7ff",
    surface:         "#f5d9aa",
    surfaceMuted:    "#e8bf7d",
    surfaceElevated: "#d7a86b",

    // Farm accents
    accent:          "#5f9238",
    accentSecondary: "#3f6a24",
    accentGlow:      "#f4cf63",

    // Supporting naturals
    accentGreen:      "#79a84f",
    accentGreenBright:"#95c562",
    accentStone:      "#8f6b40",

    // Text: dark walnut, readable against warm surfaces
    textPrimary:      "#2c1e11",
    textSecondary:    "#5a3b1d",
    textMuted:        "#8a673f",

    // Borders: carved, game-like outlines
    border:           "#6a4a2a",
    borderSubtle:     "#9d6f3e",
    borderHighlight:  "#f9e6ac",

    // States
    danger:           "#a23b25",
    overlay:          "rgba(20, 33, 54, 0.58)",

    // Ambient tones
    glowA:            "#c5e2ff",
    glowB:            "#96d478",
    glowWarm:         "#ffe8a8",
    glowShadow:       "rgba(66, 42, 18, 0.2)",
  },
  radius: {
    lg:   12,
    md:   8,
    sm:   4,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 36,
  },
  typography: {
    heading:    monoFont,
    body:       monoFont,
    bodyStrong: monoFont,
    mono:       monoFont,
  },
} as const;
