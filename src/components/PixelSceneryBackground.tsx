import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Polygon, Rect } from "react-native-svg";

type Palette = {
  cloudDark: string;
  cloudLight: string;
  grassA: string;
  grassB: string;
  ground: string;
  mountainFar: string;
  mountainNear: string;
  skyA: string;
  skyB: string;
  skyC: string;
  skyD: string;
  skyE: string;
  sunCore: string;
  sunGlow: string;
};

const STEPPED_FPS = 8;
const STEP_MS = Math.floor(1000 / STEPPED_FPS);
const CYCLE_STEPS = 520;

const CYCLE_PALETTES: Palette[] = [
  {
    cloudDark: "#d8e5ef",
    cloudLight: "#f1f6fb",
    grassA: "#80ae6a",
    grassB: "#89b872",
    ground: "#3f6077",
    mountainFar: "#6a8fb0",
    mountainNear: "#4f7695",
    skyA: "#4f79a9",
    skyB: "#628fc0",
    skyC: "#76abd3",
    skyD: "#d39a69",
    skyE: "#efbc86",
    sunCore: "#ffe8aa",
    sunGlow: "#ffd27b",
  },
  {
    cloudDark: "#dde8f3",
    cloudLight: "#f8fbff",
    grassA: "#82b56d",
    grassB: "#8dc078",
    ground: "#46697f",
    mountainFar: "#7498b8",
    mountainNear: "#5b809f",
    skyA: "#6a96c5",
    skyB: "#7eabcf",
    skyC: "#92bddf",
    skyD: "#e3b47d",
    skyE: "#f5cb95",
    sunCore: "#fff2c4",
    sunGlow: "#ffdd98",
  },
  {
    cloudDark: "#e3dfd0",
    cloudLight: "#f7f1dd",
    grassA: "#87ad63",
    grassB: "#92ba6e",
    ground: "#4f6980",
    mountainFar: "#7f92ab",
    mountainNear: "#667f99",
    skyA: "#8f8eb0",
    skyB: "#a18eb6",
    skyC: "#bb91b1",
    skyD: "#e49d73",
    skyE: "#f0bf8a",
    sunCore: "#ffe7a7",
    sunGlow: "#ffcc7b",
  },
  {
    cloudDark: "#d8cfbe",
    cloudLight: "#eee2c9",
    grassA: "#789b59",
    grassB: "#83a863",
    ground: "#3f5d75",
    mountainFar: "#6c829c",
    mountainNear: "#536b86",
    skyA: "#676590",
    skyB: "#7e7098",
    skyC: "#a6789a",
    skyD: "#d28d63",
    skyE: "#e8ae76",
    sunCore: "#ffd58b",
    sunGlow: "#fbb96b",
  },
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
      cloudDark: lerpColor(from.cloudDark, to.cloudDark, steppedProgress),
      cloudLight: lerpColor(from.cloudLight, to.cloudLight, steppedProgress),
      grassA: lerpColor(from.grassA, to.grassA, steppedProgress),
      grassB: lerpColor(from.grassB, to.grassB, steppedProgress),
      ground: lerpColor(from.ground, to.ground, steppedProgress),
      mountainFar: lerpColor(from.mountainFar, to.mountainFar, steppedProgress),
      mountainNear: lerpColor(from.mountainNear, to.mountainNear, steppedProgress),
      skyA: lerpColor(from.skyA, to.skyA, steppedProgress),
      skyB: lerpColor(from.skyB, to.skyB, steppedProgress),
      skyC: lerpColor(from.skyC, to.skyC, steppedProgress),
      skyD: lerpColor(from.skyD, to.skyD, steppedProgress),
      skyE: lerpColor(from.skyE, to.skyE, steppedProgress),
      sunCore: lerpColor(from.sunCore, to.sunCore, steppedProgress),
      sunGlow: lerpColor(from.sunGlow, to.sunGlow, steppedProgress),
    };
  }, [step]);

  const cloudOffsetOne = Math.floor(((step % 160) - 80) / 4);
  const cloudOffsetTwo = Math.floor((80 - (step % 160)) / 5);
  const sunFloatOffset = Math.floor(Math.sin((step / CYCLE_STEPS) * Math.PI * 2) * 3);

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
          <Pattern height="4" id="pixelDither" patternUnits="userSpaceOnUse" width="4">
            <Rect fill="#ffffff" fillOpacity={0.08} height="1" width="1" x="0" y="0" />
            <Rect fill="#ffffff" fillOpacity={0.06} height="1" width="1" x="2" y="1" />
            <Rect fill="#000000" fillOpacity={0.05} height="1" width="1" x="1" y="3" />
            <Rect fill="#000000" fillOpacity={0.04} height="1" width="1" x="3" y="2" />
          </Pattern>
        </Defs>

        <Rect fill={colors.skyA} height="24" width="160" x="0" y="0" />
        <Rect fill={colors.skyB} height="22" width="160" x="0" y="24" />
        <Rect fill={colors.skyC} height="18" width="160" x="0" y="46" />
        <Rect fill={colors.skyD} height="16" width="160" x="0" y="64" />
        <Rect fill={colors.skyE} height="20" width="160" x="0" y="80" />

        <Rect fill={colors.sunGlow} height="12" width="12" x="124" y={10 + sunFloatOffset} />
        <Rect fill={colors.sunCore} height="8" width="8" x="126" y={12 + sunFloatOffset} />

        <Rect fill={colors.cloudLight} height="6" width="28" x={16 + cloudOffsetOne} y="14" />
        <Rect fill={colors.cloudLight} height="6" width="14" x={22 + cloudOffsetOne} y="8" />
        <Rect fill={colors.cloudDark} height="4" width="10" x={34 + cloudOffsetOne} y="14" />

        <Rect fill={colors.cloudLight} height="6" width="24" x={102 + cloudOffsetTwo} y="20" />
        <Rect fill={colors.cloudLight} height="6" width="12" x={108 + cloudOffsetTwo} y="14" />
        <Rect fill={colors.cloudDark} height="4" width="8" x={118 + cloudOffsetTwo} y="20" />

        <Polygon
          fill={colors.mountainFar}
          points="0,100 0,70 14,78 26,64 40,76 56,58 73,74 90,52 112,72 132,60 148,70 160,64 160,100"
        />

        <Polygon
          fill={colors.mountainNear}
          points="0,100 0,82 18,90 34,78 52,88 70,72 92,90 116,74 138,86 160,78 160,100"
        />

        <Rect fill={colors.ground} height="8" width="160" x="0" y="92" />
        <Rect fill={colors.grassA} height="1" width="5" x="4" y="91" />
        <Rect fill={colors.grassB} height="1" width="6" x="18" y="91" />
        <Rect fill={colors.grassA} height="1" width="4" x="33" y="91" />
        <Rect fill={colors.grassB} height="1" width="5" x="50" y="91" />
        <Rect fill={colors.grassA} height="1" width="7" x="68" y="91" />
        <Rect fill={colors.grassB} height="1" width="6" x="89" y="91" />
        <Rect fill={colors.grassA} height="1" width="5" x="110" y="91" />
        <Rect fill={colors.grassB} height="1" width="7" x="130" y="91" />
        <Rect fill={colors.grassA} height="1" width="5" x="148" y="91" />

        <Rect fill="url(#pixelDither)" height="100" width="160" x="0" y="0" />
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
