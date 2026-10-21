// =====================================================================
// strokes.js — starting strokes, moving the brush, and Auto mode
// =====================================================================
import { ctx, pickSpot, addDensity } from './canvas.js';
import { MAX_STROKE_FRAMES, SCALE } from './config.js';
import { state, pickColor } from './state.js';
import { clamp, varyColor } from './utils.js';
import { BRUSH_MAP } from './brushes/index.js';

// In Auto mode, the character of the sound picks the brush
function chooseBrush(f) {
  if (state.brush !== 'auto') return state.brush;
  if (f.roughness > 0.55) return f.loud > 0.7 ? 'drip' : 'dots'; // noisy: drips or dots
  if (f.punch > 3 && f.loud > 0.6) return 'shapes';                // big sudden hits
  if (f.pitch > 0.75) return 'sketch';                             // very high: fine pencil
  if (f.pitch > 0.55) return 'ink';                                // high: ink lines
  if (f.pitch < 0.2 && f.loud > 0.6) return 'knife';               // loud bass: knife drags
  if (f.pitch < 0.3) return 'charcoal';                            // low: charcoal
  if (f.loud < 0.45) return 'watercolor';                          // soft: washes
  return 'oil';                                                    // everything else: oil
}

function createStroke(f) {
  const brush = BRUSH_MAP[chooseBrush(f)];
  const { x, y } = pickSpot(f.pitch);
  const base = pickColor(f.pitch);

  const s = {
    x, y, px: x, py: y,
    brush: brush.id,
    base,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.06,
    roughness: f.roughness,
    width: 0,
    age: 0,
    fade: -1,    // -1 = alive; otherwise counts down to 0
    lift: false  // a brush can set this to end its stroke early
  };
  if (brush.setup) brush.setup(s, base, f);
  return s;
}

export function endStroke(s) {
  if (s && s.fade < 0) s.fade = 12; // lift the brush gradually
}

// What happens the instant a sound starts
function startMark(s, f) {
  const brush = BRUSH_MAP[s.brush];
  if (brush.start) {
    brush.start(s, f);
    return;
  }
  if (brush.splatter === undefined) return; // dry brushes don't splatter

  const drops = Math.floor(f.loud * 4 + f.roughness * 10 + brush.splatter);
  for (let i = 0; i < drops; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() ** 2 * (15 + f.loud * 45) * SCALE * state.brushSize;
    const r = (0.6 + Math.random() * (0.8 + f.loud * 2.5)) * SCALE * state.brushSize;
    ctx.fillStyle = varyColor(s.base, 0.3);
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Move the brush one step and paint it. Returns false when the stroke is finished.
function stepStroke(s, f, isLive) {
  const brush = BRUSH_MAP[s.brush];
  const { W, H } = state;
  s.age++;

  // width follows loudness (and the size slider) while the sound lasts, then tapers off
  if (s.fade >= 0) {
    s.width *= 0.85;
    if (s.fade > 0) s.fade--;
  } else {
    const target = (4 + f.loud * 30) * SCALE * state.brushSize * Math.min(1, s.age / 5);
    s.width += (target - s.width) * 0.25;
  }

  // smooth, gestural curves (some brushes steer their own way)
  s.turn = clamp(s.turn + (Math.random() - 0.5) * 0.006, -0.05, 0.05);
  if (brush.steer) brush.steer(s);
  else s.angle += s.turn + (Math.random() - 0.5) * s.roughness * 0.5;

  // steer back toward the middle near the edges
  const margin = Math.min(W, H) * 0.08;
  if (s.x < margin || s.x > W - margin || s.y < margin || s.y > H - margin) {
    const toCenter = Math.atan2(H / 2 - s.y, W / 2 - s.x);
    const diff = Math.atan2(Math.sin(toCenter - s.angle), Math.cos(toCenter - s.angle));
    s.angle += diff * 0.12;
  }

  s.px = s.x;
  s.py = s.y;
  const speed = (1.5 + (isLive ? f.loud : 0.3) * 5) * SCALE;
  s.x += Math.cos(s.angle) * speed;
  s.y += Math.sin(s.angle) * speed;

  brush.paint(s);
  if (s.lift) endStroke(s);
  addDensity(s.x, s.y, s.width * 0.004);

  if (s.age > MAX_STROKE_FRAMES) endStroke(s);
  return s.fade !== 0;
}

// Called every frame with the latest sound. Returns true when a new stroke started.
export function updateStrokes(f) {
  let started = false;

  if (f.onset) {
    endStroke(state.liveStroke);
    const s = createStroke(f);
    state.liveStroke = s;
    state.strokes.push(s);
    startMark(s, f);
    state.strokeCount++;
    state.brushesUsed.add(s.brush);
    state.dirty = true;
    started = true;
  } else if (state.liveStroke && f.rms < f.gate * 0.8) {
    endStroke(state.liveStroke); // sound stopped or paused, so lift the brush
    state.liveStroke = null;
  }

  state.strokes = state.strokes.filter(s => stepStroke(s, f, s === state.liveStroke));
  if (state.liveStroke && state.liveStroke.fade >= 0) state.liveStroke = null;
  return started;
}