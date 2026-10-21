// =====================================================================
// Knife — wide, flat drags of color with streaks, like a palette knife
// =====================================================================
import { ctx } from '../canvas.js';
import { varyColor, rgbStr } from '../utils.js';

export default {
  id: 'knife',
  label: 'Knife',
  short: 'Knife',
  hint: 'Flat palette-knife drags',
  medium: 'knifed paint',

  setup(s, base, f) {
    s.color = rgbStr(base);
    s.paint = 0.7 + f.loud * 0.3;
    s.kl = null; // previous left edge
    s.kr = null; // previous right edge
    s.streaks = Array.from({ length: 5 }, () => ({
      o: (Math.random() - 0.5) * 1.8,
      c: varyColor(base, 0.5),
      w: 0.5 + Math.random() * 1.2
    }));
  },

  // knives drag in straighter lines
  steer(s) {
    s.angle += s.turn * 0.3;
  },

  paint(s) {
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    const hw = s.width * 0.75;
    const L = [s.x + nx * hw, s.y + ny * hw];
    const R = [s.x - nx * hw, s.y - ny * hw];

    if (s.kl) {
      s.paint -= 0.004 + Math.random() * 0.004;
      // the knife runs out of paint and starts skipping
      const dry = s.paint <= 0 || (s.paint < 0.3 && Math.random() > s.paint * 3.3);
      if (!dry) {
        // flat band of color
        ctx.fillStyle = s.color;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(s.kl[0], s.kl[1]);
        ctx.lineTo(L[0], L[1]);
        ctx.lineTo(R[0], R[1]);
        ctx.lineTo(s.kr[0], s.kr[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // streaks of lighter and darker paint dragged along
        for (const st of s.streaks) {
          ctx.strokeStyle = st.c;
          ctx.lineWidth = st.w;
          ctx.beginPath();
          ctx.moveTo(s.px + nx * hw * st.o * 0.5, s.py + ny * hw * st.o * 0.5);
          ctx.lineTo(s.x + nx * hw * st.o * 0.5, s.y + ny * hw * st.o * 0.5);
          ctx.stroke();
        }
      }
      if (s.paint <= 0) s.lift = true;
    }
    s.kl = L;
    s.kr = R;
  }
};