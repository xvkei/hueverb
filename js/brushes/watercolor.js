// =====================================================================
// Watercolor — soft, see-through washes that deepen where they overlap
// =====================================================================
import { ctx } from '../canvas.js';
import { SCALE } from '../config.js';
import { state } from '../state.js';
import { rgbStr } from '../utils.js';

export default {
  id: 'watercolor',
  label: 'Watercolor',
  short: 'Wash',
  hint: 'Soft, see-through washes',
  medium: 'watercolor',

  setup(s, base) {
    s.color = rgbStr(base);
    s.wet = 1;
  },

  // instead of splatter, a new sound makes a soft bloom of water and pigment
  start(s, f) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = s.color;
    const r = (10 + f.loud * 30) * SCALE * state.brushSize;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(s.x + (Math.random() - 0.5) * r * 0.5, s.y + (Math.random() - 0.5) * r * 0.5,
              r * (0.6 + Math.random() * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  paint(s) {
    s.wet = Math.max(0.35, s.wet - 0.004); // the brush slowly runs out of water
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; // overlapping washes get deeper, like real paint
    ctx.fillStyle = s.color;
    for (let i = 0; i < 3; i++) {
      const r = s.width * (0.45 + Math.random() * 0.5);
      const ox = (Math.random() - 0.5) * s.width * 0.7;
      const oy = (Math.random() - 0.5) * s.width * 0.7;
      ctx.globalAlpha = 0.04 * s.wet;
      ctx.beginPath();
      ctx.arc(s.x + ox, s.y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // occasional darker edge, like pigment pooling where the water dries
    if (Math.random() < 0.15) {
      const start = Math.random() * Math.PI * 2;
      ctx.globalAlpha = 0.1 * s.wet;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.width * (0.6 + Math.random() * 0.3), start, start + Math.PI / 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};