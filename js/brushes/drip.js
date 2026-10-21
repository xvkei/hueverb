// =====================================================================
// Drip — flung paint with drips that run down the canvas, after Pollock
// =====================================================================
import { ctx } from '../canvas.js';
import { SCALE } from '../config.js';
import { state } from '../state.js';
import { rgbStr } from '../utils.js';

export default {
  id: 'drip',
  label: 'Drip',
  short: 'Drip',
  hint: 'Flung paint and drips, after Pollock',
  medium: 'poured paint',
  splatter: 8, // extra splatter drops when a sound starts

  setup(s, base) {
    s.color = rgbStr(base);
  },

  // poured lines wander more than other brushes
  steer(s) {
    s.angle += s.turn + (Math.random() - 0.5) * s.roughness * 0.5 + (Math.random() - 0.5) * 0.25;
  },

  paint(s) {
    // a poured line that keeps changing thickness
    ctx.strokeStyle = s.color;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.8, s.width * (0.08 + Math.random() * 0.3));
    ctx.beginPath();
    ctx.moveTo(s.px, s.py);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    // flung droplets
    if (Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2;
      const d = s.width * (0.5 + Math.random() * 1.8);
      const r = (0.8 + Math.random() * 2.5) * SCALE * state.brushSize * 0.6;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // start a drip that will run down the canvas
    if (Math.random() < 0.04 && state.drips.length < 60) {
      state.drips.push({
        x: s.x,
        y: s.y,
        w: Math.max(1, s.width * 0.08 * (0.5 + Math.random())),
        left: (20 + Math.random() * 80) * SCALE,
        color: s.color
      });
    }
  },

  // drips keep running even after the stroke ends
  everyFrame() {
    if (!state.drips.length) return;
    ctx.lineCap = 'round';
    for (const d of state.drips) {
      const len = 1 + Math.random() * 1.5;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.w;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      d.y += len;
      d.x += (Math.random() - 0.5) * 0.3;
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      d.left -= len;
      d.w *= 0.995;
      // a little bead of paint where the drip stops
      if (d.left <= 0) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.w * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    state.drips = state.drips.filter(d => d.left > 0 && d.y < state.H);
  }
};