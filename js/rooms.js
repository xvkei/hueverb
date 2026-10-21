// =====================================================================
// rooms.js — the entrance, moving between rooms, and the background strokes
// =====================================================================
import { $, clamp, load, store } from './utils.js';
import { PALETTES } from './config.js';
import { closeSheet } from './ui.js';

const views = { entrance: $('entrance'), studio: $('studio'), collection: $('collection') };
const stepTitle = $('stepTitle');
const stepGuide = $('stepGuide');
const enterBtn = $('enterBtn');
const beginBtn = $('beginBtn');
const skipEntrance = $('skipEntrance');
const ghostCanvas = $('ghostCanvas');
const gctx = ghostCanvas.getContext('2d');

// Other modules can ask to run something when a room opens (set up in main.js)
const hooks = {};
export const setRoomHooks = h => Object.assign(hooks, h);
export const isRoom = name => views[name].classList.contains('active');

// =====================================================================
// Rooms
// =====================================================================
export function showView(name) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle('active', key === name));
  document.body.className = `view-${name}`;
  document.querySelectorAll('.nav-link[data-view]').forEach(b =>
    b.classList.toggle('current', b.dataset.view === name)
  );
  closeSheet();

  if (name === 'entrance') startGhost();
  else stopGhost();
  if (hooks[name]) hooks[name]();
  window.scrollTo(0, 0);
}

function showEntranceStep(step) {
  stepTitle.classList.toggle('active', step === 'title');
  stepGuide.classList.toggle('active', step === 'guide');
}

export function route() {
  const hash = location.hash.replace('#', '');
  if (hash === 'entrance') {
    // the logo always opens the title wall, even if the entrance is set to skip
    showView('entrance');
    showEntranceStep('title');
  } else if (hash === 'studio' || hash === 'collection') {
    showView(hash);
  } else if (load('hueverb-skip-entrance') === '1') {
    history.replaceState(null, '', '#studio');
    showView('studio');
  } else {
    showView('entrance');
    showEntranceStep('title');
  }
}

export function go(name) {
  if (location.hash === '#' + name) route();
  else location.hash = name;
}

// =====================================================================
// Faint self-painting strokes behind the title
// =====================================================================
const ghost = { running: false, walkers: [], last: 0 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resizeGhost() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ghostCanvas.width = window.innerWidth * dpr;
  ghostCanvas.height = window.innerHeight * dpr;
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawnWalker() {
  const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  ghost.walkers.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.03,
    speed: 1 + Math.random() * 1.5,
    width: 6 + Math.random() * 18,
    color: p.colors[1 + Math.floor(Math.random() * 4)],
    life: 160 + Math.random() * 200,
    age: 0
  });
}

function stepGhost(fade) {
  if (fade) {
    gctx.fillStyle = 'rgba(246, 244, 239, 0.012)'; // older strokes slowly fade away
    gctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
  gctx.lineCap = 'round';
  for (const w of ghost.walkers) {
    w.turn = clamp(w.turn + (Math.random() - 0.5) * 0.008, -0.04, 0.04);
    w.angle += w.turn;
    const nx = w.x + Math.cos(w.angle) * w.speed;
    const ny = w.y + Math.sin(w.angle) * w.speed;
    const taper = Math.min(1, w.age / 20, (w.life - w.age) / 30);
    gctx.strokeStyle = w.color;
    gctx.lineWidth = Math.max(0.5, w.width * taper);
    gctx.beginPath();
    gctx.moveTo(w.x, w.y);
    gctx.lineTo(nx, ny);
    gctx.stroke();
    w.x = nx;
    w.y = ny;
    w.age++;
  }
  ghost.walkers = ghost.walkers.filter(w => w.age < w.life);
}

function ghostLoop(t) {
  if (!ghost.running) return;
  requestAnimationFrame(ghostLoop);
  if (t - ghost.last > 1400 && ghost.walkers.length < 4) {
    spawnWalker();
    ghost.last = t;
  }
  stepGhost(true);
}

function startGhost() {
  if (ghost.running) return;
  resizeGhost();
  if (reducedMotion) {
    // a still composition instead of animation
    for (let i = 0; i < 5; i++) spawnWalker();
    for (let i = 0; i < 400; i++) stepGhost(false);
    return;
  }
  ghost.running = true;
  requestAnimationFrame(ghostLoop);
}

function stopGhost() {
  ghost.running = false;
  ghost.walkers = [];
}

// =====================================================================
// Wiring
// =====================================================================
export function initRooms() {
  enterBtn.addEventListener('click', () => showEntranceStep('guide'));
  beginBtn.addEventListener('click', () => {
    if (skipEntrance.checked) store('hueverb-skip-entrance', '1');
    go('studio');
  });
  document.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.view))
  );
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', () => {
    if (ghost.running) resizeGhost();
  });
}