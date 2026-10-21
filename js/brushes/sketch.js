// =====================================================================
// Sketch — fine pencil lines that connect to nearby earlier lines,
// building up web-like shading (inspired by the "Harmony" drawing app)
// =====================================================================
import { ctx } from '../canvas.js';
import { SCALE } from '../config.js';
import { state } from '../state.js';
import { mix, rgbaStr } from '../utils.js';

const MAX_POINTS = 800; // how many recent points new lines can connect to

export default {
  id: 'sketch',
  label: 'Sketch',
  short: 'Sketch',
  hint: 'Fine pencil webs',
  medium: 'graphite',

  setup(s, base) {
    s.rgb = mix(base, [0, 0, 0], 0.15);
  },

  paint(s) {
    // the main pencil line
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgbaStr(s.rgb, 0.55);
    ctx.beginPath();
    ctx.moveTo(s.px, s.py);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    // faint lines to nearby earlier points
    const reach = 70 * SCALE * state.brushSize;
    const maxD = reach * reach;
    ctx.strokeStyle = rgbaStr(s.rgb, 0.12);
    ctx.beginPath();
    for (const p of state.sketchPoints) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const d = dx * dx + dy * dy;
      if (d < maxD && Math.random() > d / maxD + 0.35) {
        ctx.moveTo(s.x + dx * 0.25, s.y + dy * 0.25);
        ctx.lineTo(p.x - dx * 0.25, p.y - dy * 0.25);
      }
    }
    ctx.stroke();

    state.sketchPoints.push({ x: s.x, y: s.y });
    if (state.sketchPoints.length > MAX_POINTS) state.sketchPoints.shift();
  }
};