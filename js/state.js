// =====================================================================
// state.js — shared data that several modules read or change
// =====================================================================
import { SIZES, PALETTES } from './config.js';
import { clamp } from './utils.js';

export const state = {
  // sound
  audioCtx: null,
  analyser: null,
  trackEl: null,
  trackSource: null,
  trackTitle: null,
  trackEnded: false,
  micStream: null,
  micSource: null,
  voiceUsed: false,
  sensitivity: 0.5, // 0 = calm (fewer strokes), 1 = lively (more strokes)

  // canvas shape (W and H are drawing units; the shorter side is always 1000)
  sizeId: 'square',
  W: 1000,
  H: 1000,

  // the painting in progress
  strokes: [],
  liveStroke: null,
  strokeCount: 0,
  drips: [],
  sketchPoints: [],
  brushesUsed: new Set(),
  paintSeconds: 0,
  dirty: false,      // true when the painting has unsaved strokes
  customTitle: null, // set when the visitor renames the painting

  // tools
  brush: 'auto',
  prevBrush: 'auto',
  paletteIndex: 0,
  prevPalette: 0,
  brushSize: 1
};

// ---------- Handy questions about the state ----------
export const currentSize = () => SIZES.find(s => s.id === state.sizeId);
export const currentPalette = () => PALETTES[state.paletteIndex];
export const isTrackPlaying = () => !!state.trackEl && !state.trackEl.paused;
export const isPainting = () => !!state.micStream || isTrackPlaying();

// The title Hueverb would choose on its own
export function autoTitle() {
  if (state.trackTitle) return state.trackTitle;
  return state.voiceUsed ? 'Untitled (live study)' : 'Untitled';
}

// The title shown on the placard: the visitor's name if they gave one
export function pieceTitle() {
  return state.customTitle || autoTitle();
}

// Pick a palette color based on pitch, with some randomness for variety
export function pickColor(pitch) {
  const p = currentPalette().rgb;
  const idx = clamp(Math.round(pitch * (p.length - 1) + (Math.random() - 0.5) * 1.5), 0, p.length - 1);
  return p[idx];
}