// =====================================================================
// brushes/index.js — the list of brushes
// To add a brush: create a file in this folder, import it here, and add it to LIST.
// =====================================================================
import oil from './oil.js';
import watercolor from './watercolor.js';
import ink from './ink.js';
import dots from './dots.js';
import charcoal from './charcoal.js';
import drip from './drip.js';
import sketch from './sketch.js';
import knife from './knife.js';
import shapes from './shapes.js';

// "Auto" isn't a brush itself: it picks one of the others based on the sound
export const AUTO = { id: 'auto', label: 'Auto', short: 'Auto', hint: 'Let the sound choose the brush' };

const LIST = [oil, watercolor, ink, dots, charcoal, drip, sketch, knife, shapes];

export const BRUSHES = [AUTO, ...LIST];                           // for pickers and wheels
export const BRUSH_MAP = Object.fromEntries(LIST.map(b => [b.id, b])); // look up a brush by id

// Some brushes keep animating between strokes (like drips running down)
export function runEveryFrame() {
  for (const b of LIST) if (b.everyFrame) b.everyFrame();
}