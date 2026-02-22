import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Polygon, Rect, Circle } from "react-native-svg";

type Palette = {
  groundDark: string;
  groundMid: string;
  horizonGlow: string;
  horizonMid: string;
  ridgeFar: string;
  ridgeNear: string;
  skyA: string;
  skyB: string;
  skyC: string;
  skyD: string;
  skyE: string;
  starDim: string;
  starBright: string;
};

const STEPPED_FPS = 6;
const STEP_MS = Math.floor(1000 / STEPPED_FPS);
const CYCLE_STEPS = 600;

const CYCLE_PALETTES: Palette[] = [
  {
    groundDark: "#080a0d",
    groundMid: "#0e1118",
    horizonGlow: "#2a1e14",
    horizonMid: "#1a1510",
    ridgeFar: "#12151c",
    ridgeNear: "#0c0f14",
    skyA: "#060810",
    skyB: "#080b14",
    skyC: "#0a0e18",
    skyD: "#10141e",
    skyE: "#181820",
    starDim: "#3a3830",
    starBright: "#6a6250",
  },
  {
    groundDark: "#0a0c10",
    groundMid: "#10141c",
    horizonGlow: "#30241a",
    horizonMid: "#1e1814",
    ridgeFar: "#141820",
    ridgeNear: "#0e1218",
    skyA: "#080a14",
    skyB: "#0a0e18",
    skyC: "#0e121e",
    skyD: "#141824",
    skyE: "#1c1c28",
    starDim: "#443c34",
    starBright: "#7a6e58",
  },
  {
    groundDark: "#0c0e12",
    groundMid: "#12161e",
    horizonGlow: "#382a1e",
    horizonMid: "#241c16",
    ridgeFar: "#161a24",
    ridgeNear: "#10141a",
    skyA: "#0a0c16",
    skyB: "#0c101a",
    skyC: "#101420",
    skyD: "#181c28",
    skyE: "#20202c",
    starDim: "#4a4238",
    starBright: "#8a7e64",
  },
  {
    groundDark: "#0a0c10",
    groundMid: "#10141c",
    horizonGlow: "#30241a",
    horizonMid: "#1e1814",
    ridgeFar: "#141820",
    ridgeNear: "#0e1218",
    skyA: "#080a14",
    skyB: "#0a0e18",
    skyC: "#0e121e",
    skyD: "#141824",
    skyE: "#1c1c28",
    starDim: "#443c34",
    starBright: "#7a6e58",
  },
];

// Sparse fixed star positions across the sky region (y < 65)
const STAR_POSITIONS: [number, number][] = [
  [12, 6], [28, 3], [45, 10], [67, 5], [88, 8],
  [110, 4], [130, 7], [148, 3], [20, 18], [52, 15],
  [78, 12], [95, 20], [120, 16], [140, 22], [8, 30],
  [35, 25], [62, 28], [105, 32], [135, 26], [155, 30],
  [15, 42], [42, 38], [72, 44], [98, 40], [125, 36],
  [145, 45], [55, 50], [85, 48], [115, 52], [30, 55],
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = Number.parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${b2})`;
}

export function PixelSceneryBackground() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % CYCLE_STEPS);
    }, STEP_MS);

    return () => clearInterval(interval);
  }, []);

  const colors = useMemo(() => {
    const paletteCount = CYCLE_PALETTES.length;
    const totalSegments = paletteCount;
    const normalized = step / CYCLE_STEPS;
    const segmentRaw = normalized * totalSegments;
    const index = Math.floor(segmentRaw) % paletteCount;
    const nextIndex = (index + 1) % paletteCount;
    const localProgress = segmentRaw - Math.floor(segmentRaw);
    const steppedProgress = Math.round(localProgress * 4) / 4;
    const from = CYCLE_PALETTES[index]!;
    const to = CYCLE_PALETTES[nextIndex]!;

    return {
      groundDark: lerpColor(from.groundDark, to.groundDark, steppedProgress),
      groundMid: lerpColor(from.groundMid, to.groundMid, steppedProgress),
      horizonGlow: lerpColor(from.horizonGlow, to.horizonGlow, steppedProgress),
      horizonMid: lerpColor(from.horizonMid, to.horizonMid, steppedProgress),
      ridgeFar: lerpColor(from.ridgeFar, to.ridgeFar, steppedProgress),
      ridgeNear: lerpColor(from.ridgeNear, to.ridgeNear, steppedProgress),
      skyA: lerpColor(from.skyA, to.skyA, steppedProgress),
      skyB: lerpColor(from.skyB, to.skyB, steppedProgress),
      skyC: lerpColor(from.skyC, to.skyC, steppedProgress),
      skyD: lerpColor(from.skyD, to.skyD, steppedProgress),
      skyE: lerpColor(from.skyE, to.skyE, steppedProgress),
      starDim: lerpColor(from.starDim, to.starDim, steppedProgress),
      starBright: lerpColor(from.starBright, to.starBright, steppedProgress),
    };
  }, [step]);

  // Subtle star twinkle
  const twinklePhase = step % 16;

  return (
    <View pointerEvents="none" style={styles.root}>
      <Svg
        height="100%"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={styles.svg}
        viewBox="0 0 160 100"
        width="100%"
      >
        <Defs>
          <Pattern height="4" id="pixelNoise" patternUnits="userSpaceOnUse" width="4">
            <Rect fill="#ffffff" fillOpacity={0.015} height="1" width="1" x="0" y="0" />
            <Rect fill="#ffffff" fillOpacity={0.01} height="1" width="1" x="2" y="2" />
            <Rect fill="#000000" fillOpacity={0.03} height="1" width="1" x="1" y="3" />
            <Rect fill="#000000" fillOpacity={0.02} height="1" width="1" x="3" y="1" />
          </Pattern>
        </Defs>

        {/* Deep sky gradient bands */}
        <Rect fill={colors.skyA} height="20" width="160" x="0" y="0" />
        <Rect fill={colors.skyB} height="16" width="160" x="0" y="20" />
        <Rect fill={colors.skyC} height="14" width="160" x="0" y="36" />
        <Rect fill={colors.skyD} height="12" width="160" x="0" y="50" />
        <Rect fill={colors.skyE} height="10" width="160" x="0" y="62" />

        {/* Warm horizon glow band */}
        <Rect fill={colors.horizonMid} height="8" width="160" x="0" y="72" />
        <Rect fill={colors.horizonGlow} height="6" width="160" x="0" y="80" />

        {/* Stars — sparse, twinkling */}
        {STAR_POSITIONS.map(([sx, sy], i) => {
          const isBright = (i + twinklePhase) % 5 === 0;
          const opacity = isBright ? 0.7 : 0.3 + (i % 3) * 0.1;
          return (
            <Circle
              key={`star-${i}`}
              cx={sx}
              cy={sy}
              r={isBright ? 0.6 : 0.4}
              fill={isBright ? colors.starBright : colors.starDim}
              opacity={opacity}
            />
          );
        })}

        {/* Far ridgeline — jagged desert mountains */}
        <Polygon
          fill={colors.ridgeFar}
          points="0,100 0,78 8,82 16,74 28,80 38,70 50,76 64,66 78,74 92,62 108,72 120,68 136,76 148,72 160,78 160,100"
        />

        {/* Near ridgeline — closer, darker */}
        <Polygon
          fill={colors.ridgeNear}
          points="0,100 0,86 12,88 24,82 38,86 52,80 68,86 84,78 100,84 118,80 134,86 148,82 160,86 160,100"
        />

        {/* Ground plane */}
        <Rect fill={colors.groundMid} height="10" width="160" x="0" y="90" />
        <Rect fill={colors.groundDark} height="4" width="160" x="0" y="96" />

        {/* Subtle noise overlay */}
        <Rect fill="url(#pixelNoise)" height="100" width="160" x="0" y="0" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
