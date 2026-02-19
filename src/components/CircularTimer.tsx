/* ─────────────────────────────────────────────────────────
 * CircularTimer
 *
 * Visual layers, outside → in:
 *   1. Outer ghost ring  (thin, dim — gives depth)
 *   2. Tick marks        (60 ticks, major every 5)
 *   3. Track ring        (dashed dots — remaining arc)
 *   4. Progress ring     (solid accent — drains as time passes)
 *   5. Inner glow        (radial gradient fill, accent color)
 *   6. Time label        (large mono digits)
 *   7. Caption           (FOCUS / mini label below)
 * ───────────────────────────────────────────────────────── */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from "react-native-svg";

import { theme } from "../theme/tokens";
import { formatSeconds } from "../utils/time";

/* ─── Config ─────────────────────────────────────────────── */
const TICK = {
  count:         60,     // total ticks around the ring
  majorEvery:    5,      // major tick every N ticks
  minorLength:   4,      // px
  majorLength:   8,      // px
  minorWidth:    1,      // stroke-width
  majorWidth:    1.5,
  minorOpacity:  0.18,
  majorOpacity:  0.35,
  color:         theme.colors.textMuted,
};

const RING = {
  trackDashArray:  "2 9",     // dashed track
  outerRingGap:    14,        // px outside the progress ring
  outerOpacity:    0.12,
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
  strokeWidth = 7,
}: CircularTimerProps) {
  const center      = size / 2;
  const radius      = (size - strokeWidth) / 2 - TICK.majorLength - 6;
  const circumference = 2 * Math.PI * radius;
  const progress    = totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset  = circumference * (1 - progress);

  const timeFontSize = Math.max(36, Math.floor(size * 0.195));
  const captionSize  = Math.max(9,  Math.floor(size * 0.042));

  const outerRadius = radius + strokeWidth / 2 + RING.outerRingGap;
  const tickRadius  = radius + strokeWidth / 2 + 4; // inner edge of tick zone

  /* ─── Tick mark geometry ─────────────────────────── */
  const ticks = Array.from({ length: TICK.count }, (_, i) => {
    const angle     = (i / TICK.count) * 2 * Math.PI - Math.PI / 2;
    const isMajor   = i % TICK.majorEvery === 0;
    const len       = isMajor ? TICK.majorLength : TICK.minorLength;
    const innerR    = tickRadius;
    const outerR    = tickRadius + len;
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
          <RadialGradient id="innerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor={theme.colors.glowA}   stopOpacity="0.45" />
            <Stop offset="60%"  stopColor={theme.colors.glowA}   stopOpacity="0.12" />
            <Stop offset="100%" stopColor={theme.colors.glowA}   stopOpacity="0"    />
          </RadialGradient>
          <RadialGradient id="progressGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor={theme.colors.accent}  stopOpacity="0.08" />
            <Stop offset="100%" stopColor={theme.colors.accent}  stopOpacity="0"    />
          </RadialGradient>
        </Defs>

        {/* Layer 1 — outer ghost ring */}
        <Circle
          cx={center} cy={center}
          r={outerRadius}
          fill="transparent"
          stroke={theme.colors.border}
          strokeWidth={0.5}
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

        {/* Layer 3 — inner glow fill */}
        <Circle
          cx={center} cy={center}
          r={radius - strokeWidth / 2}
          fill="url(#innerGlow)"
        />

        {/* Layer 4 — progress accent glow (subtle, same radius as progress) */}
        <Circle
          cx={center} cy={center}
          r={radius}
          fill="url(#progressGlow)"
        />

        {/* Layer 5 — track ring (dashed) */}
        <Circle
          cx={center} cy={center}
          fill="transparent"
          r={radius}
          stroke={theme.colors.borderSubtle}
          strokeDasharray={RING.trackDashArray}
          strokeWidth={strokeWidth}
        />

        {/* Layer 6 — progress ring */}
        <Circle
          cx={center} cy={center}
          fill="transparent"
          r={radius}
          rotation="-90"
          originX={center}
          originY={center}
          stroke={theme.colors.accent}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          strokeWidth={strokeWidth}
        />

        {/* Layer 7 — progress ring end dot (the "cursor") */}
        {progress > 0.01 && (
          <Circle
            cx={center + radius * Math.cos(-Math.PI / 2 - (1 - progress) * 2 * Math.PI)}
            cy={center + radius * Math.sin(-Math.PI / 2 - (1 - progress) * 2 * Math.PI)}
            r={strokeWidth / 2 + 1}
            fill={theme.colors.accent}
            opacity={0.9}
          />
        )}
      </Svg>

      {/* Text overlay */}
      <View style={styles.labelWrap}>
        <Text style={[styles.timeLabel, { fontSize: timeFontSize }]}>
          {formatSeconds(remainingSec)}
        </Text>
        <Text style={[styles.caption, { fontSize: captionSize }]}>Focus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color:       theme.colors.textMuted,
    fontFamily:  theme.typography.mono,
    letterSpacing: 3,
    marginTop:   6,
    textTransform: "uppercase",
  },
  labelWrap: {
    alignItems:     "center",
    justifyContent: "center",
    position:       "absolute",
  },
  timeLabel: {
    color:       theme.colors.textPrimary,
    fontFamily:  theme.typography.mono,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  wrapper: {
    alignItems:     "center",
    justifyContent: "center",
  },
});
