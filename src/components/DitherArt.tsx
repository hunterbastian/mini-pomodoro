/* ─────────────────────────────────────────────────────────
 * DitherArt — Ambient Outpost style landscape banner
 *
 * Scene (left -> right):
 *   Dark sky with sparse stars, faint amber horizon glow
 *   Distant mesa ridgeline
 *   Left: radio tower with blinking signal light
 *   Center: low outpost structure with warm window glow
 *   Right: antenna dish, distant power lines
 *   Foreground: dark desert floor with scattered rocks
 *
 * Canvas: 80 x 26 pixels, PIXEL = 4 -> 320 x 104 rendered
 * Palette: deep voids + warm amber signals
 * ───────────────────────────────────────────────────────── */

import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const PIXEL = 4;
const W     = 80;
const H     = 26;

/* --- Bayer 4x4 ------------------------------------------ */
const BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];
function bayer(col: number, row: number): number {
  return BAYER4[row & 3]![col & 3]! / 16;
}

/* --- Palette --------------------------------------------- */
// Sky
const SKY_DEEP    = "#060810";
const SKY_MID     = "#0a0e18";
const SKY_LOW     = "#10141e";
// Horizon
const HORIZON_DIM = "#1a1510";
const HORIZON_GLO = "#2a1e14";
const HORIZON_AMB = "#3a2a1a";
// Stars
const STAR_DIM    = "#3a3830";
const STAR_BRT    = "#7a6e58";
// Ridgeline
const MESA_FAR    = "#12151c";
const MESA_NEAR   = "#0e1218";
// Ground
const GROUND_A    = "#0c0f14";
const GROUND_B    = "#080a0d";
const ROCK_A      = "#1a1e28";
const ROCK_B      = "#141820";
// Outpost structure
const WALL_MAIN   = "#181c24";
const WALL_DARK   = "#10141a";
const WALL_LIT    = "#1e222c";
const ROOF_MAIN   = "#14181e";
const ROOF_EDGE   = "#0e1016";
// Warm signal lights
const SIGNAL_AMB  = "#c8935a";
const SIGNAL_DIM  = "#9a6d3a";
const WINDOW_GLO  = "#e8b06a";
const WINDOW_DIM  = "#a07840";
// Tower
const TOWER_METAL = "#1e222a";
const TOWER_DARK  = "#141820";
// Antenna dish
const DISH_LT     = "#22262e";
const DISH_DK     = "#181c24";
// Power line
const WIRE_COL    = "#1a1e24";

type Color = string | null;
type Grid  = Color[][];

function make(): Grid {
  return Array.from({ length: H }, () => Array<Color>(W).fill(null));
}
function p(g: Grid, x: number, y: number, c: Color) {
  if (x >= 0 && x < W && y >= 0 && y < H) g[y]![x] = c;
}
function hline(g: Grid, x0: number, x1: number, y: number, c: Color) {
  for (let x = x0; x <= x1; x++) p(g, x, y, c);
}
function vline(g: Grid, x: number, y0: number, y1: number, c: Color) {
  for (let y = y0; y <= y1; y++) p(g, x, y, c);
}
function fill(g: Grid, x0: number, y0: number, x1: number, y1: number, c: Color) {
  for (let y = y0; y <= y1; y++) hline(g, x0, x1, y, c);
}
function dith(g: Grid, x0: number, y0: number, x1: number, y1: number, ca: Color, cb: Color, thresh = 0.5) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    p(g, x, y, bayer(x, y) < thresh ? ca : cb);
}

function buildScene(): Grid {
  const g = make();

  /* -- Sky gradient ---------------------------------------- */
  for (let y = 0; y < 16; y++) {
    const frac = y / 15;
    for (let x = 0; x < W; x++) {
      const t = bayer(x, y);
      if (frac < 0.35) {
        p(g, x, y, t < 0.4 ? SKY_DEEP : SKY_DEEP);
      } else if (frac < 0.65) {
        p(g, x, y, t < frac ? SKY_MID : SKY_DEEP);
      } else {
        p(g, x, y, t < 0.5 ? SKY_LOW : SKY_MID);
      }
    }
  }

  /* -- Horizon glow bands ---------------------------------- */
  for (let x = 0; x < W; x++) {
    p(g, x, 16, bayer(x, 16) < 0.6 ? HORIZON_DIM : SKY_LOW);
    p(g, x, 17, bayer(x, 17) < 0.5 ? HORIZON_GLO : HORIZON_DIM);
    p(g, x, 18, bayer(x, 18) < 0.4 ? HORIZON_AMB : HORIZON_GLO);
  }

  /* -- Stars (sparse, scattered across sky) ---------------- */
  const starPositions: [number, number][] = [
    [5,2], [14,4], [22,1], [31,6], [38,3],
    [47,5], [55,2], [63,7], [72,4], [78,1],
    [10,9], [26,8], [42,10], [58,11], [69,9],
    [18,13], [50,12], [75,13],
  ];
  for (const [sx, sy] of starPositions) {
    const bright = bayer(sx, sy) < 0.35;
    p(g, sx, sy, bright ? STAR_BRT : STAR_DIM);
  }

  /* -- Far mesa ridgeline ---------------------------------- */
  for (let x = 0; x < W; x++) {
    const h = Math.round(1.5 * Math.sin(x * 0.08 + 1.2) + 0.6 * Math.sin(x * 0.19 + 0.4));
    for (let y = 17 - Math.max(0, h); y <= 18; y++) {
      p(g, x, y, MESA_FAR);
    }
  }

  /* -- Near ridgeline -------------------------------------- */
  for (let x = 0; x < W; x++) {
    const h = Math.round(1.2 * Math.sin(x * 0.12 + 2.8) + 0.5 * Math.sin(x * 0.22));
    for (let y = 19 - Math.max(0, h); y <= 19; y++) {
      p(g, x, y, MESA_NEAR);
    }
  }

  /* -- Ground base rows 19-25 ------------------------------ */
  dith(g, 0, 19, W - 1, 20, GROUND_A, GROUND_B, 0.55);
  fill(g, 0, 21, W - 1, 25, GROUND_B);
  dith(g, 0, 21, W - 1, 22, GROUND_A, GROUND_B, 0.4);

  /* -- Scattered rocks ------------------------------------- */
  const rocks: [number, number][] = [
    [6, 22], [19, 23], [34, 21], [52, 22], [66, 23], [74, 21],
  ];
  for (const [rx, ry] of rocks) {
    p(g, rx, ry, ROCK_A);
    p(g, rx + 1, ry, ROCK_B);
    p(g, rx, ry + 1, ROCK_B);
  }

  /* -- RADIO TOWER (cols 4-8, rows 6-20) ------------------- */
  // Vertical mast
  vline(g, 6, 8, 20, TOWER_METAL);
  vline(g, 7, 10, 20, TOWER_DARK);
  // Cross struts
  hline(g, 4, 9, 12, TOWER_DARK);
  hline(g, 5, 8, 16, TOWER_DARK);
  // Diagonal bracing (simplified)
  p(g, 5, 10, TOWER_DARK); p(g, 8, 10, TOWER_DARK);
  p(g, 5, 14, TOWER_DARK); p(g, 8, 14, TOWER_DARK);
  // Signal light at top (warm amber blink)
  p(g, 6, 7, SIGNAL_AMB);
  p(g, 6, 6, SIGNAL_DIM);
  // Faint glow around signal
  p(g, 5, 7, HORIZON_GLO); p(g, 7, 7, HORIZON_GLO);

  /* -- OUTPOST BUILDING (cols 28-52, rows 14-24) ----------- */
  // Main low structure
  fill(g, 28, 16, 52, 24, WALL_MAIN);
  // Roof edge
  hline(g, 27, 53, 15, ROOF_EDGE);
  hline(g, 28, 52, 16, ROOF_MAIN);
  // Wall variation
  for (let y = 17; y <= 24; y++) {
    for (let x = 28; x <= 52; x++) {
      const edge = x <= 29 || x >= 51;
      p(g, x, y, edge ? WALL_DARK : (bayer(x,y) < 0.45 ? WALL_LIT : WALL_MAIN));
    }
  }

  // Windows (warm amber glow)
  // Window 1 (cols 31-33, rows 18-20)
  for (let wy = 18; wy <= 20; wy++) {
    for (let wx = 31; wx <= 33; wx++) {
      p(g, wx, wy, bayer(wx,wy) < 0.6 ? WINDOW_GLO : WINDOW_DIM);
    }
  }
  // Window 2 (cols 37-39, rows 18-20)
  for (let wy = 18; wy <= 20; wy++) {
    for (let wx = 37; wx <= 39; wx++) {
      p(g, wx, wy, bayer(wx,wy) < 0.55 ? WINDOW_GLO : WINDOW_DIM);
    }
  }
  // Window 3 (cols 44-46, rows 18-20)
  for (let wy = 18; wy <= 20; wy++) {
    for (let wx = 44; wx <= 46; wx++) {
      p(g, wx, wy, bayer(wx,wy) < 0.5 ? WINDOW_DIM : WALL_LIT);
    }
  }

  // Door (cols 48-50, rows 21-24)
  fill(g, 48, 21, 50, 24, WALL_DARK);
  // Door light
  p(g, 49, 21, SIGNAL_DIM);

  /* -- ANTENNA DISH (cols 60-68, rows 10-18) --------------- */
  // Dish (curved shape)
  const dishPixels: [number, number][] = [
    [63,10],[64,10],[65,10],
    [62,11],[63,11],[64,11],[65,11],[66,11],
    [61,12],[62,12],[63,12],[64,12],[65,12],[66,12],[67,12],
    [61,13],[62,13],[67,13],
    [62,14],[66,14],
  ];
  for (const [dx, dy] of dishPixels) {
    p(g, dx, dy, bayer(dx, dy) < 0.5 ? DISH_LT : DISH_DK);
  }
  // Support pole
  vline(g, 64, 14, 22, TOWER_METAL);
  vline(g, 65, 16, 22, TOWER_DARK);
  // Base
  hline(g, 63, 66, 22, TOWER_DARK);

  /* -- POWER LINES (right edge, cols 72-78) ---------------- */
  // Poles
  vline(g, 73, 12, 22, WIRE_COL);
  vline(g, 78, 14, 22, WIRE_COL);
  // Wire (slightly sagging)
  hline(g, 73, 78, 13, WIRE_COL);
  p(g, 75, 14, WIRE_COL); p(g, 76, 14, WIRE_COL);
  // Small signal on pole top
  p(g, 73, 11, SIGNAL_DIM);

  /* -- Ambient light spill from windows onto ground -------- */
  for (let x = 30; x <= 34; x++) {
    p(g, x, 21, bayer(x, 21) < 0.3 ? HORIZON_GLO : GROUND_A);
  }
  for (let x = 36; x <= 40; x++) {
    p(g, x, 21, bayer(x, 21) < 0.25 ? HORIZON_DIM : GROUND_A);
  }

  return g;
}

type Props = { width?: number };

export function DitherArt({ width = 320 }: Props) {
  const grid   = buildScene();
  const svgW   = W * PIXEL;
  const svgH   = H * PIXEL;
  const scale  = width / svgW;
  const scaledH = svgH * scale;

  const rects: { x: number; y: number; fill: string }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fill = grid[y]![x];
      if (fill) rects.push({ x: x * PIXEL, y: y * PIXEL, fill });
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
        {/* Deep sky base fill */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill={SKY_DEEP} />

        {rects.map((r, i) => (
          <Rect key={i} x={r.x} y={r.y} width={PIXEL} height={PIXEL} fill={r.fill} />
        ))}

        {/* Subtle scanlines */}
        {Array.from({ length: H }, (_, i) => (
          <Rect key={`sl-${i}`} x={0} y={i * PIXEL + PIXEL - 1} width={svgW} height={1} fill="#000" opacity={0.12} />
        ))}
      </Svg>
    </View>
  );
}
