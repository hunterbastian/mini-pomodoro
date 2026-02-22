"use client";

/* ─────────────────────────────────────────────────────────
 * DitherArt — Ambient Outpost landscape banner (canvas)
 *
 * Scene: Dark sky, sparse stars, faint amber horizon glow,
 *        mesa ridgeline, radio tower, outpost building,
 *        antenna dish, power lines, desert floor.
 *
 * Canvas: 80 x 26 pixel-art grid, PIXEL = 4
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";

const PIXEL = 4;
const W = 80;
const H = 26;

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
function bayer(col: number, row: number): number {
  return BAYER4[row & 3]![col & 3]! / 16;
}

const SKY_DEEP = "#060810";
const SKY_MID = "#0a0e18";
const SKY_LOW = "#10141e";
const HORIZON_DIM = "#1a1510";
const HORIZON_GLO = "#2a1e14";
const HORIZON_AMB = "#3a2a1a";
const STAR_DIM = "#3a3830";
const STAR_BRT = "#7a6e58";
const MESA_FAR = "#12151c";
const MESA_NEAR = "#0e1218";
const GROUND_A = "#0c0f14";
const GROUND_B = "#080a0d";
const ROCK_A = "#1a1e28";
const ROCK_B = "#141820";
const WALL_MAIN = "#181c24";
const WALL_DARK = "#10141a";
const WALL_LIT = "#1e222c";
const ROOF_MAIN = "#14181e";
const ROOF_EDGE = "#0e1016";
const SIGNAL_AMB = "#c8935a";
const SIGNAL_DIM = "#9a6d3a";
const WINDOW_GLO = "#e8b06a";
const WINDOW_DIM = "#a07840";
const TOWER_METAL = "#1e222a";
const TOWER_DARK = "#141820";
const DISH_LT = "#22262e";
const DISH_DK = "#181c24";
const WIRE_COL = "#1a1e24";

type Color = string | null;
type Grid = Color[][];

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
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) p(g, x, y, bayer(x, y) < thresh ? ca : cb);
}

function buildScene(): Grid {
  const g = make();

  // Sky gradient
  for (let y = 0; y < 16; y++) {
    const frac = y / 15;
    for (let x = 0; x < W; x++) {
      const t = bayer(x, y);
      if (frac < 0.35) p(g, x, y, SKY_DEEP);
      else if (frac < 0.65) p(g, x, y, t < frac ? SKY_MID : SKY_DEEP);
      else p(g, x, y, t < 0.5 ? SKY_LOW : SKY_MID);
    }
  }

  // Horizon glow
  for (let x = 0; x < W; x++) {
    p(g, x, 16, bayer(x, 16) < 0.6 ? HORIZON_DIM : SKY_LOW);
    p(g, x, 17, bayer(x, 17) < 0.5 ? HORIZON_GLO : HORIZON_DIM);
    p(g, x, 18, bayer(x, 18) < 0.4 ? HORIZON_AMB : HORIZON_GLO);
  }

  // Stars
  const stars: [number, number][] = [
    [5, 2], [14, 4], [22, 1], [31, 6], [38, 3],
    [47, 5], [55, 2], [63, 7], [72, 4], [78, 1],
    [10, 9], [26, 8], [42, 10], [58, 11], [69, 9],
    [18, 13], [50, 12], [75, 13],
  ];
  for (const [sx, sy] of stars) {
    p(g, sx, sy, bayer(sx, sy) < 0.35 ? STAR_BRT : STAR_DIM);
  }

  // Far mesa
  for (let x = 0; x < W; x++) {
    const h = Math.round(1.5 * Math.sin(x * 0.08 + 1.2) + 0.6 * Math.sin(x * 0.19 + 0.4));
    for (let y = 17 - Math.max(0, h); y <= 18; y++) p(g, x, y, MESA_FAR);
  }

  // Near ridge
  for (let x = 0; x < W; x++) {
    const h = Math.round(1.2 * Math.sin(x * 0.12 + 2.8) + 0.5 * Math.sin(x * 0.22));
    for (let y = 19 - Math.max(0, h); y <= 19; y++) p(g, x, y, MESA_NEAR);
  }

  // Ground
  dith(g, 0, 19, W - 1, 20, GROUND_A, GROUND_B, 0.55);
  fill(g, 0, 21, W - 1, 25, GROUND_B);
  dith(g, 0, 21, W - 1, 22, GROUND_A, GROUND_B, 0.4);

  // Rocks
  for (const [rx, ry] of [[6, 22], [19, 23], [34, 21], [52, 22], [66, 23], [74, 21]] as [number, number][]) {
    p(g, rx, ry, ROCK_A);
    p(g, rx + 1, ry, ROCK_B);
    p(g, rx, ry + 1, ROCK_B);
  }

  // Radio tower
  vline(g, 6, 8, 20, TOWER_METAL);
  vline(g, 7, 10, 20, TOWER_DARK);
  hline(g, 4, 9, 12, TOWER_DARK);
  hline(g, 5, 8, 16, TOWER_DARK);
  p(g, 5, 10, TOWER_DARK); p(g, 8, 10, TOWER_DARK);
  p(g, 5, 14, TOWER_DARK); p(g, 8, 14, TOWER_DARK);
  p(g, 6, 7, SIGNAL_AMB);
  p(g, 6, 6, SIGNAL_DIM);
  p(g, 5, 7, HORIZON_GLO); p(g, 7, 7, HORIZON_GLO);

  // Outpost building
  fill(g, 28, 16, 52, 24, WALL_MAIN);
  hline(g, 27, 53, 15, ROOF_EDGE);
  hline(g, 28, 52, 16, ROOF_MAIN);
  for (let y = 17; y <= 24; y++)
    for (let x = 28; x <= 52; x++) {
      const edge = x <= 29 || x >= 51;
      p(g, x, y, edge ? WALL_DARK : bayer(x, y) < 0.45 ? WALL_LIT : WALL_MAIN);
    }

  // Windows
  for (let wy = 18; wy <= 20; wy++) {
    for (let wx = 31; wx <= 33; wx++) p(g, wx, wy, bayer(wx, wy) < 0.6 ? WINDOW_GLO : WINDOW_DIM);
    for (let wx = 37; wx <= 39; wx++) p(g, wx, wy, bayer(wx, wy) < 0.55 ? WINDOW_GLO : WINDOW_DIM);
    for (let wx = 44; wx <= 46; wx++) p(g, wx, wy, bayer(wx, wy) < 0.5 ? WINDOW_DIM : WALL_LIT);
  }
  fill(g, 48, 21, 50, 24, WALL_DARK);
  p(g, 49, 21, SIGNAL_DIM);

  // Antenna dish
  const dish: [number, number][] = [
    [63, 10], [64, 10], [65, 10],
    [62, 11], [63, 11], [64, 11], [65, 11], [66, 11],
    [61, 12], [62, 12], [63, 12], [64, 12], [65, 12], [66, 12], [67, 12],
    [61, 13], [62, 13], [67, 13],
    [62, 14], [66, 14],
  ];
  for (const [dx, dy] of dish) p(g, dx, dy, bayer(dx, dy) < 0.5 ? DISH_LT : DISH_DK);
  vline(g, 64, 14, 22, TOWER_METAL);
  vline(g, 65, 16, 22, TOWER_DARK);
  hline(g, 63, 66, 22, TOWER_DARK);

  // Power lines
  vline(g, 73, 12, 22, WIRE_COL);
  vline(g, 78, 14, 22, WIRE_COL);
  hline(g, 73, 78, 13, WIRE_COL);
  p(g, 75, 14, WIRE_COL); p(g, 76, 14, WIRE_COL);
  p(g, 73, 11, SIGNAL_DIM);

  // Window light spill
  for (let x = 30; x <= 34; x++) p(g, x, 21, bayer(x, 21) < 0.3 ? HORIZON_GLO : GROUND_A);
  for (let x = 36; x <= 40; x++) p(g, x, 21, bayer(x, 21) < 0.25 ? HORIZON_DIM : GROUND_A);

  return g;
}

export function DitherArt({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grid = buildScene();
    canvas.width = W * PIXEL;
    canvas.height = H * PIXEL;

    // Base fill
    ctx.fillStyle = SKY_DEEP;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = grid[y]![x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
        }
      }
    }

    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < H; i++) {
      ctx.fillRect(0, i * PIXEL + PIXEL - 1, canvas.width, 1);
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "auto", imageRendering: "pixelated" }}
    />
  );
}
