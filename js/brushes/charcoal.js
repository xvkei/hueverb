// =====================================================================
// Charcoal — grainy marks that catch the paper texture, with soft smudges
// =====================================================================
import { ctx } from '../canvas.js';
import { mix, rgbaStr } from '../utils.js';

export default {
  id: 'charcoal',
  label: 'Charcoal',
  short: 'Charcoal',
  hint: 'Grainy, smudgy marks',
  medium: 'charcoal',

  setup(s, base) {
    s.rgb = mix(base, [20, 20, 20], 0.45);
  },

  paint(s) {
    const nx = -Math.sin(s.angle);
    const ny = Math.cos(s.angle);
    const grains = Math.floor(10 + s.width * 1.6);

    // lots of tiny grains scattered across the stroke
    for (let i = 0; i < grains; i++) {
      const t = Math.random();
      const off = (Math.random() + Math.random() - 1) * s.width * 0.6;
      const gx = s.px + (s.x - s.px) * t + nx * off;
      const gy = s.py + (s.y - s.py) * t + ny * off;
      const g = 0.6 + Math.random() * 1.6;
      ctx.fillStyle = rgbaStr(s.rgb, 0.12 + Math.random() * 0.35);
      ctx.fillRect(gx, gy, g, g);
    }

    // occasional soft smudge
    if (Math.random() < 0.08) {
      ctx.fillStyle = rgbaStr(s.rgb, 0.04);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.width * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};