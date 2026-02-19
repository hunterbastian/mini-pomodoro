import { View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

/**
 * Dither art: an 8-bit fantasy castle landscape.
 * Uses ordered (Bayer 4×4) dithering for shading gradients.
 * Scene: starry sky, moon, distant mountains, castle silhouette on a hill.
 */

const PIXEL = 4;
const W = 64;
const H = 22;

// Bayer 4×4 ordered dither threshold matrix
const BAYER4 = [
  [0,  8,  2, 10],
  [12, 4, 14,  6],
  [3, 11,  1,  9],
  [15, 7, 13,  5],
];
function bayer(col: number, row: number): number {
  return BAYER4[row % 4][col % 4] / 16;
}

// Terrain layers (rows from top = 0)
// Sky ends, ground starts at row 16
const GROUND_ROW = 16;

// Mountain profile: low distant mountains
function mountainHeight(x: number): number {
  const m1 = Math.max(0, 7 - Math.abs(x - 10) * 0.9);
  const m2 = Math.max(0, 6 - Math.abs(x - 26) * 0.8);
  const m3 = Math.max(0, 5 - Math.abs(x - 55) * 0.7);
  return Math.round(Math.max(m1, m2, m3));
}

// Castle structure: defined as a set of filled pixel blocks [col, row] relative to top-left
// Castle sits on a hill at around col 34–44, hill top at row 14
const HILL_CENTER = 38;
const HILL_ROW = 15; // row where hill peak is

function hillHeight(x: number): number {
  const d = Math.abs(x - HILL_CENTER);
  return Math.max(0, Math.round(5 - d * 0.55));
}

// Castle blueprint (col offset from castle left=33, row offset from castle top=9)
// Legend: 1=wall, 2=tower, 3=window(dark), 4=gate
const CASTLE_LEFT = 33;
const CASTLE_TOP = 9;
const CASTLE_GRID: number[][] = [
  [0,0,0, 2,1,2, 0,0,0, 2,1,2, 0,0,0],
  [0,0,0, 2,1,2, 0,0,0, 2,1,2, 0,0,0],
  [0,0,0, 1,1,1, 1,1,1, 1,1,1, 0,0,0],
  [0,0,0, 1,3,1, 1,1,1, 1,3,1, 0,0,0],
  [0,0,0, 1,1,1, 1,1,1, 1,1,1, 0,0,0],
  [0,0,0, 1,1,1, 1,4,1, 1,1,1, 0,0,0],
];

function getCastleBlock(col: number, row: number): number {
  const cr = row - CASTLE_TOP;
  const cc = col - CASTLE_LEFT;
  if (cr < 0 || cr >= CASTLE_GRID.length) return 0;
  if (cc < 0 || cc >= CASTLE_GRID[0].length) return 0;
  return CASTLE_GRID[cr][cc];
}

// Fixed stars [col, row]
const STARS: Array<[number, number, number]> = [ // col, row, brightness 0–1
  [3,  1, 0.9], [10, 2, 0.7], [18, 1, 1.0], [28, 0, 0.8], [40, 2, 0.6],
  [52, 1, 0.9], [59, 3, 0.7], [6,  4, 0.5], [22, 4, 0.8], [47, 3, 1.0],
  [56, 5, 0.6], [2,  7, 0.4], [14, 6, 0.7], [30, 5, 0.9], [44, 6, 0.5],
  [62, 4, 0.8], [8,  9, 0.3], [50, 7, 0.6],
];

// Moon position
const MOON_COL = 52;
const MOON_ROW = 6;
const MOON_R = 3.2;

type Props = { width?: number };

export function DitherArt({ width = 256 }: Props) {
  const svgW = W * PIXEL;
  const svgH = H * PIXEL;
  const scale = width / svgW;
  const scaledH = svgH * scale;

  const rects: React.ReactNode[] = [];

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const t = bayer(col, row);
      const mh = mountainHeight(col);
      const hh = hillHeight(col);
      const moonDist = Math.sqrt((col - MOON_COL) ** 2 + (row - MOON_ROW) ** 2);
      const inMoon = moonDist < MOON_R;
      const hillRow = HILL_ROW - hh;
      const inHill = row >= hillRow && row >= GROUND_ROW - 2;
      const castleType = getCastleBlock(col, row);
      const inMountain = row >= GROUND_ROW - mh && row < GROUND_ROW;
      const inGround = row >= GROUND_ROW;

      let fill: string | null = null;

      if (castleType > 0) {
        // Castle brickwork
        if (castleType === 3) {
          // Window: dark void with slight glow
          fill = t < 0.3 ? "#7c6af7" : "#0a0916";
        } else if (castleType === 4) {
          // Gate arch
          fill = t < 0.25 ? "#4a3ab0" : "#08070f";
        } else if (castleType === 2) {
          // Merlon/battlement top
          const brickPat = (col + row) % 4 < 2;
          fill = brickPat ? "#2e2c46" : "#1e1c34";
        } else {
          // Wall: stone texture via Bayer
          const brickPat = ((col % 6 < 3) !== (row % 4 < 2));
          if (t < 0.6) {
            fill = brickPat ? "#2a2840" : "#222030";
          } else {
            fill = brickPat ? "#1e1c2e" : "#18162a";
          }
        }
      } else if (row >= HILL_ROW - hh && row < GROUND_ROW && hillHeight(col) > 0) {
        // Hill: dark green Minecraft grass/dirt
        if (row === HILL_ROW - hh) {
          // Grass top row
          fill = t < 0.55 ? "#3a5c42" : "#2a4232";
        } else {
          // Dirt
          fill = t < 0.4 ? "#2e2820" : "#201e16";
        }
      } else if (inGround) {
        // Ground: stone/grass row
        if (row === GROUND_ROW) {
          const grassPat = (col % 3 === 0);
          fill = grassPat ? "#2e4c36" : (t < 0.5 ? "#242a1e" : "#1c2018");
        } else {
          // Deep dirt/stone
          fill = t < 0.3 ? "#201e28" : "#161420";
        }
      } else if (inMountain) {
        const depth = (row - (GROUND_ROW - mh)) / Math.max(1, mh);
        const bright = 0.28 - depth * 0.18;
        fill = bright > t * 0.6 ? "#252238" : "#191726";
      } else if (inMoon) {
        const edge = moonDist / MOON_R;
        const mb = 1 - edge * 0.5;
        if (mb > t) {
          fill = edge < 0.5 ? "#d8d4ff" : "#a594ff";
        }
      } else {
        // Sky
        const star = STARS.find(([sc, sr]) => sc === col && sr === row);
        if (star) {
          const [, , bright] = star;
          fill = bright > t ? "#b8b4e0" : "#6a64a8";
        } else {
          // Sky dither: very subtle gradient
          const skyBright = 0.08 + (row / GROUND_ROW) * 0.14;
          if (skyBright > t * 0.7) {
            fill = "#13112a";
          }
        }
      }

      if (fill) {
        rects.push(
          <Rect
            key={`${col}-${row}`}
            x={col * PIXEL}
            y={row * PIXEL}
            width={PIXEL}
            height={PIXEL}
            fill={fill}
          />,
        );
      }
    }
  }

  return (
    <View style={{ width, height: scaledH, overflow: "hidden" }}>
      <Svg
        width={svgW}
        height={svgH}
        style={{ transform: [{ scale }], transformOrigin: "top left" } as object}
        viewBox={`0 0 ${svgW} ${svgH}`}
      >
        {/* Deep space background */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill="#0a091a" />

        {/* Moon glow */}
        <Circle
          cx={MOON_COL * PIXEL + PIXEL / 2}
          cy={MOON_ROW * PIXEL + PIXEL / 2}
          r={MOON_R * PIXEL * 2.4}
          fill="#3a2a8a"
          opacity={0.22}
        />

        {rects}

        {/* Scanline overlay: subtle horizontal lines every 2 pixels */}
        {Array.from({ length: H }, (_, i) => (
          <Rect
            key={`sl-${i}`}
            x={0}
            y={i * PIXEL + PIXEL - 1}
            width={svgW}
            height={1}
            fill="#000000"
            opacity={0.12}
          />
        ))}
      </Svg>
    </View>
  );
}
