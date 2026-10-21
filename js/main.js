// =====================================================================
// Hueverb — a gallery of heard things
// main.js — starts everything and runs the animation loop
// =====================================================================
import { $, load } from './utils.js';
import { SIZES } from './config.js';
import { state, isPainting } from './state.js';
import { setupCanvas, fitFrame, initCanvas } from './canvas.js';
import { analyze, SILENCE } from './audio.js';
import { updateStrokes } from './strokes.js';
import { runEveryFrame } from './brushes/index.js';
import { buildPickers, refreshAll, updatePlacard, updateTimers } from './ui.js';
import { initCollection, renderCollection, startNewCanvas } from './collection.js';
import { initRooms, route, setRoomHooks } from './rooms.js';
import { initControls } from './controls.js';

// ---------- Visitor guide labels (shared by the entrance and the overlay) ----------
const guideTemplate = $('guideTemplate');
document.querySelectorAll('[data-guide]').forEach(el => el.appendChild(guideTemplate.content.cloneNode(true)));

// ---------- Remember the last canvas shape ----------
const savedSize = load('hueverb-size');
if (SIZES.some(s => s.id === savedSize)) state.sizeId = savedSize;

// ---------- Set up the pieces ----------
buildPickers({ onSizePick: id => startNewCanvas(id) });
setupCanvas();
initCanvas();
initCollection();
initControls();
initRooms();
setRoomHooks({
  studio: () => requestAnimationFrame(fitFrame),
  collection: renderCollection
});
refreshAll();
route();

// ---------- Animation loop ----------
let lastTick = null;

function loop(now) {
  requestAnimationFrame(loop);
  const painting = isPainting();

  if (lastTick !== null && painting) state.paintSeconds += (now - lastTick) / 1000;
  lastTick = now;
  updateTimers();
  runEveryFrame();

  if (!state.analyser) return; // nothing to listen to yet
  const f = painting ? analyze(now) : SILENCE;
  if (updateStrokes(f)) updatePlacard();
}

requestAnimationFrame(loop);