/* ─────────────────────────────────────────────────────────
 * PixelFlower — Stardew Valley style vase + growing flowers
 *
 * A cozy pixel-art vase that fills with life as sessions complete.
 * Palette matches SDV's warm, saturated earthy tones.
 *
 * Growth stages (clamped at 5):
 *   0  — glass vase with water, empty
 *   1  — single green stem poking out
 *   2  — stem + one pink tulip bud
 *   3  — two stems, one open rose
 *   4  — three stems, rose + sunflower + blue wildflower
 *   5+ — full SDV bouquet: leaves, 4 flowers, sparkle highlights
 *
 * Canvas: 32 × 44 pixels, PIXEL = 5 → 160 × 220 rendered
 * ───────────────────────────────────────────────────────── */

import { StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const PIXEL = 5;
const W     = 32;
const H     = 44;

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
// Vase (clear glass, SDV-style)
const GLASS_HI    = "#d0e8f8";   // specular highlight
const GLASS_LT    = "#90c0e0";   // lit face
const GLASS_MID   = "#5890c0";   // mid glass
const GLASS_DK    = "#2a5888";   // shadow side
const GLASS_RIM   = "#e8f4ff";   // top rim
// Water inside
const WATER_LT    = "#60a8e0";
const WATER_DK    = "#3878b8";
const WATER_SHINE = "#a0d0ff";
// Stems
const STEM_LT     = "#70b830";
const STEM_DK     = "#3a7018";
const LEAF_LT     = "#8acc40";
const LEAF_MID    = "#58a020";
const LEAF_DK     = "#307010";
// Rose / pink flower
const ROSE_LT     = "#f880b0";
const ROSE_MID    = "#e04880";
const ROSE_DK     = "#a02858";
const ROSE_CENTER = "#601030";
// Sunflower
const SUN_LT      = "#fcd840";
const SUN_MID     = "#f0a820";
const SUN_DK      = "#c07010";
const SUN_CENTER  = "#582808";
const SUN_CTR_LT  = "#803818";
// Wildflower / blue
const BLUE_LT     = "#90b8f8";
const BLUE_MID    = "#5080e0";
const BLUE_DK     = "#3050a8";
// Tulip bud
const TULIP_GREEN = "#50a028";
const TULIP_PINK  = "#f060a0";
const TULIP_DK    = "#c03870";
// Sparkle
const SPARKLE     = "#fff8c0";

type Color = string | null;
type Grid  = Color[][];

function make(): Grid {
  return Array.from({ length: H }, () => Array<Color>(W).fill(null));
}
function px(g: Grid, x: number, y: number, c: Color) {
  if (x >= 0 && x < W && y >= 0 && y < H) g[y]![x] = c;
}
function hline(g: Grid, x0: number, x1: number, y: number, c: Color) {
  for (let x = x0; x <= x1; x++) px(g, x, y, c);
}
function vline(g: Grid, x: number, y0: number, y1: number, c: Color) {
  for (let y = y0; y <= y1; y++) px(g, x, y, c);
}
function dith(g: Grid, x0: number, y0: number, x1: number, y1: number, ca: Color, cb: Color, thresh = 0.5) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
    px(g, x, y, bayer(x, y) < thresh ? ca : cb);
}

/* ─── Glass vase body ─────────────────────────────────────── */
// Vase shape: rows 24–43
// Rows 24–26: neck (narrow: cols 12–19)
// Rows 27–43: body (wider, tapers to flat bottom)
function drawVase(g: Grid) {
  // Neck
  for (let y = 24; y <= 26; y++) {
    for (let x = 12; x <= 19; x++) {
      const f = (x - 12) / 7;
      if (f < 0.12 || f > 0.88) px(g, x, y, GLASS_DK);
      else if (f < 0.25) px(g, x, y, GLASS_MID);
      else if (f < 0.55) px(g, x, y, bayer(x,y)<0.5 ? GLASS_LT : GLASS_MID);
      else if (f < 0.78) px(g, x, y, GLASS_MID);
      else px(g, x, y, GLASS_DK);
    }
  }
  // Rim highlight
  hline(g, 12, 19, 24, GLASS_RIM);
  px(g, 12, 24, GLASS_MID); px(g, 19, 24, GLASS_MID);

  // Body rows 27–43
  for (let y = 27; y <= 43; y++) {
    // Shape: bulge at mid-height then taper
    const pct = (y - 27) / 16;
    const bulge = Math.sin(pct * Math.PI) * 4.5;
    const x0 = Math.round(11 - bulge * 0.2);
    const x1 = Math.round(20 + bulge * 0.2);
    const width = x1 - x0;
    for (let x = x0; x <= x1; x++) {
      const f = (x - x0) / Math.max(1, width);
      if (f < 0.08 || f > 0.94) {
        px(g, x, y, GLASS_DK);
      } else if (f < 0.18) {
        px(g, x, y, bayer(x,y)<0.45 ? GLASS_MID : GLASS_DK);
      } else if (f < 0.28) {
        px(g, x, y, bayer(x,y)<0.5 ? GLASS_LT : GLASS_MID);
      } else if (f < 0.45) {
        px(g, x, y, bayer(x,y)<0.6 ? GLASS_HI : GLASS_LT);
      } else if (f < 0.68) {
        px(g, x, y, bayer(x,y)<0.45 ? GLASS_LT : GLASS_MID);
      } else if (f < 0.82) {
        px(g, x, y, bayer(x,y)<0.4 ? GLASS_MID : GLASS_DK);
      } else {
        px(g, x, y, GLASS_DK);
      }
    }
  }
  // Bottom edge
  hline(g, 12, 19, 43, GLASS_DK);
  // Glass refraction line (vertical highlight)
  vline(g, 14, 28, 42, GLASS_HI);
  vline(g, 15, 29, 41, GLASS_LT);

  // Water fill (inside vase, rows 27–32)
  for (let y = 27; y <= 32; y++) {
    const pct = (y - 27) / 16;
    const bulge = Math.sin(pct * Math.PI) * 4.5;
    const x0 = Math.round(12 - bulge * 0.2) + 1;
    const x1 = Math.round(19 + bulge * 0.2) - 1;
    for (let x = x0; x <= x1; x++) {
      px(g, x, y, bayer(x, y) < 0.55 ? (y === 27 ? WATER_SHINE : WATER_LT) : WATER_DK);
    }
  }
}

/* ─── Stems ───────────────────────────────────────────────── */
function drawStem(g: Grid, cx: number, topY: number, bottomY = 26) {
  for (let y = topY; y <= bottomY; y++) {
    const wobble = Math.round(Math.sin((y - topY) * 0.5) * 0.6);
    px(g, cx + wobble,     y, STEM_LT);
    px(g, cx + wobble + 1, y, STEM_DK);
  }
}

function drawLeaf(g: Grid, cx: number, y: number, right: boolean) {
  const d = right ? 1 : -1;
  // SDV leaf: 4-pixel teardrop
  px(g, cx,         y,     LEAF_MID);
  px(g, cx + d,     y - 1, LEAF_LT);
  px(g, cx + d * 2, y - 2, LEAF_MID);
  px(g, cx + d * 3, y - 3, LEAF_DK);
  px(g, cx + d,     y,     LEAF_DK);
  px(g, cx + d * 2, y - 1, LEAF_MID);
}

/* ─── Flowers ─────────────────────────────────────────────── */
function drawTulipBud(g: Grid, cx: number, cy: number) {
  // Teardrop bud shape
  px(g, cx, cy,     TULIP_PINK);
  px(g, cx - 1, cy + 1, TULIP_GREEN);
  px(g, cx,     cy + 1, TULIP_PINK);
  px(g, cx + 1, cy + 1, TULIP_GREEN);
  px(g, cx - 1, cy + 2, TULIP_GREEN);
  px(g, cx,     cy + 2, TULIP_DK);
  px(g, cx + 1, cy + 2, TULIP_GREEN);
  px(g, cx,     cy + 3, STEM_LT);
}

function drawRose(g: Grid, cx: number, cy: number) {
  // Open rose, ~7×6 bloom
  // Outer petals
  const outer: [number, number][] = [
    [cx, cy - 3],
    [cx - 2, cy - 2], [cx + 2, cy - 2],
    [cx - 3, cy - 1], [cx + 3, cy - 1],
    [cx - 3, cy],     [cx + 3, cy],
    [cx - 2, cy + 1], [cx + 2, cy + 1],
    [cx - 1, cy + 2], [cx, cy + 2], [cx + 1, cy + 2],
  ];
  for (const [ox, oy] of outer) px(g, ox, oy, bayer(ox,oy)<0.55 ? ROSE_MID : ROSE_DK);
  // Inner petals
  dith(g, cx - 1, cy - 2, cx + 1, cy + 1, ROSE_LT, ROSE_MID, 0.5);
  // Center
  dith(g, cx - 1, cy - 1, cx + 1, cy, ROSE_MID, ROSE_CENTER, 0.45);
  px(g, cx, cy - 1, ROSE_CENTER);
  // Highlights
  px(g, cx - 1, cy - 2, ROSE_LT);
  px(g, cx - 2, cy - 2, ROSE_MID);
}

function drawSunflower(g: Grid, cx: number, cy: number) {
  // Petals (8-directional)
  const petals: [number, number][] = [
    [cx, cy - 3], [cx, cy - 4],          // top
    [cx, cy + 3], [cx, cy + 4],          // bottom
    [cx - 3, cy], [cx - 4, cy],          // left
    [cx + 3, cy], [cx + 4, cy],          // right
    [cx - 2, cy - 2], [cx - 3, cy - 3], // diagonals
    [cx + 2, cy - 2], [cx + 3, cy - 3],
    [cx - 2, cy + 2], [cx - 3, cy + 3],
    [cx + 2, cy + 2], [cx + 3, cy + 3],
  ];
  for (const [px_, py] of petals) px(g, px_, py, bayer(px_,py)<0.6 ? SUN_LT : SUN_MID);
  // Mid ring
  dith(g, cx - 2, cy - 1, cx + 2, cy + 1, SUN_MID, SUN_DK, 0.5);
  dith(g, cx - 1, cy - 2, cx + 1, cy + 2, SUN_MID, SUN_DK, 0.5);
  // Center
  dith(g, cx - 1, cy - 1, cx + 1, cy + 1, SUN_CENTER, SUN_CTR_LT, 0.5);
  px(g, cx, cy, SUN_CENTER);
}

function drawBlueWildflower(g: Grid, cx: number, cy: number) {
  // 5-petal small wildflower
  px(g, cx,     cy - 2, bayer(cx,cy-2)<0.55 ? BLUE_LT : BLUE_MID);
  px(g, cx - 2, cy - 1, bayer(cx-2,cy-1)<0.55 ? BLUE_LT : BLUE_MID);
  px(g, cx + 2, cy - 1, bayer(cx+2,cy-1)<0.55 ? BLUE_MID : BLUE_DK);
  px(g, cx - 2, cy + 1, BLUE_MID);
  px(g, cx + 2, cy + 1, BLUE_DK);
  px(g, cx,     cy + 2, BLUE_MID);
  // Center
  px(g, cx - 1, cy, SPARKLE); px(g, cx, cy, SPARKLE); px(g, cx + 1, cy, SPARKLE);
  px(g, cx, cy - 1, SPARKLE); px(g, cx, cy + 1, SPARKLE);
}

function drawSparkles(g: Grid) {
  // SDV-style sparkle stars: ×
  const spots: [number, number][] = [[8,6],[24,5],[4,14],[28,12],[16,4]];
  for (const [sx, sy] of spots) {
    px(g, sx, sy, SPARKLE);
    px(g, sx - 1, sy - 1, SPARKLE);
    px(g, sx + 1, sy - 1, SPARKLE);
    px(g, sx - 1, sy + 1, SPARKLE);
    px(g, sx + 1, sy + 1, SPARKLE);
  }
}

/* ─── Scene composer ─────────────────────────────────────── */
function buildScene(stage: number): Grid {
  const g = make();
  drawVase(g);

  if (stage === 0) return g;

  // Stage 1: center stem
  drawStem(g, 15, 19);
  if (stage === 1) return g;

  // Stage 2: center stem + tulip bud
  drawTulipBud(g, 16, 15);
  if (stage === 2) return g;

  // Stage 3: open rose on center, add left stem
  drawRose(g, 16, 13);
  drawStem(g, 10, 21);
  drawLeaf(g, 10, 25, true);
  if (stage === 3) return g;

  // Stage 4: add right stem with sunflower, left gets bud
  drawTulipBud(g, 11, 17);
  drawStem(g, 21, 20);
  drawSunflower(g, 22, 15);
  drawLeaf(g, 22, 24, false);
  if (stage === 4) return g;

  // Stage 5: full bloom — blue wildflower on left, extra leaves, sparkles
  drawRose(g, 16, 11);         // taller rose
  drawBlueWildflower(g, 11, 13);
  drawLeaf(g, 16, 22, true);
  drawLeaf(g, 14, 24, false);
  drawSparkles(g);

  return g;
}

/* ─── Component ───────────────────────────────────────────── */
type PixelFlowerProps = {
  sessionCount: number;
  size?: number;   // desired rendered width in dp
};

export function PixelFlower({ sessionCount, size }: PixelFlowerProps) {
  const stage  = Math.min(sessionCount, 5);
  const grid   = buildScene(stage);
  const scale  = size ? size / (W * PIXEL) : 1;
  const svgW   = W * PIXEL;
  const svgH   = H * PIXEL;

  const rects: { x: number; y: number; fill: string }[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fill = grid[y]![x];
      if (fill) rects.push({ x: x * PIXEL, y: y * PIXEL, fill });
    }
  }

  return (
    <View style={[styles.wrapper, { width: svgW * scale, height: svgH * scale }]}>
      <Svg
        width={svgW}
        height={svgH}
        style={{ transform: [{ scale }], transformOrigin: "top left" } as object}
      >
        {rects.map((r, i) => (
          <Rect key={i} x={r.x} y={r.y} width={PIXEL} height={PIXEL} fill={r.fill} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
});
