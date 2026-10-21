// =====================================================================
// config.js — settings and fixed data (canvas sizes, palettes)
// =====================================================================
import { hexToRgb } from './utils.js';

// ---------- Settings you can tweak ----------
export const PAPER = '#f3eee4';        // canvas background color
export const SENSITIVITY = 1.6;        // lower = more strokes, higher = fewer (try 1.3–2.2)
export const MIN_GAP_MS = 120;         // minimum time between new strokes
export const MAX_STROKE_FRAMES = 240;  // longest a single stroke can flow (~4 seconds)
export const PITCH_BANDS = 24;         // musical (log-spaced) bands used to measure pitch
export const GRID = 12;                // crowd map used to spread strokes across the canvas
export const MAX_WORKS = 40;           // collection limit, so the browser never runs out of space

// Brush sizes were designed on a 600px canvas; drawing now uses 1000 units on the shorter side
export const SCALE = 1000 / 600;

// ---------- Canvas shapes ----------
export const SIZES = [
  { id: 'square',    name: 'Square',    ratio: '1:1',  w: 1600, h: 1600 },
  { id: 'portrait',  name: 'Portrait',  ratio: '4:5',  w: 1600, h: 2000 },
  { id: 'story',     name: 'Story',     ratio: '9:16', w: 1350, h: 2400 },
  { id: 'landscape', name: 'Landscape', ratio: '3:2',  w: 2400, h: 1600 },
  { id: 'wide',      name: 'Wide',      ratio: '16:9', w: 2400, h: 1350 }
];

// ---------- Palettes ----------
// Deep colors first (low sounds), bright last (high sounds)
const PALETTE_DATA = [
  { name: 'Kandinsky', colors: ['#1d3557', '#111111', '#e63946', '#2a9d8f', '#f1c453'] },
  { name: 'Monet',     colors: ['#2d4a7a', '#5b8bb5', '#7fa886', '#d98c7a', '#e8c27a'] },
  { name: 'Matisse',   colors: ['#0b3d91', '#ef476f', '#ff6f3c', '#06a77d', '#ffd166'] },
  { name: 'Ukiyo-e',   colors: ['#1b2a49', '#2f5d7c', '#6b8f9c', '#b5442c', '#d9a441'] },
  { name: 'Sunset',    colors: ['#3d1e6d', '#8b3fa8', '#e8577e', '#f99e4c', '#f9c74f'] },
  { name: 'Van Gogh',  colors: ['#0e1f4d', '#1f4e8c', '#3f7cac', '#e9c46a', '#f4e285'] },
  { name: 'Klimt',     colors: ['#2b1d0e', '#6b4a1b', '#3b6e5a', '#b8862b', '#e0bf5a'] },
  { name: 'Rothko',    colors: ['#3b0d11', '#7a1c1c', '#a8322d', '#d9622b', '#f0a35e'] },
  { name: 'Kahlo',     colors: ['#1b4332', '#2d6a4f', '#d62828', '#f77f00', '#fcbf49'] },
  { name: 'Mondrian',  colors: ['#111111', '#1d3d8f', '#c8102e', '#7a7a7a', '#f5c800'] },
  { name: 'Hockney',   colors: ['#0a3d62', '#1e88b8', '#6ec6e8', '#e76f51', '#f4a261'] },
  { name: 'Sumi',      colors: ['#111111', '#3a3a3a', '#6b6b6b', '#9a9a9a', '#b3261e'] }
];

// Each palette also gets its colors as [r, g, b] arrays, used for mixing
export const PALETTES = PALETTE_DATA.map(p => ({ ...p, rgb: p.colors.map(hexToRgb) }));