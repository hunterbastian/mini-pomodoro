"use client";

/* ─────────────────────────────────────────────────────────
 * CircularTimer — SVG ring timer, ambient outpost edition
 *
 * Layers: feather ring, tick marks, track ring,
 *         progress ring (warm amber), glow, time label.
 * ───────────────────────────────────────────────────────── */

import { formatSeconds } from "@/lib/timer-store";

const TICK_COUNT = 48;
const TICK_MAJOR_EVERY = 4;

type Props = {
  remainingSec: number;
  totalSec: number;
  size?: number;
  strokeWidth?: number;
};

export function CircularTimer({
  remainingSec,
  totalSec,
  size = 248,
  strokeWidth = 8,
}: Props) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 7 - 8;
  const circumference = 2 * Math.PI * radius;
  const progress =
    totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset = circumference * (1 - progress);

  const outerRadius = radius + strokeWidth / 2 + 10;
  const tickRadius = radius + strokeWidth / 2 + 5;

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angle = (i / TICK_COUNT) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % TICK_MAJOR_EVERY === 0;
    const len = isMajor ? 7 : 3;
    const innerR = tickRadius;
    const outerR = tickRadius + len;
    return {
      x1: center + innerR * Math.cos(angle),
      y1: center + innerR * Math.sin(angle),
      x2: center + outerR * Math.cos(angle),
      y2: center + outerR * Math.sin(angle),
      isMajor,
    };
  });

  const timeText = formatSeconds(remainingSec);

  // Tip dot position
  const tipAngle =
    -Math.PI / 2 - (1 - progress) * 2 * Math.PI;
  const tipX = center + radius * Math.cos(tipAngle);
  const tipY = center + radius * Math.sin(tipAngle);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0">
        <defs>
          <radialGradient id="warmGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8935a" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#c8935a" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#c8935a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Feather ring */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="transparent"
          stroke="#3a3228"
          strokeWidth={1}
          opacity={0.55}
        />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#22262e"
            strokeWidth={t.isMajor ? 1.5 : 1}
            opacity={t.isMajor ? 0.65 : 0.35}
          />
        ))}

        {/* Ambient inner glow */}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          fill="url(#warmGlow)"
        />

        {/* Track ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#2a2e38"
          strokeDasharray="2 6"
          strokeWidth={strokeWidth}
        />

        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#c8935a"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />

        {/* Progress tip dot */}
        {progress > 0.01 && (
          <circle
            cx={tipX}
            cy={tipY}
            r={strokeWidth / 2 + 1.5}
            fill="#e8b06a"
            opacity={0.95}
          />
        )}
      </svg>

      {/* Time display */}
      <div className="flex flex-col items-center z-10">
        <div className="rounded-sm border border-accent/15 bg-background/70 px-3 py-1.5 mb-1">
          <span
            className="font-mono tabular-nums tracking-wider text-accent-glow"
            style={{
              fontSize: Math.max(34, Math.floor(size * 0.2)),
              textShadow: "0 1px 4px rgba(200, 147, 90, 0.3)",
            }}
          >
            {timeText}
          </span>
        </div>
        <span
          className="uppercase tracking-widest text-foreground-muted"
          style={{ fontSize: Math.max(9, Math.floor(size * 0.042)) }}
        >
          focus session
        </span>
      </div>
    </div>
  );
}
