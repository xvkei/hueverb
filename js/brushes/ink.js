// =====================================================================
// Ink — a calligraphy nib held at a fixed slant, thick or thin by direction
// =====================================================================
import { ctx } from '../canvas.js';
import { mix, rgbStr } from '../utils.js';

const NIB_ANGLE = -Math.PI / 4;

export default {
  id: 'ink',
  label: 'Ink',
  short: 'Ink',
  hint: 'Calligraphy pen, thick and thin',
  medium: 'ink',
  splatter: 0,

  setup(s, base) {
    s.color = rgbStr(mix(base, [0, 0, 0], 0.25));
    s.hx = 0;
    s.hy = 0;
  },

  paint(s) {
    const hw = s.width * 0.35;
    const hx = Math.cos(NIB_ANGLE) * hw;
    const hy = Math.sin(NIB_ANGLE) * hw;

    // fill the band between the nib's previous and current position
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 0.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.px + s.hx, s.py + s.hy);
    ctx.lineTo(s.x + hx, s.y + hy);
    ctx.lineTo(s.x - hx, s.y - hy);
    ctx.lineTo(s.px - s.hx, s.py - s.hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    s.hx = hx;
    s.hy = hy;
  }
};