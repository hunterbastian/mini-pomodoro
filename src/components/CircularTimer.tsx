/* ─────────────────────────────────────────────────────────
 * CircularTimer — ambient outpost edition
 *
 * Layers (outside → in):
 *   1. Outer feather ring  (faint amber trace)
 *   2. Soft tick marks     (48 ticks, subdued)
 *   3. Track ring          (dark dashed, barely visible)
 *   4. Progress ring       (warm amber, round caps)
 *   5. Inner ambient fill  (radial amber glow)
 *   6. Time label          (monospace, pale)
 *   7. Caption             (small muted label)
 * ───────────────────────────────────────────────────────── */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from "react-native-svg";

import { PixelRollingDigits } from "./PixelRollingDigits";
import { theme } from "../theme/tokens";
import { formatSeconds } from "../utils/time";

/* ─── Config ─────────────────────────────────────────────── */
const TICK = {
  count:        48,
  majorEvery:   4,
  minorLength:  3,
  majorLength:  7,
  minorWidth:   1,
  majorWidth:   1.5,
  minorOpacity: 0.35,
  majorOpacity: 0.65,
  color:        theme.colors.borderSubtle,
};

const RING = {
  trackDashArray: "2 6",
  outerRingGap:   10,
  outerOpacity:   0.55,
};

type CircularTimerProps = {
  remainingSec: number;
  totalSec:     number;
  size?:        number;
  strokeWidth?: number;
};

export function CircularTimer({
  remainingSec,
  totalSec,
  size        = 248,
  strokeWidth = 8,
}: CircularTimerProps) {
  const center       = size / 2;
  const radius       = (size - strokeWidth) / 2 - TICK.majorLength - 8;
  const circumference = 2 * Math.PI * radius;
  const progress     = totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset   = circumference * (1 - progress);

  const timeFontSize = Math.max(34, Math.floor(size * 0.2));
  const captionSize  = Math.max(9,  Math.floor(size * 0.042));

  const outerRadius = radius + strokeWidth / 2 + RING.outerRingGap;
  const tickRadius  = radius + strokeWidth / 2 + 5;

  /* Tick geometry */
  const ticks = Array.from({ length: TICK.count }, (_, i) => {
    const angle   = (i / TICK.count) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % TICK.majorEvery === 0;
    const len     = isMajor ? TICK.majorLength : TICK.minorLength;
    const innerR  = tickRadius;
    const outerR  = tickRadius + len;
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      isMajor,
    };
  });

  return (
    <View style={[styles.wrapper, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <Defs>
          {/* Deep amber glow in center */}
          <RadialGradient id="warmGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#c8935a" stopOpacity="0.18" />
            <Stop offset="55%"  stopColor="#c8935a" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#c8935a" stopOpacity="0"    />
          </RadialGradient>
          {/* Accent amber progress glow */}
          <RadialGradient id="accentGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={theme.colors.accent} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={theme.colors.accent} stopOpacity="0"    />
          </RadialGradient>
        </Defs>

        {/* Layer 1 — feather outer ring */}
        <Circle
          cx={center} cy={center}
          r={outerRadius}
          fill="transparent"
          stroke={theme.colors.borderHighlight}
          strokeWidth={1}
          opacity={RING.outerOpacity}
        />

        {/* Layer 2 — tick marks */}
        <G>
          {ticks.map((t, i) => (
            <Line
              key={i}
              x1={t.x1} y1={t.y1}
              x2={t.x2} y2={t.y2}
              stroke={TICK.color}
              strokeWidth={t.isMajor ? TICK.majorWidth : TICK.minorWidth}
              opacity={t.isMajor ? TICK.majorOpacity : TICK.minorOpacity}
            />
          ))}
        </G>

        {/* Layer 3 — warm ambient fill */}
        <Circle
          cx={center} cy={center}
          r={radius - strokeWidth / 2}
          fill="url(#warmGlow)"
        />

        {/* Layer 4 — accent glow pulse layer */}
        <Circle
          cx={center} cy={center}
          r={radius}
          fill="url(#accentGlow)"
        />

        {/* Layer 5 — track ring (warm dashed) */}
        <Circle
          cx={center} cy={center}
          r={radius}
          fill="transparent"
          stroke={theme.colors.border}
          strokeDasharray={RING.trackDashArray}
          strokeWidth={strokeWidth}
        />

        {/* Layer 6 — progress ring (cinnamon, round caps) */}
        <Circle
          cx={center} cy={center}
          r={radius}
          fill="transparent"
          rotation="-90"
          originX={center}
          originY={center}
          stroke={theme.colors.accent}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />

        {/* Layer 7 — progress tip dot */}
        {progress > 0.01 && (
          <Circle
            cx={center + radius * Math.cos(-Math.PI / 2 - (1 - progress) * 2 * Math.PI)}
            cy={center + radius * Math.sin(-Math.PI / 2 - (1 - progress) * 2 * Math.PI)}
            r={strokeWidth / 2 + 1.5}
            fill={theme.colors.accentGlow}
            opacity={0.95}
          />
        )}
      </Svg>

      {/* Text overlay */}
      <View style={styles.labelWrap}>
        <PixelRollingDigits
          fontSize={timeFontSize}
          plateStyle={styles.digitsPlate}
          value={formatSeconds(remainingSec)}
        />
        <Text style={[styles.caption, { fontSize: captionSize }]}>focus session</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color:         theme.colors.textMuted,
    fontFamily:    theme.typography.body,
    letterSpacing: 1.4,
    marginTop:     5,
    textTransform: "uppercase",
  },
  labelWrap: {
    alignItems:     "center",
    justifyContent: "center",
    position:       "absolute",
  },
  digitsPlate: {
    backgroundColor: "rgba(10, 12, 15, 0.7)",
    borderColor: "rgba(200, 147, 90, 0.15)",
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    marginBottom: 4,
  },
  wrapper: {
    alignItems:     "center",
    justifyContent: "center",
  },
});
