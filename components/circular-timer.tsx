"use client";

/* ─────────────────────────────────────────────────────────
 * CircularTimer — Minimal, modern ring timer
 *
 * Clean concentric circles with a smooth amber progress arc.
 * No tick marks clutter. Just the ring and time.
 * ───────────────────────────────────────────────────────── */

import { formatSeconds } from "@/lib/timer-store";

type Props = {
  remainingSec: number;
  totalSec: number;
  size?: number;
  strokeWidth?: number;
  modeLabel?: string;
};

export function CircularTimer({
  remainingSec,
  totalSec,
  size = 280,
  strokeWidth = 6,
  modeLabel = "focus session",
}: Props) {
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const progress =
    totalSec <= 0 ? 0 : Math.max(0, Math.min(1, remainingSec / totalSec));
  const dashOffset = circumference * (1 - progress);

  const timeText = formatSeconds(remainingSec);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8935a" stopOpacity="0.07" />
            <stop offset="60%" stopColor="#c8935a" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#c8935a" stopOpacity="0" />
          </radialGradient>
          <filter id="progressGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Inner ambient fill */}
        <circle cx={center} cy={center} r={radius - 8} fill="url(#innerGlow)" />

        {/* Track ring — subtle dashed */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1a1f2a"
          strokeWidth={strokeWidth}
          opacity={0.8}
        />

        {/* Progress glow (blurred copy behind) */}
        {progress > 0.005 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#c8935a"
            strokeWidth={strokeWidth + 6}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            filter="url(#progressGlow)"
            opacity={0.35}
          />
        )}

        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#c8935a"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>

      {/* Time display */}
      <div className="flex flex-col items-center z-10">
        <span
          className="font-mono tabular-nums tracking-wider text-foreground"
          style={{
            fontSize: Math.max(40, Math.floor(size * 0.19)),
            lineHeight: 1,
          }}
        >
          {timeText}
        </span>
        <span className="uppercase tracking-[0.2em] text-foreground-muted text-[10px] mt-2">
          {modeLabel}
        </span>
      </div>
    </div>
  );
}
