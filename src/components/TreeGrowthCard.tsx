import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { Rect } from "react-native-svg";

import { theme } from "../theme/tokens";

type TreeGrowthCardProps = {
  completedSessions: number;
  growthProgress: number;
  isActive: boolean;
};

type Sparkle = {
  color: number;
  opacity: number;
  x: number;
  y: number;
};

const MOTION_STEP_MS = 120;
const BURST_STEPS = 18;
const STAGE_BOUNCE_STEPS = 8;

const PALETTE: Record<number, string> = {
  1: "#3b2116",
  2: "#704731",
  3: "#284033",
  4: "#4a6e3a",
  5: "#7ba646",
  6: "#2b3a32",
  7: "#3e5242",
  8: "#fff5cc",
  9: "#8b9bb4",
};

const WEB_GOD_RAYS_STYLE: ViewStyle = Platform.OS === "web"
  ? ({
      backgroundImage:
        "linear-gradient(45deg, rgba(242, 226, 160, 0) 0%, rgba(242, 226, 160, 0.06) 40%, rgba(242, 226, 160, 0.2) 50%, rgba(242, 226, 160, 0.06) 60%, rgba(242, 226, 160, 0) 100%)",
      mixBlendMode: "overlay",
      opacity: 0.62,
    } as unknown as ViewStyle)
  : {};

const WEB_SCANLINES_STYLE: ViewStyle = Platform.OS === "web"
  ? ({
      backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.12) 50%)",
      backgroundSize: "100% 4px",
      opacity: 0.45,
    } as unknown as ViewStyle)
  : {};

const SPRITE_SAPLING = [
  [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 4, 5, 5, 4, 1, 0, 0, 0],
  [0, 0, 0, 1, 4, 5, 4, 4, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 4, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
];

const SPRITE_YOUNG = [
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 4, 5, 5, 4, 1, 0, 0, 0],
  [0, 0, 1, 4, 5, 5, 5, 5, 4, 1, 0, 0],
  [0, 1, 4, 4, 5, 5, 4, 4, 4, 4, 1, 0],
  [1, 3, 4, 4, 4, 4, 4, 4, 4, 3, 3, 1],
  [0, 1, 3, 3, 4, 1, 1, 4, 3, 3, 1, 0],
  [0, 0, 1, 1, 1, 2, 2, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
];

const SPRITE_MATURE = [
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 4, 4, 5, 5, 4, 1, 1, 0, 0, 0],
  [0, 0, 1, 4, 5, 5, 5, 5, 5, 5, 5, 4, 1, 0, 0],
  [0, 1, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 1, 0],
  [1, 3, 4, 5, 5, 4, 4, 4, 4, 5, 5, 5, 4, 3, 1],
  [1, 3, 4, 4, 4, 3, 3, 3, 3, 4, 4, 4, 4, 3, 1],
  [0, 1, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3, 1, 0],
  [0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 2, 2, 1, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 1, 1, 1, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0],
];

const TREE_NAMES = ["Oak Sapling", "Young Oak", "Elder Oak"];
const TREE_AGES = ["Day 1", "Day 14", "Day 45"];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveStage(completedSessions: number, growthProgress: number): number {
  const score = completedSessions + growthProgress;
  if (score >= 6) return 2;
  if (score >= 2) return 1;
  return 0;
}

function pickSprite(stage: number): number[][] {
  if (stage === 0) return SPRITE_SAPLING;
  if (stage === 1) return SPRITE_YOUNG;
  return SPRITE_MATURE;
}

function buildDriftParticles(
  tick: number,
  isActive: boolean,
  burstSteps: number,
  stage: number,
): Sparkle[] {
  const baseCount = isActive ? 8 : 4;
  const burstCount = burstSteps > 0 ? 8 : 0;
  const total = baseCount + burstCount;
  const burstBonus = burstSteps > 0 ? BURST_STEPS - burstSteps : 0;

  return Array.from({ length: total }, (_, index) => {
    const seed = stage * 13 + index * 17;
    const travel = 16 + (seed % 28);
    const speed = isActive ? 2 : 1;
    const y = 58 - ((tick * speed + seed + burstBonus * 2) % travel);
    const swayPhase = (tick + seed) % 6;
    const sway = swayPhase < 2 ? -1 : swayPhase < 4 ? 0 : 1;
    const x = Math.max(2, Math.min(60, 14 + ((seed * 7) % 34) + sway));
    const color = (tick + index) % 5 === 0 ? 8 : 5;
    const opacityBase = isActive ? 0.86 : 0.48;
    const opacity = Math.max(0.2, Math.min(0.95, opacityBase - (58 - y) * 0.01));

    return {
      color,
      opacity,
      x: Math.floor(x),
      y: Math.floor(Math.max(8, y)),
    };
  });
}

function leafShimmerColor(
  index: number,
  tick: number,
  x: number,
  y: number,
  isActive: boolean,
): string | null {
  const base = PALETTE[index];
  if (!base) {
    return null;
  }

  if (index === 4 || index === 5) {
    if ((x + y + tick) % 7 === 0) {
      return PALETTE[index === 4 ? 5 : 4];
    }

    if (isActive && (x * 3 + y + tick) % 13 === 0) {
      return PALETTE[8];
    }
  }

  return base;
}

export function TreeGrowthCard({
  completedSessions,
  growthProgress,
  isActive,
}: TreeGrowthCardProps) {
  const normalizedProgress = clamp01(growthProgress);
  const stage = useMemo(
    () => resolveStage(completedSessions, normalizedProgress),
    [completedSessions, normalizedProgress],
  );
  const sprite = useMemo(() => pickSprite(stage), [stage]);
  const previousStageRef = useRef(stage);

  const [tick, setTick] = useState(0);
  const [burstSteps, setBurstSteps] = useState(0);
  const [stageBounceSteps, setStageBounceSteps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, MOTION_STEP_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (burstSteps > 0) {
      setBurstSteps((prev) => Math.max(0, prev - 1));
    }

    if (stageBounceSteps > 0) {
      setStageBounceSteps((prev) => Math.max(0, prev - 1));
    }
  }, [burstSteps, stageBounceSteps, tick]);

  useEffect(() => {
    if (previousStageRef.current === stage) {
      return;
    }

    previousStageRef.current = stage;
    setStageBounceSteps(STAGE_BOUNCE_STEPS);
  }, [stage]);

  const triggerBurst = useCallback(() => {
    if (stage >= 2) {
      return;
    }

    setBurstSteps(BURST_STEPS);
  }, [stage]);

  const sparklePixels = useMemo(
    () => buildDriftParticles(tick, isActive, burstSteps, stage),
    [burstSteps, isActive, stage, tick],
  );

  const waterValue = Math.round((normalizedProgress * 0.72 + Math.min(completedSessions, 5) / 5 * 0.28) * 50);
  const sunValue = Math.min(3, Math.max(0, Math.round(normalizedProgress * 3)));
  const buttonDisabled = stage >= 2;
  const buttonLabel = buttonDisabled ? "Harvest" : "Nurture";

  const cadenceScale = isActive
    ? [1, 1.02, 1.04, 1.02][tick % 4]!
    : [1, 1, 1.01, 1][tick % 4]!;
  const bounceScale = stageBounceSteps > 0 ? stageBounceSteps * 0.016 : 0;
  const spriteScale = cadenceScale + bounceScale;

  const spriteWidth = sprite[0]?.length ?? 0;
  const spriteX = Math.floor((64 - spriteWidth) / 2);
  const baseSpriteY = stage === 0 ? 45 : stage === 1 ? 38 : 30;
  const idleBobOffset = stageBounceSteps > 0
    ? (stageBounceSteps % 3 === 0 ? -2 : -1)
    : isActive
      ? (tick % 4 < 2 ? -1 : 0)
      : (tick % 8 === 0 ? -1 : 0);
  const spriteY = baseSpriteY + idleBobOffset;

  return (
    <View style={styles.card}>
      <View style={styles.viewport}>
        <View style={[styles.canvasWrap, { transform: [{ scale: spriteScale }] }]}>
          <Svg height="100%" shapeRendering="crispEdges" viewBox="0 0 64 64" width="100%">
            {Array.from({ length: 16 }).map((_, row) =>
              Array.from({ length: 16 }).map((__, col) => (
                <Rect
                  fill={(row + col) % 2 === 0 ? PALETTE[6] : PALETTE[7]}
                  height={4}
                  key={`bg-${row}-${col}`}
                  width={4}
                  x={col * 4}
                  y={row * 4}
                />
              )),
            )}

            <Rect
              fill="rgba(0,0,0,0.24)"
              height={2}
              width={Math.max(2, spriteWidth - 4)}
              x={spriteX + 2}
              y={spriteY + sprite.length - 1}
            />

            {sprite.map((row, y) =>
              row.map((index, x) => {
                if (index === 0) return null;
                const fill = leafShimmerColor(index, tick, x, y, isActive);
                if (!fill) return null;

                return (
                  <Rect
                    fill={fill}
                    height={1}
                    key={`sprite-${x}-${y}-${index}`}
                    width={1}
                    x={spriteX + x}
                    y={spriteY + y}
                  />
                );
              }),
            )}

            {sparklePixels.map((spark, index) => (
              <Rect
                fill={PALETTE[spark.color]}
                fillOpacity={spark.opacity}
                height={1}
                key={`spark-${index}-${tick}-${burstSteps}`}
                width={1}
                x={spark.x}
                y={spark.y}
              />
            ))}
          </Svg>
        </View>

        <View pointerEvents="none" style={[styles.godRays, WEB_GOD_RAYS_STYLE]} />
        <View pointerEvents="none" style={[styles.scanlines, WEB_SCANLINES_STYLE]} />
      </View>

      <View style={styles.controls}>
        <View style={styles.infoPanel}>
          <Text style={styles.title}>{TREE_NAMES[stage]}</Text>
          <Text style={styles.status}>{TREE_AGES[stage]}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={buttonDisabled}
          onPress={triggerBurst}
          style={({ pressed }) => [
            styles.nurtureButton,
            buttonDisabled && styles.nurtureButtonDisabled,
            pressed && !buttonDisabled && styles.nurtureButtonPressed,
          ]}
        >
          <Text style={styles.nurtureLabel}>{buttonLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metricText}>Hydration {waterValue}/50</Text>
        <Text style={styles.metricText}>Sunlight {sunValue}/3</Text>
        <Text style={styles.metricText}>Sessions {completedSessions}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasWrap: {
    height: "100%",
    width: "100%",
  },
  card: {
    backgroundColor: "#e6dcb8",
    borderColor: "#222",
    borderWidth: 4,
    marginTop: theme.spacing.lg,
    padding: 6,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.85,
    shadowRadius: 0,
  },
  controls: {
    alignItems: "center",
    backgroundColor: "#d4cba3",
    borderColor: "#b9b195",
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    padding: 8,
  },
  godRays: {
    ...StyleSheet.absoluteFillObject,
  },
  infoPanel: {
    flex: 1,
    justifyContent: "center",
  },
  metricText: {
    color: "#4f3726",
    fontFamily: theme.typography.body,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metrics: {
    backgroundColor: "rgba(212, 203, 163, 0.8)",
    borderColor: "#b9b195",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  nurtureButton: {
    alignItems: "center",
    backgroundColor: "#4a6e3a",
    borderBottomColor: "#284033",
    borderBottomWidth: 4,
    borderLeftColor: "#7ba646",
    borderLeftWidth: 4,
    borderRightColor: "#284033",
    borderRightWidth: 4,
    borderTopColor: "#7ba646",
    borderTopWidth: 4,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 106,
    paddingHorizontal: 14,
  },
  nurtureButtonDisabled: {
    backgroundColor: "#777",
    borderBottomColor: "#555",
    borderLeftColor: "#555",
    borderRightColor: "#555",
    borderTopColor: "#555",
    opacity: 0.8,
  },
  nurtureButtonPressed: {
    borderBottomColor: "#7ba646",
    borderLeftColor: "#284033",
    borderRightColor: "#7ba646",
    borderTopColor: "#284033",
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  nurtureLabel: {
    color: "#fff",
    fontFamily: theme.typography.heading,
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
  },
  status: {
    color: "#704731",
    fontFamily: theme.typography.body,
    fontSize: 20,
    marginTop: 4,
  },
  title: {
    color: "#3b2116",
    fontFamily: theme.typography.heading,
    fontSize: 28,
    lineHeight: 28,
    textTransform: "uppercase",
  },
  viewport: {
    aspectRatio: 1,
    backgroundColor: "#2b3a32",
    borderColor: "#222",
    borderWidth: 4,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
});
