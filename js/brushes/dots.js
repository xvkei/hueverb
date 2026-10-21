// =====================================================================
// Dots — pointillism: strokes built from clusters of colored dots
// =====================================================================
import { ctx } from '../canvas.js';
import { SCALE } from '../config.js';
import { state, pickColor } from '../state.js';
import { rgbStr, varyColor } from '../utils.js';

export default {
  id: 'dots',
  label: 'Dots',
  short: 'Dots',
  hint: 'Pointillism: strokes made of dots',
  medium: 'pigment dots',
  splatter: 0,

  setup(s, base, f) {
    s.dotColors = [varyColor(base, 0.3), varyColor(base, 0.3), rgbStr(pickColor(f.pitch))];
  },

  paint(s) {
    const dots = Math.floor(2 + s.width * 0.2);
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < dots; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = (Math.random() + Math.random() - 1) * s.width * 0.9; // denser in the middle
      const r = (0.7 + Math.random() * 1.8) * SCALE * state.brushSize;
      ctx.fillStyle = s.dotColors[Math.floor(Math.random() * s.dotColors.length)];
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};