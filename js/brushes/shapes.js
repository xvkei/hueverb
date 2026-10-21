// =====================================================================
// Shapes — Kandinsky-style geometry scattered along a thin line
// =====================================================================
import { ctx } from '../canvas.js';
import { SCALE } from '../config.js';
import { pickColor, currentPalette } from '../state.js';
import { mix, rgbStr } from '../utils.js';

export default {
  id: 'shapes',
  label: 'Shapes',
  short: 'Shapes',
  hint: 'Kandinsky-style geometry',
  medium: 'geometric forms',

  setup(s) {
    s.nextShape = 0;
    s.lineColor = rgbStr(mix(currentPalette().rgb[0], [0, 0, 0], 0.3));
  },

  paint(s) {
    // thin connecting line, like Kandinsky's linework
    ctx.strokeStyle = s.lineColor;
    ctx.lineWidth = Math.max(0.6, s.width * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.px, s.py);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    if (s.age < s.nextShape) return;
    s.nextShape = s.age + 10 + Math.floor(Math.random() * 18);

    const r = Math.max(4 * SCALE, s.width * (0.35 + Math.random() * 0.7));
    const type = Math.floor(Math.random() * 5);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = rgbStr(pickColor(Math.random()));
    ctx.strokeStyle = s.lineColor;
    ctx.lineWidth = Math.max(1, r * 0.08);

    if (type === 0) {
      // solid circle
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      // concentric circles
      for (let k = 3; k >= 1; k--) {
        ctx.fillStyle = rgbStr(pickColor(Math.random()));
        ctx.beginPath();
        ctx.arc(0, 0, (r * k) / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 2) {
      // triangle
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.87, r * 0.5);
      ctx.lineTo(-r * 0.87, r * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (type === 3) {
      // ring
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = r * 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // square with an outline
      ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    }
    ctx.restore();
  }
};