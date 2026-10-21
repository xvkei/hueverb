// =====================================================================
// canvas.js — the painting surface: setup, fitting to the screen, crowd map
// =====================================================================
import { $, clamp, isMobileLayout } from './utils.js';
import { PAPER, GRID } from './config.js';
import { state, currentSize } from './state.js';

export const canvas = $('canvas');
export const ctx = canvas.getContext('2d');

const studioView = $('studio');
const artworkEl = $('artwork');
const frameWrap = $('frameWrap');
const frameEl = $('frame');
const matEl = $('mat');

// How crowded each area of the canvas is, so new strokes can find empty space
const density = new Float32Array(GRID * GRID);

// Sizes the canvas for the chosen shape. Drawing always uses 1000 units on the
// shorter side, so brushes look the same on every shape.
export function setupCanvas() {
  const s = currentSize();
  const short = Math.min(s.w, s.h);
  state.W = (1000 * s.w) / short;
  state.H = (1000 * s.h) / short;
  canvas.width = s.w;
  canvas.height = s.h;
  canvas.style.aspectRatio = `${s.w} / ${s.h}`;
  ctx.setTransform(short / 1000, 0, 0, short / 1000, 0, 0);
  resetCanvas();
  fitFrame();
}

// Fresh paper and a clean slate for the painting
export function resetCanvas() {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, state.W, state.H);
  addPaperGrain();
  density.fill(0);
  state.strokes = [];
  state.liveStroke = null;
  state.drips = [];
  state.sketchPoints = [];
  state.strokeCount = 0;
  state.brushesUsed.clear();
  state.voiceUsed = !!state.micStream;
  state.paintSeconds = 0;
  state.dirty = false;
}

// Tiny light and dark specks so the canvas feels like real paper
function addPaperGrain() {
  const { W, H } = state;
  const specks = Math.floor((W * H) / 40);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
}

// Make the frame as large as possible without overflowing the column or the screen height
export function fitFrame() {
  if (!studioView.classList.contains('active')) return;
  const s = currentSize();
  const ratio = s.w / s.h;
  const extra =
    2 * (parseFloat(getComputedStyle(frameEl).paddingLeft) + parseFloat(getComputedStyle(matEl).paddingLeft));
  const availW = artworkEl.clientWidth;
  const availH = Math.max(260, window.innerHeight - (isMobileLayout() ? 250 : 170));

  let cw = availW - extra;
  let ch = cw / ratio;
  if (ch > availH - extra) {
    ch = availH - extra;
    cw = ch * ratio;
  }
  frameWrap.style.width = Math.max(120, Math.round(cw + extra)) + 'px';
}

export function initCanvas() {
  window.addEventListener('resize', fitFrame);
  if ('ResizeObserver' in window) new ResizeObserver(() => fitFrame()).observe(artworkEl);
}

// ---------- Crowd map ----------
function cellIndex(x, y) {
  const cx = clamp(Math.floor((x / state.W) * GRID), 0, GRID - 1);
  const cy = clamp(Math.floor((y / state.H) * GRID), 0, GRID - 1);
  return cy * GRID + cx;
}

export function addDensity(x, y, amount) {
  density[cellIndex(x, y)] += amount;
}

// Try a few spots near the pitch's height and pick the least crowded one
export function pickSpot(pitch) {
  const { W, H } = state;
  const margin = Math.min(W, H) * 0.1;
  const targetY = H * (0.88 - pitch * 0.76); // high sounds near the top, low near the bottom
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < 8; i++) {
    const x = margin + Math.random() * (W - margin * 2);
    const y = clamp(targetY + (Math.random() - 0.5) * H * 0.35, margin, H - margin);
    const score = density[cellIndex(x, y)] + (Math.abs(y - targetY) / H) * 2 + Math.random() * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}