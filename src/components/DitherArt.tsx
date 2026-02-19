/* ─────────────────────────────────────────────────────────
 * DitherArt — Stardew Valley farm banner
 *
 * Scene (left → right):
 *   Sky with warm sunrise gradient + dithered clouds
 *   Rolling green hills, dirt path, wooden fence
 *   Left: farmhouse with red roof, chimney, warm window glow
 *   Center: tilled soil rows, crops (wheat/turnips/pumpkin)
 *   Right: oak tree, small chicken, sunflower
 *   Foreground: grass tuft, wildflowers
 *
 * Canvas: 80 × 26 pixels, PIXEL = 4 px → 320 × 104 rendered
 * Palette: warm SDV-style earthy tones
 * ───────────────────────────────────────────────────────── */

import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const PIXEL = 4;
const W     = 80;
const H     = 26;

/* ─── Bayer 4×4 ──────────────────────────────────────────── */
const BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];
function bayer(col: number, row: number): number {
  return BAYER4[row & 3]![col & 3]! / 16;
}

/* ─── Palette ─────────────────────────────────────────────── */
// Sky
const SKY_TOP     = "#78b6ff";   // bright midday sky
const SKY_MID     = "#9fd2ff";   // soft valley blue
const SKY_HORIZON = "#d8f0ff";   // pale morning haze
// Clouds
const CLOUD_LT    = "#ffffff";
const CLOUD_DK    = "#d7ecff";
// Ground
const HILL_GRASS  = "#6eae45";
const HILL_SHADOW = "#518536";
const HILL_DARK   = "#3f6d2a";
const DIRT_PATH   = "#b88953";
const DIRT_SHADOW = "#8d6437";
// Farmhouse
const ROOF_MAIN   = "#c54c2b";   // red SDV roof
const ROOF_SHADOW = "#88321a";
const WALL_MAIN   = "#f2d29f";   // warm cream wall
const WALL_SHADOW = "#c59a5d";
const WINDOW_GLOW = "#ffd86c";   // warm candlelight
const WINDOW_DK   = "#d39f34";
const CHIMNEY     = "#6d533c";
const SMOKE       = "#b6c8db";
// Crops
const SOIL        = "#8b5a2e";
const SOIL_DK     = "#6d4321";
const CROP_GREEN  = "#6cbf3b";
const CROP_SHADOW = "#3f7f22";
const WHEAT_GOLD  = "#e3ba45";
const WHEAT_LT    = "#f5d87a";
const PUMPKIN     = "#d67b28";
const PUMPKIN_LT  = "#f3a045";
const TURNIP_LT   = "#edd7ff";
const TURNIP_DK   = "#bea1d8";
// Fence
const FENCE_WOOD  = "#d8a45a";
const FENCE_SHADOW= "#9a6a33";
// Tree
const TREE_TRUNK  = "#7e5329";
const TREE_BARK   = "#5d3a1b";
const LEAF_A      = "#5da33a";
const LEAF_B      = "#447b2b";
const LEAF_C      = "#75bf46";
// Sunflower
const SUNPETAL    = "#f6cf3e";
const SUNPETAL_DK = "#d9a925";
const SUNCENTER   = "#6a3510";
// Chicken
const CHKN_WHITE  = "#fcf7ee";
const CHKN_RED    = "#d64a3a";
const CHKN_BEAK   = "#f2aa35";
// Wildflower
const FLOWER_A    = "#f07ba8";   // pink
const FLOWER_B    = "#8b78dc";   // lavender
const FLOWER_STEM = "#4e8d2b";

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

  /* ── Sky gradient ──────────────────────────────────────── */
  for (let y = 0; y < 14; y++) {
    const frac = y / 13;
    for (let x = 0; x < W; x++) {
      const t = bayer(x, y);
      if (frac < 0.3) {
        p(g, x, y, t < frac / 0.3 + 0.1 ? SKY_MID : SKY_TOP);
      } else if (frac < 0.7) {
        const sub = (frac - 0.3) / 0.4;
        p(g, x, y, t < sub ? SKY_HORIZON : SKY_MID);
      } else {
        p(g, x, y, t < 0.55 ? SKY_HORIZON : SKY_MID);
      }
    }
  }

  /* ── Clouds (fluffy blobs) ─────────────────────────────── */
  // Cloud 1: top-right area
  const cloud1: [number, number][] = [
    [55,2],[56,2],[57,2],[58,2],
    [54,3],[55,3],[56,3],[57,3],[58,3],[59,3],[60,3],
    [55,4],[56,4],[57,4],[58,4],[59,4],
  ];
  for (const [cx, cy] of cloud1)
    p(g, cx, cy, bayer(cx, cy) < 0.6 ? CLOUD_LT : CLOUD_DK);

  // Cloud 2: left
  const cloud2: [number, number][] = [
    [8,1],[9,1],[10,1],
    [7,2],[8,2],[9,2],[10,2],[11,2],[12,2],
    [8,3],[9,3],[10,3],[11,3],
  ];
  for (const [cx, cy] of cloud2)
    p(g, cx, cy, bayer(cx, cy) < 0.55 ? CLOUD_LT : CLOUD_DK);

  /* ── Rolling hills (background) ───────────────────────── */
  // Far hill - row 11–13
  for (let x = 0; x < W; x++) {
    const h = Math.round(2 * Math.sin(x * 0.09 + 0.5) + 0.8 * Math.sin(x * 0.17));
    for (let y = 12 - Math.max(0, h); y <= 13; y++) {
      p(g, x, y, bayer(x, y) < 0.45 ? HILL_SHADOW : HILL_DARK);
    }
  }

  /* ── Ground base rows 14–25 ────────────────────────────── */
  dith(g, 0, 14, W - 1, 15, HILL_GRASS, HILL_SHADOW, 0.55);
  dith(g, 0, 16, W - 1, 17, HILL_SHADOW, HILL_DARK, 0.5);
  fill(g, 0, 18, W - 1, 25, HILL_DARK);

  /* ── Tilled soil rows (crops area x=28–55, rows 18–24) ── */
  for (let y = 18; y <= 24; y++) {
    for (let x = 28; x <= 55; x++) {
      p(g, x, y, bayer(x, y) < 0.45 ? SOIL : SOIL_DK);
    }
  }
  // Soil tilling lines
  for (let x = 28; x <= 55; x += 4) {
    vline(g, x, 18, 24, SOIL_DK);
  }

  /* ── Dirt path (center bottom, cols 36–44, rows 23–25) ── */
  dith(g, 36, 23, 44, 25, DIRT_PATH, DIRT_SHADOW, 0.55);

  /* ── FARMHOUSE (cols 2–18, rows 10–24) ─────────────────── */
  // Chimney (col 6, rows 8–11)
  fill(g, 6, 8, 7, 11, CHIMNEY);
  p(g, 6, 7, bayer(6,7)<0.5 ? SMOKE : null);
  p(g, 7, 6, bayer(7,6)<0.4 ? SMOKE : null);
  p(g, 8, 5, bayer(8,5)<0.3 ? SMOKE : null);

  // Roof (triangle, rows 10–13)
  for (let y = 10; y <= 13; y++) {
    const half = (13 - y) * 2 + 1;
    const cx = 10;
    const x0 = cx - half;
    const x1 = cx + half;
    for (let x = x0; x <= x1; x++) {
      const edge = (x === x0 || x === x1);
      if (y === 10) {
        p(g, x, y, ROOF_SHADOW);
      } else {
        p(g, x, y, edge ? ROOF_SHADOW : (bayer(x,y)<0.6 ? ROOF_MAIN : ROOF_SHADOW));
      }
    }
  }
  // Roof ridge trim
  hline(g, 9, 11, 10, WALL_MAIN);

  // Walls (cols 3–17, rows 14–24)
  for (let y = 14; y <= 24; y++) {
    for (let x = 3; x <= 17; x++) {
      const shadow = x <= 4 || x >= 16;
      p(g, x, y, shadow ? WALL_SHADOW : (bayer(x,y)<0.5 ? WALL_MAIN : WALL_SHADOW));
    }
  }

  // Windows (left: col 4–6 row 15–17, right: col 13–15 row 15–17)
  for (let wy = 15; wy <= 17; wy++) {
    for (let wx = 4; wx <= 6; wx++) {
      p(g, wx, wy, bayer(wx,wy)<0.65 ? WINDOW_GLOW : WINDOW_DK);
    }
    for (let wx = 13; wx <= 15; wx++) {
      p(g, wx, wy, bayer(wx,wy)<0.65 ? WINDOW_GLOW : WINDOW_DK);
    }
  }
  // Window frame
  hline(g, 4, 6, 14, WALL_SHADOW); hline(g, 4, 6, 18, WALL_SHADOW);
  vline(g, 3, 15, 17, WALL_SHADOW); vline(g, 7, 15, 17, WALL_SHADOW);
  hline(g, 13, 15, 14, WALL_SHADOW); hline(g, 13, 15, 18, WALL_SHADOW);
  vline(g, 12, 15, 17, WALL_SHADOW); vline(g, 16, 15, 17, WALL_SHADOW);

  // Door (col 9–11, rows 20–24)
  fill(g, 9, 20, 11, 24, WALL_SHADOW);
  p(g, 9, 20, ROOF_SHADOW); p(g, 11, 20, ROOF_SHADOW);
  // Door knob
  p(g, 11, 22, WHEAT_GOLD);

  /* ── Wooden fence (cols 19–27, rows 18–21) ─────────────── */
  // Posts
  for (let x = 19; x <= 27; x += 4) {
    vline(g, x, 17, 22, FENCE_WOOD);
    p(g, x, 17, FENCE_SHADOW);
  }
  // Rails
  hline(g, 19, 27, 18, FENCE_WOOD);
  hline(g, 19, 27, 20, FENCE_WOOD);
  hline(g, 19, 27, 22, FENCE_SHADOW);

  /* ── Crops ─────────────────────────────────────────────── */
  // Wheat stalks (cols 28–34, rows 15–21)
  for (let x = 29; x <= 34; x += 3) {
    vline(g, x, 17, 21, CROP_GREEN);
    // Wheat head
    p(g, x,   16, WHEAT_GOLD);
    p(g, x-1, 16, bayer(x-1,16)<0.5 ? WHEAT_GOLD : WHEAT_LT);
    p(g, x+1, 16, bayer(x+1,16)<0.5 ? WHEAT_GOLD : null);
    p(g, x,   15, bayer(x,15)<0.6 ? WHEAT_LT : WHEAT_GOLD);
  }

  // Turnips (cols 38–43, rows 19–21) — purple bulbs
  for (let x = 38; x <= 43; x += 3) {
    p(g, x,   19, CROP_GREEN); p(g, x, 20, CROP_GREEN);
    dith(g, x-1, 21, x+1, 22, TURNIP_LT, TURNIP_DK, 0.55);
    p(g, x, 20, CROP_SHADOW);
  }

  // Pumpkin (cols 47–51, rows 21–23)
  dith(g, 47, 21, 51, 23, PUMPKIN_LT, PUMPKIN, 0.5);
  p(g, 49, 20, CROP_GREEN); // stem
  // Pumpkin ribs
  vline(g, 49, 21, 23, PUMPKIN);
  p(g, 47, 21, PUMPKIN); p(g, 51, 21, PUMPKIN);
  p(g, 47, 23, PUMPKIN); p(g, 51, 23, PUMPKIN);

  /* ── OAK TREE (cols 58–68, rows 8–24) ─────────────────── */
  // Trunk (col 62–63, rows 19–24)
  for (let y = 19; y <= 24; y++) {
    p(g, 62, y, bayer(62,y)<0.6 ? TREE_TRUNK : TREE_BARK);
    p(g, 63, y, TREE_BARK);
  }
  // Canopy (irregular blob)
  const canopyPixels: [number, number][] = [
    [60,8],[61,8],[62,8],[63,8],[64,8],
    [58,9],[59,9],[60,9],[61,9],[62,9],[63,9],[64,9],[65,9],[66,9],
    [57,10],[58,10],[59,10],[60,10],[61,10],[62,10],[63,10],[64,10],[65,10],[66,10],[67,10],
    [57,11],[58,11],[59,11],[60,11],[61,11],[62,11],[63,11],[64,11],[65,11],[66,11],[67,11],
    [58,12],[59,12],[60,12],[61,12],[62,12],[63,12],[64,12],[65,12],[66,12],[67,12],
    [59,13],[60,13],[61,13],[62,13],[63,13],[64,13],[65,13],[66,13],
    [60,14],[61,14],[62,14],[63,14],[64,14],[65,14],
    [61,15],[62,15],[63,15],[64,15],
    [62,16],[63,16],
  ];
  for (const [cx, cy] of canopyPixels) {
    const edge = (cy === 8 || cy === 16 || cx === 57 || cx === 67);
    p(g, cx, cy, edge ? LEAF_B : (bayer(cx,cy) < 0.45 ? LEAF_A : bayer(cx,cy) < 0.7 ? LEAF_C : LEAF_B));
  }
  // Leaf shadow on right side
  for (const [cx, cy] of canopyPixels) {
    if (cx >= 65) p(g, cx, cy, bayer(cx,cy)<0.4 ? LEAF_B : LEAF_A);
  }

  /* ── SUNFLOWER (col 70–72, rows 15–24) ─────────────────── */
  // Stem
  vline(g, 71, 19, 24, FLOWER_STEM);
  p(g, 70, 21, LEAF_A);  p(g, 72, 22, LEAF_A); // leaves
  // Petals
  const sunPetals: [number, number][] = [
    [71,15],[70,16],[72,16],[69,17],[73,17],[70,18],[72,18],[71,19],
  ];
  for (const [sx, sy] of sunPetals) {
    p(g, sx, sy, bayer(sx,sy)<0.55 ? SUNPETAL : SUNPETAL_DK);
  }
  // Center
  dith(g, 70, 16, 72, 18, SUNCENTER, "#3a1804", 0.5);
  p(g, 71, 17, SUNCENTER);

  /* ── CHICKEN (col 74–77, rows 20–24) ───────────────────── */
  // Body
  dith(g, 74, 21, 77, 24, CHKN_WHITE, "#d8d0c0", 0.55);
  // Head (col 76–77, rows 19–21)
  dith(g, 76, 19, 77, 21, CHKN_WHITE, "#d8d0c0", 0.6);
  // Comb
  p(g, 76, 18, CHKN_RED); p(g, 77, 18, CHKN_RED);
  // Beak
  p(g, 78, 20, CHKN_BEAK);
  // Eye
  p(g, 77, 19, "#1a1010");
  // Wing crease
  hline(g, 74, 76, 22, "#b8b0a0");
  // Feet
  p(g, 74, 25, CHKN_BEAK); p(g, 76, 25, CHKN_BEAK);

  /* ── Wildflowers foreground (scattered) ─────────────────── */
  const flowers: [number, number, Color][] = [
    [2, 24, FLOWER_A], [21, 24, FLOWER_B], [56, 24, FLOWER_A],
    [69, 24, FLOWER_B], [79, 24, FLOWER_A],
  ];
  for (const [fx, fy, fc] of flowers) {
    p(g, fx, fy,     fc);
    p(g, fx, fy + 1, FLOWER_STEM);
  }

  /* ── Grass tufts on foreground row ──────────────────────── */
  for (let x = 0; x < W; x += 5) {
    if (bayer(x, 24) < 0.5) {
      p(g, x,   23, HILL_GRASS);
      p(g, x+1, 22, HILL_GRASS);
    }
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
        {/* Sky base fill */}
        <Rect x={0} y={0} width={svgW} height={svgH} fill={SKY_TOP} />

        {rects.map((r, i) => (
          <Rect key={i} x={r.x} y={r.y} width={PIXEL} height={PIXEL} fill={r.fill} />
        ))}

        {/* Subtle scanlines */}
        {Array.from({ length: H }, (_, i) => (
          <Rect key={`sl-${i}`} x={0} y={i * PIXEL + PIXEL - 1} width={svgW} height={1} fill="#000" opacity={0.08} />
        ))}
      </Svg>
    </View>
  );
}
