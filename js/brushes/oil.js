// =====================================================================
// Oil — a bristle brush whose hairs run out of paint one by one
// =====================================================================
import { ctx } from '../canvas.js';
import { varyColor } from '../utils.js';

const BRISTLES = 26; // number of "hairs" in the brush

export default {
  id: 'oil',
  label: 'Oil',
  short: 'Oil',
  hint: 'Bristle brush with dry, streaky edges',
  medium: 'oil',
  splatter: 0,

  setup(s, base, f) {
    const load = 0.6 + f.loud * 0.4; // louder sounds load more paint
    s.bristles = Array.from({ length: BRISTLES }, () => {
      // average of 3 randoms clusters hairs toward the middle, like a real brush
      const offset = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
      return {
        offset: offset * 1.1,
        thick: 0.6 + Math.random() * 0.9,
        color: varyColor(base, 0.35),
        paint: load * (0.5 + Math.random() * 0.5),
        drain: 0.003 + Math.random() * 0.006,
        lx: s.x,
        ly: s.y
      };
    });
  },

  paint(s) {
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    const jitter = s.roughness * s.width * 0.15;
    ctx.lineCap = 'round';

    for (const b of s.bristles) {
      const bx = s.x + nx * b.offset * s.width + (Math.random() - 0.5) * jitter;
      const by = s.y + ny * b.offset * s.width + (Math.random() - 0.5) * jitter;

      b.paint -= b.drain * (0.5 + Math.random());
      // dry brush: hairs low on paint start skipping, then stop completely
      const dry = b.paint <= 0 || (b.paint < 0.25 && Math.random() > b.paint * 4);

      if (!dry) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = Math.max(0.5, s.width * 0.09 * b.thick);
        ctx.beginPath();
        ctx.moveTo(b.lx, b.ly);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      b.lx = bx;
      b.ly = by;
    }
    if (s.bristles.every(b => b.paint <= 0)) s.lift = true; // every hair is dry
  }
};