// =====================================================================
// Hueverb — a gallery of heard things
// =====================================================================

// ---------- Elements ----------
const $ = id => document.getElementById(id);

const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const ghostCanvas = $('ghostCanvas');
const gctx = ghostCanvas.getContext('2d');

const views = { entrance: $('entrance'), studio: $('studio'), collection: $('collection') };
const stepTitle = $('stepTitle');
const stepGuide = $('stepGuide');
const enterBtn = $('enterBtn');
const beginBtn = $('beginBtn');
const skipEntrance = $('skipEntrance');
const guideBtn = $('guideBtn');

const artworkEl = $('artwork');
const frameWrap = $('frameWrap');
const frameEl = $('frame');
const matEl = $('mat');

const micBtn = $('micBtn');
const uploadBtn = $('uploadBtn');
const uploadLabel = $('uploadLabel');
const fileInput = $('fileInput');
const trackBtn = $('trackBtn');
const clearBtn = $('clearBtn');
const saveBtn = $('saveBtn');
const statusText = $('statusText');
const statusDot = $('statusDot');
const sizePicker = $('sizePicker');
const brushPicker = $('brushPicker');
const palettePicker = $('palettePicker');
const sizeSlider = $('sizeSlider');
const hud = $('hud');
const swipeHint = $('swipeHint');
const trackProgress = $('trackProgress');
const trackFill = $('trackFill');

const plTitle = $('plTitle');
const plMedium = $('plMedium');
const plStrokes = $('plStrokes');
const plTime = $('plTime');
const plDims = $('plDims');
const plPalette = $('plPalette');

const collectionGrid = $('collectionGrid');
const collectionEmpty = $('collectionEmpty');
const collectionCount = $('collectionCount');

const mbTrack = $('mbTrack');
const mbMic = $('mbMic');
const mbTime = $('mbTime');
const mbNote = $('mbNote');
const mbHelp = $('mbHelp');
const mbPalette = $('mbPalette');
const mbDots = $('mbDots');
const mbBrushes = $('mbBrushes');
const mbFill = $('mbFill');
const sheet = $('paletteSheet');
const sheetBackdrop = $('sheetBackdrop');
const sheetPalettes = $('sheetPalettes');
const sheetSizes = $('sheetSizes');
const sizeSliderM = $('sizeSliderM');
const sheetDone = $('sheetDone');

const guideOverlay = $('guideOverlay');
const guideClose = $('guideClose');
const confirmModal = $('confirmModal');
const confirmHang = $('confirmHang');
const confirmDiscard = $('confirmDiscard');
const confirmCancel = $('confirmCancel');
const viewer = $('viewer');
const viewerClose = $('viewerClose');
const viewerImg = $('viewerImg');
const viewerDownload = $('viewerDownload');
const viewerRemove = $('viewerRemove');
const vTitle = $('vTitle');
const vMedium = $('vMedium');
const vMeta = $('vMeta');
const vDims = $('vDims');
const vDate = $('vDate');
const toast = $('toast');
const toastText = $('toastText');
const toastAction = $('toastAction');

// ---------- Settings you can tweak ----------
const PAPER = '#f3eee4';        // canvas background color
const SENSITIVITY = 1.6;        // lower = more strokes, higher = fewer (try 1.3–2.2)
const MIN_GAP_MS = 120;         // minimum time between new strokes
const MAX_STROKE_FRAMES = 240;  // longest a single stroke can flow (~4 seconds)
const BRISTLES = 26;            // number of "hairs" in the oil brush
const PITCH_BANDS = 24;         // musical (log-spaced) bands used to measure pitch
const GRID = 12;                // crowd map used to spread strokes across the canvas
const MAX_WORKS = 40;           // collection limit, so the browser never runs out of space

// Canvas shapes. Drawing uses the shorter side = 1000 units, so brushes feel the same at every size.
const SIZES = [
  { id: 'square',    name: 'Square',    ratio: '1:1',  w: 1600, h: 1600 },
  { id: 'portrait',  name: 'Portrait',  ratio: '4:5',  w: 1600, h: 2000 },
  { id: 'story',     name: 'Story',     ratio: '9:16', w: 1350, h: 2400 },
  { id: 'landscape', name: 'Landscape', ratio: '3:2',  w: 2400, h: 1600 },
  { id: 'wide',      name: 'Wide',      ratio: '16:9', w: 2400, h: 1350 }
];

const BRUSHES = [
  { id: 'auto',       label: 'Auto',       short: 'Auto',     hint: 'Let the sound choose the brush' },
  { id: 'bristle',    label: 'Oil',        short: 'Oil',      hint: 'Bristle brush with dry, streaky edges' },
  { id: 'watercolor', label: 'Watercolor', short: 'Wash',     hint: 'Soft, see-through washes' },
  { id: 'ink',        label: 'Ink',        short: 'Ink',      hint: 'Calligraphy pen, thick and thin' },
  { id: 'spray',      label: 'Dots',       short: 'Dots',     hint: 'Pointillism: strokes made of dots' },
  { id: 'charcoal',   label: 'Charcoal',   short: 'Charcoal', hint: 'Grainy, smudgy marks' },
  { id: 'drip',       label: 'Drip',       short: 'Drip',     hint: 'Flung paint and drips, after Pollock' },
  { id: 'sketch',     label: 'Sketch',     short: 'Sketch',   hint: 'Fine pencil webs' },
  { id: 'knife',      label: 'Knife',      short: 'Knife',    hint: 'Flat palette-knife drags' },
  { id: 'shapes',     label: 'Shapes',     short: 'Shapes',   hint: 'Kandinsky-style geometry' }
];

// How each brush is named on the placard's "medium" line
const MEDIUM_NAMES = {
  bristle: 'oil', watercolor: 'watercolor', ink: 'ink', spray: 'pigment dots',
  charcoal: 'charcoal', drip: 'poured paint', sketch: 'graphite', knife: 'knifed paint',
  shapes: 'geometric forms'
};

// Artist-inspired palettes: deep colors first (low sounds), bright last (high sounds)
const PALETTES = [
  { name: 'Kandinsky', colors: ['#1d3557', '#111111', '#e63946', '#2a9d8f', '#f1c453'] },
  { name: 'Monet',     colors: ['#2d4a7a', '#5b8bb5', '#7fa886', '#d98c7a', '#e8c27a'] },
  { name: 'Matisse',   colors: ['#0b3d91', '#ef476f', '#ff6f3c', '#06a77d', '#ffd166'] },
  { name: 'Ukiyo-e',   colors: ['#1b2a49', '#2f5d7c', '#6b8f9c', '#b5442c', '#d9a441'] },
  { name: 'Sunset',    colors: ['#3d1e6d', '#8b3fa8', '#e8577e', '#f99e4c', '#f9c74f'] },
  { name: 'Van Gogh',  colors: ['#0e1f4d', '#1f4e8c', '#3f7cac', '#e9c46a', '#f4e285'] },
  { name: 'Klimt',     colors: ['#2b1d0e', '#6b4a1b', '#3b6e5a', '#b8862b', '#e0bf5a'] },
  { name: 'Rothko',    colors: ['#3b0d11', '#7a1c1c', '#a8322d', '#d9622b', '#f0a35e'] },
  { name: 'Kahlo',     colors: ['#1b4332', '#2d6a4f', '#d62828', '#f77f00', '#fcbf49'] },
  { name: 'Mondrian',  colors: ['#111111', '#1d3d8f', '#c8102e', '#7a7a7a', '#f5c800'] },
  { name: 'Hockney',   colors: ['#0a3d62', '#1e88b8', '#6ec6e8', '#e76f51', '#f4a261'] },
  { name: 'Sumi',      colors: ['#111111', '#3a3a3a', '#6b6b6b', '#9a9a9a', '#b3261e'] }
];

// ---------- Small helpers ----------
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

// ['Sound', 'oil', 'ink'] -> "Sound, oil and ink"
function joinList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

// "my_song-final.mp3" -> "my song final"
function titleFromFile(name) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}

// ---------- State ----------
let audioCtx, analyser, freqData, prevFreq, timeData, bandEdges, maxBin;

let trackEl = null;
let trackSource = null;
let trackTitle = null;
let trackEnded = false;
let micStream = null;
let micSource = null;
let voiceUsed = false;

let currentSizeId = SIZES.some(s => s.id === load('hueverb-size')) ? load('hueverb-size') : 'square';
let W = 1000;            // logical canvas width
let H = 1000;            // logical canvas height
const scale = 1000 / 600;

let strokes = [];
let liveStroke = null;
let strokeCount = 0;
let drips = [];
let sketchPoints = [];
const density = new Float32Array(GRID * GRID);
let dirty = false;       // true when the painting has unsaved strokes

let currentBrush = 'auto';
let prevBrush = 'auto';
let paletteIndex = 0;
let prevPalette = 0;
let brushSize = 1;

let brushesUsed = new Set();
let paintSeconds = 0;
let lastTick = null;
let shownSecond = -1;
let lastMbTime = '';
let hudTimer = null;
let toastTimer = null;

// sound tracking
let fluxAvg = 0;
let noiseFloor = 0.01;
let peakRms = 0.05;
let pitchLo = 0.4;
let pitchHi = 0.6;
let lastOnset = 0;

const SILENCE = { rms: 0, gate: 1, flux: 0, pitch: 0.5, loud: 0, roughness: 0 };

// ---------- Color helpers ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

PALETTES.forEach(p => (p.rgb = p.colors.map(hexToRgb)));

function mix(c1, c2, t) {
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
}

function rgbStr(c) {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function rgbaStr(c, a) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}

// Pick a palette color based on pitch, with some randomness for variety
function pickColor(pitch) {
  const p = PALETTES[paletteIndex].rgb;
  const idx = clamp(Math.round(pitch * (p.length - 1) + (Math.random() - 0.5) * 1.5), 0, p.length - 1);
  return p[idx];
}

// Slightly lighter or darker version of a color, for natural variation
function varyColor(rgb, amount) {
  const v = (Math.random() - 0.5) * amount;
  return rgbStr(v > 0 ? mix(rgb, [255, 255, 255], v) : mix(rgb, [0, 0, 0], -v));
}

// =====================================================================
// Rooms (entrance, studio, collection)
// =====================================================================
function showView(name) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle('active', key === name));
  document.body.className = `view-${name}`;
  document.querySelectorAll('.nav-link[data-view]').forEach(b =>
    b.classList.toggle('current', b.dataset.view === name)
  );
  closeSheet();

  if (name === 'entrance') startGhost();
  else stopGhost();
  if (name === 'studio') requestAnimationFrame(fitFrame);
  if (name === 'collection') renderCollection();
  window.scrollTo(0, 0);
}

function showEntranceStep(step) {
  stepTitle.classList.toggle('active', step === 'title');
  stepGuide.classList.toggle('active', step === 'guide');
}

function route() {
  const hash = location.hash.replace('#', '');
  if (hash === 'studio' || hash === 'collection') {
    showView(hash);
  } else if (load('hueverb-skip-entrance') === '1') {
    history.replaceState(null, '', '#studio');
    showView('studio');
  } else {
    showView('entrance');
    showEntranceStep('title');
  }
}

function go(name) {
  if (location.hash === '#' + name) route();
  else location.hash = name;
}

window.addEventListener('hashchange', route);

// ---------- Faint self-painting strokes behind the title ----------
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
// Placard, status & transport UI
// =====================================================================
function currentSize() {
  return SIZES.find(s => s.id === currentSizeId);
}

function pieceTitle() {
  if (trackTitle) return trackTitle;
  return voiceUsed ? 'Untitled (live study)' : 'Untitled';
}

function updatePlacard() {
  plTitle.textContent = pieceTitle();
  const media = [...brushesUsed].map(b => MEDIUM_NAMES[b]);
  const parts = ['Sound', ...(voiceUsed ? ['voice'] : []), ...media];
  plMedium.textContent = `${joinList(parts)} on paper, ${new Date().getFullYear()}`;
  plStrokes.textContent = `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'}`;
  const s = currentSize();
  plDims.textContent = `${s.w} × ${s.h} px`;
  plPalette.textContent = `${PALETTES[paletteIndex].name} palette`;
}

function isTrackPlaying() {
  return !!trackEl && !trackEl.paused;
}

function isPainting() {
  return !!micStream || isTrackPlaying();
}

function refreshAll() {
  const playing = isTrackPlaying();
  const listening = !!micStream;

  micBtn.textContent = listening ? 'Stop listening' : 'Listen';
  micBtn.classList.toggle('active', listening);
  trackBtn.hidden = !trackEl;
  trackBtn.textContent = playing ? 'Pause track' : trackEnded ? 'Replay track' : 'Play track';
  uploadLabel.textContent = trackEl ? 'Change track' : 'Upload a track';
  trackProgress.hidden = !trackEl;

  mbTrack.dataset.state = !trackEl ? 'none' : playing ? 'playing' : 'paused';
  mbTrack.setAttribute('aria-label', !trackEl ? 'Add a track' : playing ? 'Pause track' : 'Play track');
  mbMic.classList.toggle('active', listening);
  mbMic.setAttribute('aria-label', listening ? 'Stop listening' : 'Listen');

  let text;
  if (playing && listening) text = 'Painting track and voice. Headphones help';
  else if (listening) text = 'Listening. Clap, hum, whistle, or sing';
  else if (playing) text = 'Now painting';
  else if (trackEnded) text = 'Finished. Acquire your piece';
  else if (trackEl) text = 'Paused';
  else text = 'Choose a sound to begin';
  statusText.textContent = text;
  statusDot.classList.toggle('live', playing || listening);

  if (playing && listening) mbNote.textContent = 'Mic on · headphones help';
  else if (listening) mbNote.textContent = 'Mic on';
  else if (trackEl) mbNote.textContent = playing ? 'Playing' : trackEnded ? 'Finished' : 'Paused';
  else mbNote.textContent = 'Add a track or tap the mic';

  updatePlacard();
}

function updateTimers() {
  const sec = Math.floor(paintSeconds);
  if (sec !== shownSecond) {
    shownSecond = sec;
    plTime.textContent = formatTime(paintSeconds);
  }

  let timeText;
  if (trackEl) {
    const dur = trackEl.duration;
    const cur = trackEl.currentTime;
    const pct = isFinite(dur) && dur > 0 ? (cur / dur) * 100 : 0;
    trackFill.style.width = pct + '%';
    mbFill.style.width = pct + '%';
    timeText = `${formatTime(cur)} / ${isFinite(dur) ? formatTime(dur) : '0:00'}`;
  } else {
    mbFill.style.width = '0%';
    timeText = formatTime(paintSeconds);
  }
  if (timeText !== lastMbTime) {
    lastMbTime = timeText;
    mbTime.textContent = timeText;
  }
}

function showHud(text) {
  hud.textContent = text;
  hud.classList.add('show');
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => hud.classList.remove('show'), 1200);
}

function showToast(text, actionLabel, action) {
  toastText.textContent = text;
  toastAction.hidden = !actionLabel;
  toastAction.textContent = actionLabel || '';
  toastAction.onclick = action
    ? () => { toast.classList.remove('show'); action(); }
    : null;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// =====================================================================
// Pickers: canvas size, brush, palette
// =====================================================================
function makeBrushButton(b, label) {
  const btn = document.createElement('button');
  btn.className = 'pick';
  btn.textContent = label;
  btn.title = b.hint;
  btn.dataset.brush = b.id;
  btn.addEventListener('click', () => setBrush(b.id));
  return btn;
}

function makePaletteButton(p, i) {
  const btn = document.createElement('button');
  btn.className = 'pick';
  btn.title = p.name;
  btn.dataset.palette = i;
  btn.innerHTML =
    p.colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join('') +
    `<span class="pick-name">${p.name}</span>`;
  btn.addEventListener('click', () => setPalette(i));
  return btn;
}

function makeSizeButton(s) {
  const btn = document.createElement('button');
  btn.className = 'pick';
  btn.dataset.size = s.id;
  btn.title = `${s.name} (${s.ratio}), saves at ${s.w} × ${s.h} px`;
  const r = s.w / s.h;
  const iw = r >= 1 ? 18 : Math.round(18 * r);
  const ih = r >= 1 ? Math.round(18 / r) : 18;
  btn.innerHTML =
    `<span class="size-icon-box"><span class="size-icon" style="width:${iw}px;height:${ih}px"></span></span>` +
    `<span class="pick-name">${s.name}</span><span class="size-ratio">${s.ratio}</span>`;
  btn.addEventListener('click', () => {
    if (s.id !== currentSizeId) startNewCanvas(s.id);
  });
  return btn;
}

function buildPickers() {
  SIZES.forEach(s => {
    sizePicker.appendChild(makeSizeButton(s));
    sheetSizes.appendChild(makeSizeButton(s));
  });
  BRUSHES.forEach(b => {
    brushPicker.appendChild(makeBrushButton(b, b.label));
    mbBrushes.appendChild(makeBrushButton(b, b.short));
  });
  PALETTES.forEach((p, i) => {
    palettePicker.appendChild(makePaletteButton(p, i));
    sheetPalettes.appendChild(makePaletteButton(p, i));
  });
  refreshPickers();
}

function refreshPickers() {
  document.querySelectorAll('[data-brush]').forEach(b =>
    b.classList.toggle('active', b.dataset.brush === currentBrush)
  );
  document.querySelectorAll('[data-palette]').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.palette) === paletteIndex)
  );
  document.querySelectorAll('[data-size]').forEach(b =>
    b.classList.toggle('active', b.dataset.size === currentSizeId)
  );

  const c = PALETTES[paletteIndex].colors;
  mbDots.innerHTML = [c[0], c[2], c[4]].map(col => `<span style="background:${col}"></span>`).join('');

  if (window.matchMedia('(max-width: 899px)').matches && views.studio.classList.contains('active')) {
    const active = mbBrushes.querySelector('.pick.active');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

function setBrush(id, announce = false) {
  if (id !== currentBrush) {
    prevBrush = currentBrush;
    currentBrush = id;
  }
  refreshPickers();
  if (announce) {
    const i = BRUSHES.findIndex(b => b.id === id);
    showHud(`${BRUSHES[i].label} · ${i + 1} of ${BRUSHES.length}`);
  }
}

function setPalette(i, announce = false) {
  if (i !== paletteIndex) {
    prevPalette = paletteIndex;
    paletteIndex = i;
  }
  refreshPickers();
  updatePlacard();
  if (announce) showHud(`${PALETTES[i].name} · ${i + 1} of ${PALETTES.length}`);
}

function stepBrush(dir) {
  const i = BRUSHES.findIndex(b => b.id === currentBrush);
  setBrush(BRUSHES[(i + dir + BRUSHES.length) % BRUSHES.length].id, true);
}

function stepPalette(dir) {
  setPalette((paletteIndex + dir + PALETTES.length) % PALETTES.length, true);
}

// =====================================================================
// Canvas setup & fitting
// =====================================================================
function setupCanvas() {
  const s = currentSize();
  const short = Math.min(s.w, s.h);
  W = (1000 * s.w) / short;
  H = (1000 * s.h) / short;
  canvas.width = s.w;
  canvas.height = s.h;
  canvas.style.aspectRatio = `${s.w} / ${s.h}`;
  ctx.setTransform(short / 1000, 0, 0, short / 1000, 0, 0);
  clearCanvas();
  fitFrame();
}

// Make the frame as large as possible without overflowing the column or the screen height
function fitFrame() {
  if (!views.studio.classList.contains('active')) return;
  const s = currentSize();
  const ratio = s.w / s.h;
  const extra =
    2 * (parseFloat(getComputedStyle(frameEl).paddingLeft) + parseFloat(getComputedStyle(matEl).paddingLeft));
  const mobile = window.matchMedia('(max-width: 899px)').matches;
  const availW = artworkEl.clientWidth;
  const availH = Math.max(260, window.innerHeight - (mobile ? 250 : 170));

  let cw = availW - extra;
  let ch = cw / ratio;
  if (ch > availH - extra) {
    ch = availH - extra;
    cw = ch * ratio;
  }
  frameWrap.style.width = Math.max(120, Math.round(cw + extra)) + 'px';
}

window.addEventListener('resize', () => {
  fitFrame();
  if (ghost.running) resizeGhost();
});
if ('ResizeObserver' in window) new ResizeObserver(() => fitFrame()).observe(artworkEl);

function clearCanvas() {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  addPaperGrain();
  strokes = [];
  liveStroke = null;
  drips = [];
  sketchPoints = [];
  density.fill(0);
  strokeCount = 0;
  dirty = false;
  brushesUsed.clear();
  voiceUsed = !!micStream;
  paintSeconds = 0;
  shownSecond = -1;
  updatePlacard();
}

// Tiny light and dark specks so the canvas feels like real paper
function addPaperGrain() {
  const specks = Math.floor((W * H) / 40);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
}

// ---------- Crowd map: helps strokes spread across the whole canvas ----------
function cellIndex(x, y) {
  const cx = clamp(Math.floor((x / W) * GRID), 0, GRID - 1);
  const cy = clamp(Math.floor((y / H) * GRID), 0, GRID - 1);
  return cy * GRID + cx;
}

function addDensity(x, y, amount) {
  density[cellIndex(x, y)] += amount;
}

// Try a few spots near the pitch's height and pick the least crowded one
function pickSpot(pitch) {
  const margin = Math.min(W, H) * 0.1;
  const targetY = H * (0.88 - pitch * 0.76); // high sounds near the top, low near the bottom
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < 8; i++) {
    const x = margin + Math.random() * (W - margin * 2);
    const y = clamp(targetY + (Math.random() - 0.5) * H * 0.35, margin, H - margin);
    const score = density[cellIndex(x, y)] + (Math.abs(y - targetY) / H) * 2 + Math.random() * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}

// =====================================================================
// New canvas, acquiring & the collection (IndexedDB)
// =====================================================================
const DB_NAME = 'hueverb';
const STORE_NAME = 'works';
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function dbRequest(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = fn(tx.objectStore(STORE_NAME));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const dbAll = () => dbRequest('readonly', s => s.getAll());
const dbCount = () => dbRequest('readonly', s => s.count());
const dbAdd = work => dbRequest('readwrite', s => s.add(work));
const dbDelete = id => dbRequest('readwrite', s => s.delete(id));

function canvasToBlob(c, type, quality) {
  return new Promise((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), type, quality);
  });
}

function makeThumb() {
  const s = currentSize();
  const k = 480 / Math.max(s.w, s.h);
  const off = document.createElement('canvas');
  off.width = Math.round(s.w * k);
  off.height = Math.round(s.h * k);
  off.getContext('2d').drawImage(canvas, 0, 0, off.width, off.height);
  return canvasToBlob(off, 'image/jpeg', 0.85);
}

async function acquire() {
  if (strokeCount === 0) {
    showToast('Paint something first, then acquire it');
    return false;
  }
  try {
    if ((await dbCount()) >= MAX_WORKS) {
      showToast('Your collection is full. Remove a work to make room', 'Open', () => go('collection'));
      return false;
    }
    const s = currentSize();
    const [blob, thumb] = await Promise.all([canvasToBlob(canvas, 'image/png'), makeThumb()]);
    await dbAdd({
      title: pieceTitle(),
      medium: plMedium.textContent,
      strokes: strokeCount,
      seconds: Math.round(paintSeconds),
      palette: PALETTES[paletteIndex].name,
      w: s.w,
      h: s.h,
      date: Date.now(),
      blob,
      thumb
    });
    dirty = false;
    showToast('Hung in your collection', 'View', () => go('collection'));
    return true;
  } catch (err) {
    console.error(err);
    showToast("Couldn't save to your collection");
    return false;
  }
}

// "Hang this piece first?" — resolves to 'hang', 'discard', or 'cancel'
let dialogResolve = null;

function askToHang() {
  return new Promise(resolve => {
    dialogResolve = choice => {
      confirmModal.hidden = true;
      dialogResolve = null;
      resolve(choice);
    };
    confirmModal.hidden = false;
    confirmHang.focus();
  });
}

confirmHang.addEventListener('click', () => dialogResolve && dialogResolve('hang'));
confirmDiscard.addEventListener('click', () => dialogResolve && dialogResolve('discard'));
confirmCancel.addEventListener('click', () => dialogResolve && dialogResolve('cancel'));

async function startNewCanvas(sizeId) {
  if (dirty) {
    const choice = await askToHang();
    if (choice === 'cancel') return;
    if (choice === 'hang' && !(await acquire())) return;
  }
  if (sizeId) {
    currentSizeId = sizeId;
    store('hueverb-size', sizeId);
    setupCanvas();
  } else {
    clearCanvas();
  }
  refreshPickers();
}

// ---------- Collection room ----------
let collectionUrls = [];

async function renderCollection() {
  collectionUrls.forEach(u => URL.revokeObjectURL(u));
  collectionUrls = [];

  let works = [];
  try {
    works = await dbAll();
  } catch (err) {
    console.error(err);
  }
  works.sort((a, b) => b.date - a.date);

  collectionGrid.innerHTML = '';
  collectionEmpty.hidden = works.length > 0;
  collectionCount.textContent = `${works.length} ${works.length === 1 ? 'work' : 'works'} · saved on this device only`;

  works.forEach(work => {
    const url = URL.createObjectURL(work.thumb);
    collectionUrls.push(url);
    const r = work.w / work.h;

    const btn = document.createElement('button');
    btn.className = 'work';
    btn.innerHTML =
      `<div class="work-slot"><div class="work-frame" style="width:${r >= 1 ? 88 : 88 * r}%">` +
      `<div class="work-mat"><img src="${url}" alt="" /></div></div></div>` +
      `<p class="work-title"></p><p class="work-meta"></p>`;
    // titles come from file names, so they're set as text (never as HTML)
    btn.querySelector('img').alt = work.title;
    btn.querySelector('.work-title').textContent = work.title;
    btn.querySelector('.work-meta').textContent = `${work.palette} palette · ${formatDate(work.date)}`;
    btn.addEventListener('click', () => openViewer(work));
    collectionGrid.appendChild(btn);
  });
}

// ---------- Viewing screen ----------
let viewerWork = null;
let viewerUrl = null;
let removeTimer = null;

function openViewer(work) {
  viewerWork = work;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(work.blob);
  viewerImg.src = viewerUrl;
  viewerImg.alt = work.title;
  vTitle.textContent = work.title;
  vMedium.textContent = work.medium;
  vMeta.textContent = `${work.strokes} strokes · ${formatTime(work.seconds)} · ${work.palette} palette`;
  vDims.textContent = `${work.w} × ${work.h} px`;
  vDate.textContent = `Acquired ${formatDate(work.date)}`;
  resetRemoveButton();
  viewer.hidden = false;
  viewerClose.focus();
}

function closeViewer() {
  viewer.hidden = true;
  viewerWork = null;
  resetRemoveButton();
}

function resetRemoveButton() {
  clearTimeout(removeTimer);
  viewerRemove.textContent = 'Remove from collection';
  viewerRemove.classList.remove('armed');
  viewerRemove.dataset.armed = '';
}

viewerClose.addEventListener('click', closeViewer);

viewerDownload.addEventListener('click', () => {
  if (!viewerWork) return;
  const link = document.createElement('a');
  link.download = `hueverb-${slugify(viewerWork.title)}.png`;
  link.href = viewerUrl;
  link.click();
});

// Removing needs a second tap, so nothing is deleted by accident
viewerRemove.addEventListener('click', async () => {
  if (!viewerWork) return;
  if (viewerRemove.dataset.armed !== '1') {
    viewerRemove.dataset.armed = '1';
    viewerRemove.classList.add('armed');
    viewerRemove.textContent = 'Tap again to remove';
    removeTimer = setTimeout(resetRemoveButton, 3000);
    return;
  }
  try {
    await dbDelete(viewerWork.id);
    closeViewer();
    renderCollection();
    showToast('Removed from your collection');
  } catch (err) {
    console.error(err);
    showToast("Couldn't remove that work");
  }
});

// =====================================================================
// Audio
// =====================================================================
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    prevFreq = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Float32Array(analyser.fftSize);

    // log-spaced bands from 60Hz to 8kHz, so low and high sounds count equally
    const binHz = audioCtx.sampleRate / analyser.fftSize;
    bandEdges = [];
    for (let k = 0; k <= PITCH_BANDS; k++) {
      const hz = 60 * Math.pow(8000 / 60, k / PITCH_BANDS);
      bandEdges.push(Math.max(1, Math.round(hz / binHz)));
    }
    maxBin = Math.min(freqData.length, bandEdges[PITCH_BANDS]);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function resetTracking() {
  fluxAvg = 0;
  noiseFloor = 0.01;
  peakRms = 0.05;
  pitchLo = 0.4;
  pitchHi = 0.6;
  prevFreq.fill(0);
  endStroke(liveStroke);
  liveStroke = null;
}

async function toggleMic() {
  if (micStream) stopMic();
  else await startMic();
}

async function startMic() {
  try {
    ensureAudio();
    if (!isPainting()) resetTracking();
    // turn off voice-call filters so claps, hums, and music come through naturally
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    micSource = audioCtx.createMediaStreamSource(micStream);
    micSource.connect(analyser); // not to speakers, to avoid feedback
    voiceUsed = true;
    refreshAll();
    maybeShowSwipeHint();
  } catch (err) {
    refreshAll();
    statusText.textContent = 'Microphone access was blocked';
    console.error(err);
  }
}

function stopMic() {
  if (micSource) micSource.disconnect();
  if (micStream) micStream.getTracks().forEach(t => t.stop()); // turns off the browser's mic indicator
  micStream = null;
  micSource = null;
  refreshAll();
}

function loadTrack(file) {
  ensureAudio();
  if (trackEl) {
    trackEl.pause();
    trackSource.disconnect();
    URL.revokeObjectURL(trackEl.src);
  }
  if (!micStream) resetTracking();

  trackEl = new Audio(URL.createObjectURL(file));
  trackSource = audioCtx.createMediaElementSource(trackEl);
  trackSource.connect(analyser);
  trackSource.connect(audioCtx.destination); // so you can hear it
  trackTitle = titleFromFile(file.name);
  trackEnded = false;

  trackEl.addEventListener('play', refreshAll);
  trackEl.addEventListener('pause', refreshAll);
  trackEl.addEventListener('ended', () => {
    trackEnded = true;
    refreshAll();
  });

  trackEl.play();
  refreshAll();
  maybeShowSwipeHint();
}

function toggleTrack() {
  if (!trackEl) {
    fileInput.click();
    return;
  }
  if (trackEl.paused) {
    ensureAudio();
    trackEnded = false;
    trackEl.play();
  } else {
    trackEl.pause();
  }
}

// ---------- Listening: turn raw audio into features ----------
function analyze() {
  analyser.getByteFrequencyData(freqData);
  analyser.getFloatTimeDomainData(timeData);

  // Loudness (RMS) and noisiness (zero-crossing rate)
  let sum = 0;
  let crossings = 0;
  for (let i = 0; i < timeData.length; i++) {
    const s = timeData[i];
    sum += s * s;
    if (i > 0 && (s >= 0) !== (timeData[i - 1] >= 0)) crossings++;
  }
  const rms = Math.sqrt(sum / timeData.length);
  const zcr = crossings / timeData.length;

  // Adapt to the room's background noise and the overall volume
  if (rms < noiseFloor) noiseFloor = rms;
  else noiseFloor += (rms - noiseFloor) * 0.00005;
  peakRms = Math.max(rms, peakRms * 0.9995, 0.02);
  const gate = Math.min(Math.max(0.008, noiseFloor * 2), peakRms * 0.3);

  // Flux: how suddenly the sound changed (used to detect new sounds)
  let flux = 0;
  for (let i = 1; i < maxBin; i++) {
    const d = freqData[i] - prevFreq[i];
    if (d > 0) flux += d;
    prevFreq[i] = freqData[i];
  }
  flux /= maxBin * 255;

  // Pitch: the "center of mass" of energy across musical bands
  let weighted = 0;
  let energy = 0;
  for (let k = 0; k < PITCH_BANDS; k++) {
    const a = bandEdges[k];
    const b = Math.max(a + 1, bandEdges[k + 1]);
    let e = 0;
    for (let i = a; i < b; i++) {
      const m = freqData[i] / 255;
      e += m * m;
    }
    e /= b - a;
    weighted += e * k;
    energy += e;
  }
  const rawPitch = energy > 0 ? weighted / energy / (PITCH_BANDS - 1) : 0.5;

  // Compare pitch against this song's (or voice's) own range, so any sound uses the full canvas
  if (rms > gate) {
    pitchLo = Math.min(pitchLo + 0.0004, rawPitch);
    pitchHi = Math.max(pitchHi - 0.0004, rawPitch);
  }
  const mid = (pitchLo + pitchHi) / 2;
  const span = Math.max(0.12, pitchHi - pitchLo);
  const pitch = clamp((rawPitch - (mid - span / 2)) / span, 0, 1);

  return {
    rms,
    gate,
    flux,
    pitch,                                        // 0 = low, 1 = high (relative to this song)
    loud: clamp(rms / peakRms, 0, 1),             // 0 = quiet, 1 = loudest so far
    roughness: clamp((zcr - 0.02) / 0.15, 0, 1)   // 0 = smooth tone, 1 = noisy/hissy
  };
}

// =====================================================================
// Strokes
// =====================================================================
// In Auto mode, the character of the sound picks the brush
function chooseBrush(f, punch) {
  if (currentBrush !== 'auto') return currentBrush;
  if (f.roughness > 0.55) return f.loud > 0.7 ? 'drip' : 'spray'; // noisy: drips or dots
  if (punch > 3 && f.loud > 0.6) return 'shapes';                  // big sudden hits
  if (f.pitch > 0.75) return 'sketch';                             // very high: fine pencil
  if (f.pitch > 0.55) return 'ink';                                // high: ink lines
  if (f.pitch < 0.2 && f.loud > 0.6) return 'knife';               // loud bass: knife drags
  if (f.pitch < 0.3) return 'charcoal';                            // low: charcoal
  if (f.loud < 0.45) return 'watercolor';                          // soft: washes
  return 'bristle';                                                // everything else: oil
}

function makeBristles(x, y, base, f) {
  const load = 0.6 + f.loud * 0.4; // louder sounds load more paint
  const bristles = [];
  for (let i = 0; i < BRISTLES; i++) {
    // average of 3 randoms clusters hairs toward the middle, like a real brush
    const offset = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
    bristles.push({
      offset: offset * 1.1,
      thick: 0.6 + Math.random() * 0.9,
      color: varyColor(base, 0.35),
      paint: load * (0.5 + Math.random() * 0.5),
      drain: 0.003 + Math.random() * 0.006,
      lx: x,
      ly: y
    });
  }
  return bristles;
}

function createStroke(f, punch) {
  const brush = chooseBrush(f, punch);
  const { x, y } = pickSpot(f.pitch);
  const base = pickColor(f.pitch);

  const s = {
    x, y, px: x, py: y,
    brush,
    base,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.06,
    roughness: f.roughness,
    width: 0,
    age: 0,
    fade: -1 // -1 = alive; otherwise counts down to 0
  };

  switch (brush) {
    case 'bristle':
      s.bristles = makeBristles(x, y, base, f);
      break;
    case 'watercolor':
      s.color = rgbStr(base);
      s.wet = 1;
      break;
    case 'ink':
      s.color = rgbStr(mix(base, [0, 0, 0], 0.25));
      s.hx = 0;
      s.hy = 0;
      break;
    case 'spray':
      s.dotColors = [varyColor(base, 0.3), varyColor(base, 0.3), rgbStr(pickColor(f.pitch))];
      break;
    case 'charcoal':
      s.rgb = mix(base, [20, 20, 20], 0.45);
      break;
    case 'drip':
      s.color = rgbStr(base);
      break;
    case 'sketch':
      s.rgb = mix(base, [0, 0, 0], 0.15);
      break;
    case 'knife':
      s.color = rgbStr(base);
      s.paint = 0.7 + f.loud * 0.3;
      s.kl = null;
      s.kr = null;
      s.streaks = Array.from({ length: 5 }, () => ({
        o: (Math.random() - 0.5) * 1.8,
        c: varyColor(base, 0.5),
        w: 0.5 + Math.random() * 1.2
      }));
      break;
    case 'shapes':
      s.nextShape = 0;
      s.lineColor = rgbStr(mix(PALETTES[paletteIndex].rgb[0], [0, 0, 0], 0.3));
      break;
  }
  return s;
}

function endStroke(s) {
  if (s && s.fade < 0) s.fade = 12; // lift the brush gradually
}

// What happens the instant a sound starts
function startMark(s, f) {
  if (s.brush === 'watercolor') {
    // a soft "bloom" of water and pigment
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = s.color;
    const r = (10 + f.loud * 30) * scale * brushSize;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(s.x + (Math.random() - 0.5) * r * 0.5, s.y + (Math.random() - 0.5) * r * 0.5,
              r * (0.6 + Math.random() * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // splatter only for wet, flicky brushes
  if (!['bristle', 'ink', 'spray', 'drip'].includes(s.brush)) return;
  const extra = s.brush === 'drip' ? 8 : 0;
  const drops = Math.floor(f.loud * 4 + f.roughness * 10 + extra);
  for (let i = 0; i < drops; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() ** 2 * (15 + f.loud * 45) * scale * brushSize;
    const r = (0.6 + Math.random() * (0.8 + f.loud * 2.5)) * scale * brushSize;
    ctx.fillStyle = varyColor(s.base, 0.3);
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- Brush renderers ----------
function paintBristles(s) {
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const jitter = s.roughness * s.width * 0.15;
  ctx.lineCap = 'round';

  for (const b of s.bristles) {
    const bx = s.x + nx * b.offset * s.width + (Math.random() - 0.5) * jitter;
    const by = s.y + ny * b.offset * s.width + (Math.random() - 0.5) * jitter;

    b.paint -= b.drain * (0.5 + Math.random());
    // Dry brush: bristles low on paint start skipping, then stop completely
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
  if (s.bristles.every(b => b.paint <= 0)) endStroke(s);
}

function paintWatercolor(s) {
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

function paintInk(s) {
  // a calligraphy nib held at a fixed slant: thick or thin depending on direction
  const nib = -Math.PI / 4;
  const hw = s.width * 0.35;
  const hx = Math.cos(nib) * hw;
  const hy = Math.sin(nib) * hw;

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

function paintSpray(s) {
  const dots = Math.floor(2 + s.width * 0.2);
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < dots; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = (Math.random() + Math.random() - 1) * s.width * 0.9; // denser in the middle
    const r = (0.7 + Math.random() * 1.8) * scale * brushSize;
    ctx.fillStyle = s.dotColors[Math.floor(Math.random() * s.dotColors.length)];
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintCharcoal(s) {
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const grains = Math.floor(10 + s.width * 1.6);
  // lots of tiny grains scattered across the stroke, like charcoal catching paper texture
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

function paintDrip(s) {
  // a poured line that keeps changing thickness
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.8, s.width * (0.08 + Math.random() * 0.3));
  ctx.beginPath();
  ctx.moveTo(s.px, s.py);
  ctx.lineTo(s.x, s.y);
  ctx.stroke();

  // flung droplets
  if (Math.random() < 0.35) {
    const a = Math.random() * Math.PI * 2;
    const d = s.width * (0.5 + Math.random() * 1.8);
    const r = (0.8 + Math.random() * 2.5) * scale * brushSize * 0.6;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // drips that run down the canvas
  if (Math.random() < 0.04 && drips.length < 60) {
    drips.push({
      x: s.x,
      y: s.y,
      w: Math.max(1, s.width * 0.08 * (0.5 + Math.random())),
      left: (20 + Math.random() * 80) * scale,
      color: s.color
    });
  }
}

function updateDrips() {
  if (!drips.length) return;
  ctx.lineCap = 'round';
  for (const d of drips) {
    const len = 1 + Math.random() * 1.5;
    ctx.strokeStyle = d.color;
    ctx.lineWidth = d.w;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    d.y += len;
    d.x += (Math.random() - 0.5) * 0.3;
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
    d.left -= len;
    d.w *= 0.995;
    // a little bead of paint where the drip stops
    if (d.left <= 0) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.w * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drips = drips.filter(d => d.left > 0 && d.y < H);
}

function paintSketch(s) {
  // the main pencil line
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = rgbaStr(s.rgb, 0.55);
  ctx.beginPath();
  ctx.moveTo(s.px, s.py);
  ctx.lineTo(s.x, s.y);
  ctx.stroke();

  // faint lines to nearby earlier points build up web-like shading
  const reach = 70 * scale * brushSize;
  const maxD = reach * reach;
  ctx.strokeStyle = rgbaStr(s.rgb, 0.12);
  ctx.beginPath();
  for (const p of sketchPoints) {
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = dx * dx + dy * dy;
    if (d < maxD && Math.random() > d / maxD + 0.35) {
      ctx.moveTo(s.x + dx * 0.25, s.y + dy * 0.25);
      ctx.lineTo(p.x - dx * 0.25, p.y - dy * 0.25);
    }
  }
  ctx.stroke();

  sketchPoints.push({ x: s.x, y: s.y });
  if (sketchPoints.length > 800) sketchPoints.shift();
}

function paintKnife(s) {
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const hw = s.width * 0.75;
  const L = [s.x + nx * hw, s.y + ny * hw];
  const R = [s.x - nx * hw, s.y - ny * hw];

  if (s.kl) {
    s.paint -= 0.004 + Math.random() * 0.004;
    // the knife runs out of paint and starts skipping, like a real drag
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
    if (s.paint <= 0) endStroke(s);
  }
  s.kl = L;
  s.kr = R;
}

function paintShapes(s) {
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

  const r = Math.max(4 * scale, s.width * (0.35 + Math.random() * 0.7));
  const type = Math.floor(Math.random() * 5);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(Math.random() * Math.PI * 2);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = rgbStr(pickColor(Math.random()));
  ctx.strokeStyle = s.lineColor;
  ctx.lineWidth = Math.max(1, r * 0.08);

  if (type === 0) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 1) {
    for (let k = 3; k >= 1; k--) {
      ctx.fillStyle = rgbStr(pickColor(Math.random()));
      ctx.beginPath();
      ctx.arc(0, 0, (r * k) / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 2) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.87, r * 0.5);
    ctx.lineTo(-r * 0.87, r * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (type === 3) {
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
  }
  ctx.restore();
}

const RENDERERS = {
  bristle: paintBristles,
  watercolor: paintWatercolor,
  ink: paintInk,
  spray: paintSpray,
  charcoal: paintCharcoal,
  drip: paintDrip,
  sketch: paintSketch,
  knife: paintKnife,
  shapes: paintShapes
};

// ---------- Moving the brush ----------
// Returns false when the stroke is finished
function stepStroke(s, f, isLive) {
  s.age++;

  // width follows loudness (and the size slider) while the sound lasts, then tapers off
  if (s.fade >= 0) {
    s.width *= 0.85;
    if (s.fade > 0) s.fade--;
  } else {
    const target = (4 + f.loud * 30) * scale * brushSize * Math.min(1, s.age / 5);
    s.width += (target - s.width) * 0.25;
  }

  // smooth, gestural curves; knives drag straighter, drips wander more
  s.turn = clamp(s.turn + (Math.random() - 0.5) * 0.006, -0.05, 0.05);
  if (s.brush === 'knife') {
    s.angle += s.turn * 0.3;
  } else {
    s.angle += s.turn + (Math.random() - 0.5) * s.roughness * 0.5;
    if (s.brush === 'drip') s.angle += (Math.random() - 0.5) * 0.25;
  }

  // steer back toward the middle near the edges
  const margin = Math.min(W, H) * 0.08;
  if (s.x < margin || s.x > W - margin || s.y < margin || s.y > H - margin) {
    const toCenter = Math.atan2(H / 2 - s.y, W / 2 - s.x);
    const diff = Math.atan2(Math.sin(toCenter - s.angle), Math.cos(toCenter - s.angle));
    s.angle += diff * 0.12;
  }

  s.px = s.x;
  s.py = s.y;
  const speed = (1.5 + (isLive ? f.loud : 0.3) * 5) * scale;
  s.x += Math.cos(s.angle) * speed;
  s.y += Math.sin(s.angle) * speed;

  RENDERERS[s.brush](s);
  addDensity(s.x, s.y, s.width * 0.004);

  if (s.age > MAX_STROKE_FRAMES) endStroke(s);
  return s.fade !== 0;
}

// ---------- Main loop ----------
function draw() {
  requestAnimationFrame(draw);
  const now = performance.now();
  const painting = isPainting();

  if (lastTick !== null && painting) paintSeconds += (now - lastTick) / 1000;
  lastTick = now;
  updateTimers();
  updateDrips();

  if (!analyser) return;
  const f = painting ? analyze() : SILENCE;
  const punch = f.flux / (fluxAvg + 0.0001);

  // A "new sound" = the spectrum suddenly changed more than usual
  const isOnset =
    painting &&
    punch > SENSITIVITY &&
    f.flux > 0.015 &&
    f.rms > f.gate &&
    now - lastOnset > MIN_GAP_MS;
  if (painting) fluxAvg = fluxAvg * 0.9 + f.flux * 0.1;

  if (isOnset) {
    lastOnset = now;
    endStroke(liveStroke);
    liveStroke = createStroke(f, punch);
    strokes.push(liveStroke);
    startMark(liveStroke, f);
    strokeCount++;
    dirty = true;
    brushesUsed.add(liveStroke.brush);
    updatePlacard();
  } else if (liveStroke && f.rms < f.gate * 0.8) {
    endStroke(liveStroke); // sound stopped or paused, so lift the brush
    liveStroke = null;
  }

  strokes = strokes.filter(s => stepStroke(s, f, s === liveStroke));
  if (liveStroke && liveStroke.fade >= 0) liveStroke = null;
}

// =====================================================================
// Desktop wheels (hold B or C)
// =====================================================================
const NS = 'http://www.w3.org/2000/svg';
const wheels = {};
let wheelState = null;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

function wheelPoint(r, a) {
  return [150 + r * Math.cos(a), 150 + r * Math.sin(a)];
}

function arcPath(r0, r1, a0, a1) {
  const [x1, y1] = wheelPoint(r1, a0);
  const [x2, y2] = wheelPoint(r1, a1);
  const [x3, y3] = wheelPoint(r0, a1);
  const [x4, y4] = wheelPoint(r0, a0);
  return `M${x1} ${y1}A${r1} ${r1} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 0 0 ${x4} ${y4}Z`;
}

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent.appendChild(el);
  return el;
}

function buildWheel(type) {
  const isBrush = type === 'brush';
  const items = isBrush ? BRUSHES : PALETTES;
  const div = document.createElement('div');
  div.className = 'wheel';
  div.hidden = true;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 300 300');
  div.appendChild(svg);
  document.body.appendChild(div);

  const n = items.length;
  const step = (2 * Math.PI) / n;
  const segs = [];

  items.forEach((item, i) => {
    const a0 = -Math.PI / 2 + i * step - step / 2 + 0.012;
    const a1 = a0 + step - 0.024;
    const mid = (a0 + a1) / 2;
    const g = svgEl('g', {}, svg);
    const path = svgEl('path', { d: arcPath(56, 134, a0, a1), fill: '#f6f4ef', stroke: '#e0dcd2', 'stroke-width': 1 }, g);
    const texts = [];

    if (isBrush) {
      const [x, y] = wheelPoint(96, mid);
      const t = svgEl('text', {
        x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': 'Inter, sans-serif', 'font-size': 11, fill: '#1f1f1f'
      }, g);
      t.textContent = item.label;
      texts.push(t);
    } else {
      const tx = -Math.sin(mid);
      const ty = Math.cos(mid);
      [0, 2, 4].forEach((c, k) => {
        const [x, y] = wheelPoint(95, mid);
        const o = (k - 1) * 11;
        svgEl('circle', { cx: x + tx * o, cy: y + ty * o, r: 5, fill: item.colors[c], stroke: '#d3cfc4', 'stroke-width': 0.8 }, g);
      });
    }
    segs.push({ path, texts, mid });
  });

  svgEl('circle', { cx: 150, cy: 150, r: 52, fill: '#ffffff', stroke: '#e0dcd2' }, svg);
  const nameEl = svgEl('text', {
    x: 150, y: isBrush ? 146 : 142, 'text-anchor': 'middle',
    'font-family': "'Cormorant Garamond', serif", 'font-style': 'italic', 'font-size': 20, fill: '#1f1f1f'
  }, svg);
  const rects = [];
  if (!isBrush) {
    for (let k = 0; k < 5; k++) rects.push(svgEl('rect', { x: 121 + k * 12, y: 152, width: 10, height: 10, rx: 2 }, svg));
  }
  const sub = svgEl('text', {
    x: 150, y: isBrush ? 166 : 178, 'text-anchor': 'middle',
    'font-family': 'Inter, sans-serif', 'font-size': 11, fill: '#6b6b6b'
  }, svg);
  sub.textContent = isBrush ? 'release B' : 'release C';
  const tick = svgEl('path', { fill: '#a3242c' }, svg);

  wheels[type] = { div, segs, step, n, nameEl, rects, tick, items, isBrush, selected: -1 };
}

function highlightWheel(w, i) {
  w.selected = i;
  w.segs.forEach((s, j) => {
    const on = j === i;
    s.path.setAttribute('fill', on ? '#1f1f1f' : '#f6f4ef');
    s.texts.forEach(t => t.setAttribute('fill', on ? '#f6f4ef' : '#1f1f1f'));
  });

  const shown = i >= 0
    ? w.items[i]
    : w.isBrush ? BRUSHES.find(b => b.id === currentBrush) : PALETTES[paletteIndex];
  w.nameEl.textContent = w.isBrush ? shown.label : shown.name;
  if (!w.isBrush) w.rects.forEach((r, k) => r.setAttribute('fill', shown.colors[k]));

  if (i >= 0) {
    const m = w.segs[i].mid;
    w.tick.setAttribute('d', arcPath(137, 142, m - w.step / 2 + 0.03, m + w.step / 2 - 0.03));
  } else {
    w.tick.setAttribute('d', '');
  }
}

function openWheel() {
  if (!wheelState) return;
  const w = wheels[wheelState.type];
  const x = clamp(mouseX, 160, window.innerWidth - 160);
  const y = clamp(mouseY, 160, window.innerHeight - 160);
  wheelState.cx = x;
  wheelState.cy = y;
  wheelState.opened = true;
  w.div.style.left = x + 'px';
  w.div.style.top = y + 'px';
  w.div.hidden = false;
  highlightWheel(w, -1);
}

// Pick by direction from the center, so a quick flick is enough
function updateWheelSelection() {
  const w = wheels[wheelState.type];
  const dx = mouseX - wheelState.cx;
  const dy = mouseY - wheelState.cy;
  if (Math.hypot(dx, dy) < 24) {
    if (w.selected !== -1) highlightWheel(w, -1);
    return;
  }
  const angle = Math.atan2(dy, dx);
  const idx = ((Math.round((angle + Math.PI / 2) / w.step) % w.n) + w.n) % w.n;
  if (idx !== w.selected) highlightWheel(w, idx);
}

function closeWheel(apply) {
  if (!wheelState) return;
  clearTimeout(wheelState.timer);
  const w = wheels[wheelState.type];
  if (wheelState.opened) {
    if (apply && w.selected >= 0) {
      if (w.isBrush) setBrush(BRUSHES[w.selected].id, true);
      else setPalette(w.selected, true);
    }
    w.div.hidden = true;
  }
  wheelState = null;
}

// =====================================================================
// Overlays: guide, mobile sheet, swipe hint
// =====================================================================
function openGuide() {
  guideOverlay.hidden = false;
  guideClose.focus();
}

function closeGuide() {
  guideOverlay.hidden = true;
}

function openSheet() {
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  sheetBackdrop.hidden = false;
}

function closeSheet() {
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  sheetBackdrop.hidden = true;
}

function overlayOpen() {
  return !guideOverlay.hidden || !viewer.hidden || !confirmModal.hidden || sheet.classList.contains('open');
}

function maybeShowSwipeHint() {
  if (load('hueverb-swipe-hint') === '1') return;
  if (!window.matchMedia('(max-width: 899px)').matches) return;
  swipeHint.classList.add('show');
  setTimeout(dismissSwipeHint, 6000);
}

function dismissSwipeHint() {
  swipeHint.classList.remove('show');
  store('hueverb-swipe-hint', '1');
}

let touchStart = null;
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
}, { passive: true });

canvas.addEventListener('touchend', e => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const quick = Date.now() - touchStart.time < 600;
  if (quick && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    stepBrush(dx < 0 ? 1 : -1); // swipe left = next brush, right = previous
    dismissSwipeHint();
  }
  touchStart = null;
});

// =====================================================================
// Controls
// =====================================================================
// Entrance
enterBtn.addEventListener('click', () => showEntranceStep('guide'));
beginBtn.addEventListener('click', () => {
  if (skipEntrance.checked) store('hueverb-skip-entrance', '1');
  go('studio');
});

// Rooms
document.querySelectorAll('[data-view]').forEach(b =>
  b.addEventListener('click', () => go(b.dataset.view))
);
guideBtn.addEventListener('click', openGuide);
guideClose.addEventListener('click', closeGuide);
mbHelp.addEventListener('click', openGuide);

// Sound
micBtn.addEventListener('click', toggleMic);
mbMic.addEventListener('click', toggleMic);
trackBtn.addEventListener('click', toggleTrack);
mbTrack.addEventListener('click', toggleTrack);

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadTrack(e.target.files[0]);
  e.target.value = ''; // allows re-uploading the same song
});

uploadBtn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

// Canvas
clearBtn.addEventListener('click', () => startNewCanvas());
saveBtn.addEventListener('click', acquire);

function onSizeInput(e) {
  brushSize = parseFloat(e.target.value);
  sizeSlider.value = e.target.value;
  sizeSliderM.value = e.target.value;
}
sizeSlider.addEventListener('input', onSizeInput);
sizeSliderM.addEventListener('input', onSizeInput);

mbPalette.addEventListener('click', openSheet);
sheetDone.addEventListener('click', closeSheet);
sheetBackdrop.addEventListener('click', closeSheet);

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (wheelState && wheelState.opened) updateWheelSelection();
});

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (dialogResolve) dialogResolve('cancel');
    else if (!viewer.hidden) closeViewer();
    else if (!guideOverlay.hidden) closeGuide();
    else closeSheet();
    closeWheel(false);
    return;
  }

  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // ? opens or closes the guide from the studio or collection
  if (e.key === '?' && !views.entrance.classList.contains('active')) {
    if (guideOverlay.hidden) openGuide();
    else closeGuide();
    return;
  }

  // painting shortcuts only work in the studio with nothing on top
  if (!views.studio.classList.contains('active') || overlayOpen()) return;

  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); stepBrush(1); return;
    case 'ArrowLeft': e.preventDefault(); stepBrush(-1); return;
    case 'ArrowDown': e.preventDefault(); stepPalette(1); return;
    case 'ArrowUp': e.preventDefault(); stepPalette(-1); return;
  }

  const k = e.key.toLowerCase();
  if ((k === 'b' || k === 'c') && !e.repeat && !wheelState) {
    wheelState = { type: k === 'b' ? 'brush' : 'palette', key: k, opened: false };
    wheelState.timer = setTimeout(openWheel, 160); // only open if the key is held
  }
});

document.addEventListener('keyup', e => {
  if (!wheelState || e.key.toLowerCase() !== wheelState.key) return;
  if (!wheelState.opened) {
    // quick tap: swap back to the previous brush or palette
    const type = wheelState.type;
    closeWheel(false);
    if (type === 'brush') setBrush(prevBrush, true);
    else setPalette(prevPalette, true);
  } else {
    closeWheel(true);
  }
});

window.addEventListener('blur', () => closeWheel(false));

// Warn before leaving with an unsaved painting
window.addEventListener('beforeunload', e => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// =====================================================================
// Start
// =====================================================================
const guideTemplate = $('guideTemplate');
document.querySelectorAll('[data-guide]').forEach(el => el.appendChild(guideTemplate.content.cloneNode(true)));

buildPickers();
buildWheel('brush');
buildWheel('palette');
setupCanvas();
refreshAll();
route();
draw();