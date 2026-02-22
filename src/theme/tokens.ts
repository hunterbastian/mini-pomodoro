import { Platform } from "react-native";

const monoFont =
  Platform.select({
    android: "monospace",
    ios:     "Menlo",
    web:     'ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  }) ?? "monospace";

/* ─────────────────────────────────────────────────────────
 * Ambient Outpost palette
 *
 * Deep void blacks + warm amber signals + muted steel.
 * Like a lone control panel humming in a remote desert station
 * at night. Quiet, moody, atmospheric.
 * ───────────────────────────────────────────────────────── */
export const theme = {
  colors: {
    // Deep void backgrounds
    background:      "#0a0c0f",
    surface:         "#141820",
    surfaceMuted:    "#1a1f2a",
    surfaceElevated: "#212736",

    // Warm amber signal accents
    accent:          "#c8935a",
    accentSecondary: "#9a6d3a",
    accentGlow:      "#e8b06a",

    // Supporting tones
    accentGreen:      "#5a8a5c",
    accentGreenBright:"#7aaa6c",
    accentStone:      "#4a4540",

    // Text: pale cream to muted steel, readable on dark
    textPrimary:      "#d8d0c4",
    textSecondary:    "#8a8278",
    textMuted:        "#5c564e",

    // Borders: thin, low-contrast outlines
    border:           "#2a2e38",
    borderSubtle:     "#22262e",
    borderHighlight:  "#3a3228",

    // States
    danger:           "#a04030",
    overlay:          "rgba(0, 0, 0, 0.72)",

    // Ambient glows
    glowA:            "rgba(200, 147, 90, 0.06)",
    glowB:            "rgba(90, 138, 92, 0.04)",
    glowWarm:         "rgba(232, 176, 106, 0.12)",
    glowShadow:       "rgba(0, 0, 0, 0.4)",
  },
  radius: {
    lg:   10,
    md:   6,
    sm:   3,
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
