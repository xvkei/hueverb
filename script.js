// ---------- Elements ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const micBtn = document.getElementById('micBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const brushPicker = document.getElementById('brushPicker');
const palettePicker = document.getElementById('palettePicker');
const sizeSlider = document.getElementById('sizeSlider');
const plTitle = document.getElementById('plTitle');
const plMedium = document.getElementById('plMedium');
const plStrokes = document.getElementById('plStrokes');
const plTime = document.getElementById('plTime');
const plPalette = document.getElementById('plPalette');

// ---------- Settings you can tweak ----------
const PAPER = '#f3eee4';        // canvas background color
const SENSITIVITY = 1.6;        // lower = more strokes, higher = fewer (try 1.3–2.2)
const MIN_GAP_MS = 120;         // minimum time between new strokes
const MAX_STROKE_FRAMES = 240;  // longest a single stroke can flow (~4 seconds)
const BRISTLES = 26;            // number of "hairs" in the oil brush
const LOGICAL = 1000;           // drawing coordinates (0–1000), independent of screen size
const RESOLUTION = 1600;        // actual pixels; CSS scales the canvas to fit any screen

const BRUSHES = [
  { id: 'auto',       label: 'Auto',       hint: 'Let the sound choose the brush' },
  { id: 'bristle',    label: 'Oil',        hint: 'Bristle brush with dry, streaky edges' },
  { id: 'watercolor', label: 'Watercolor', hint: 'Soft, see-through washes' },
  { id: 'ink',        label: 'Ink',        hint: 'Calligraphy pen, thick and thin' },
  { id: 'spray',      label: 'Dots',       hint: 'Pointillism: strokes made of dots' }
];

// How each brush is named on the placard's "medium" line
const MEDIUM_NAMES = { bristle: 'oil', watercolor: 'watercolor', ink: 'ink', spray: 'pigment dots' };

// Artist-inspired palettes: deep colors first (low sounds), bright last (high sounds)
const PALETTES = [
  { name: 'Kandinsky', colors: ['#1d3557', '#111111', '#e63946', '#2a9d8f', '#f1c453'] },
  { name: 'Monet',     colors: ['#2d4a7a', '#5b8bb5', '#7fa886', '#d98c7a', '#e8c27a'] },
  { name: 'Matisse',   colors: ['#0b3d91', '#ef476f', '#ff6f3c', '#06a77d', '#ffd166'] },
  { name: 'Ukiyo-e',   colors: ['#1b2a49', '#2f5d7c', '#6b8f9c', '#b5442c', '#d9a441'] },
  { name: 'Sunset',    colors: ['#3d1e6d', '#8b3fa8', '#e8577e', '#f99e4c', '#f9c74f'] }
];

// ---------- State ----------
let audioCtx, analyser, freqData, prevFreq, timeData, maxBin;
let source = null;
let audioEl = null;
let micStream = null;
const size = LOGICAL;
const scale = LOGICAL / 600;
let strokes = [];
let liveStroke = null;
let strokeCount = 0;

let currentBrush = 'auto';
let paletteIndex = 0;
let brushSize = 1;

// placard
let pieceTitle = 'Untitled';
let brushesUsed = new Set();
let paintSeconds = 0;
let lastTick = null;
let shownSecond = -1;

// sound tracking
let fluxAvg = 0;
let noiseFloor = 0.01;
let peakRms = 0.05;
let lastOnset = 0;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

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

// ---------- Placard & status ----------
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ['Sound', 'oil', 'ink'] -> "Sound, oil and ink"
function joinList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function updatePlacard() {
  plTitle.textContent = pieceTitle;
  const media = [...brushesUsed].map(b => MEDIUM_NAMES[b]);
  plMedium.textContent = `${joinList(['Sound', ...media])} on paper, ${new Date().getFullYear()}`;
  plStrokes.textContent = `${strokeCount} ${strokeCount === 1 ? 'stroke' : 'strokes'}`;
  plTime.textContent = formatTime(paintSeconds);
  plPalette.textContent = `${PALETTES[paletteIndex].name} palette`;
}

function setStatus(text, live) {
  statusText.textContent = text;
  statusDot.classList.toggle('live', live);
}

// "my_song-final.mp3" -> "my song final"
function titleFromFile(name) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}

// ---------- Brush & palette pickers ----------
function buildPickers() {
  BRUSHES.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'pick';
    btn.textContent = b.label;
    btn.title = `${b.hint} (key ${i + 1})`;
    btn.dataset.id = b.id;
    btn.addEventListener('click', () => setBrush(b.id));
    brushPicker.appendChild(btn);
  });

  PALETTES.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'pick';
    btn.title = p.name;
    btn.dataset.index = i;
    btn.innerHTML =
      p.colors.map(c => `<span class="swatch" style="background:${c}"></span>`).join('') +
      `<span class="pick-name">${p.name}</span>`;
    btn.addEventListener('click', () => setPalette(i));
    palettePicker.appendChild(btn);
  });

  refreshPickers();
}

function refreshPickers() {
  brushPicker.querySelectorAll('.pick').forEach(b =>
    b.classList.toggle('active', b.dataset.id === currentBrush)
  );
  palettePicker.querySelectorAll('.pick').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.index) === paletteIndex)
  );
}

function setBrush(id) {
  currentBrush = id;
  refreshPickers();
}

function setPalette(i) {
  paletteIndex = i;
  refreshPickers();
  updatePlacard();
}

// ---------- Canvas setup ----------
// The canvas always paints at the same resolution; CSS scales it to fit the screen,
// so resizing or rotating the device never clears or distorts the painting.
function setupCanvas() {
  canvas.width = RESOLUTION;
  canvas.height = RESOLUTION;
  ctx.setTransform(RESOLUTION / LOGICAL, 0, 0, RESOLUTION / LOGICAL, 0, 0);
  clearCanvas();
}

function clearCanvas() {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  addPaperGrain();
  strokes = [];
  liveStroke = null;
  strokeCount = 0;
  brushesUsed.clear();
  paintSeconds = 0;
  shownSecond = -1;
  updatePlacard();
}

// Tiny light and dark specks so the canvas feels like real paper
function addPaperGrain() {
  const specks = Math.floor((size * size) / 40);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
}

// ---------- Audio setup ----------
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.5;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    prevFreq = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Float32Array(analyser.fftSize);
    const binHz = audioCtx.sampleRate / analyser.fftSize;
    maxBin = Math.min(freqData.length, Math.floor(8000 / binHz)); // focus on 0–8kHz
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function stopCurrentSource() {
  if (source) source.disconnect();
  if (audioEl) { audioEl.pause(); audioEl = null; }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  source = null;
  micBtn.classList.remove('active');
}

function resetTracking() {
  fluxAvg = 0;
  noiseFloor = 0.01;
  peakRms = 0.05;
  prevFreq.fill(0);
  endStroke(liveStroke);
  liveStroke = null;
}

async function startMic() {
  try {
    ensureAudio();
    stopCurrentSource();
    resetTracking();
    // turn off voice-call filters so claps, hums, and music come through naturally
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser); // not to speakers, to avoid feedback
    micBtn.classList.add('active');
    pieceTitle = 'Untitled (live study)';
    updatePlacard();
    setStatus('Listening. Clap, hum, whistle, or play something', true);
  } catch (err) {
    setStatus('Microphone access was blocked', false);
    console.error(err);
  }
}

function startFile(file) {
  ensureAudio();
  stopCurrentSource();
  resetTracking();
  audioEl = new Audio(URL.createObjectURL(file));
  source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  source.connect(audioCtx.destination); // so you can hear it
  audioEl.play();
  pieceTitle = titleFromFile(file.name);
  updatePlacard();
  setStatus('Now painting', true);
  audioEl.onended = () => setStatus('Finished. Acquire your piece', false);
}

function isPainting() {
  return !!micStream || (audioEl && !audioEl.paused);
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

  // Pitch (spectral centroid) and flux (how suddenly the sound changed)
  const binHz = audioCtx.sampleRate / analyser.fftSize;
  let weighted = 0;
  let total = 0;
  let flux = 0;
  for (let i = 2; i < maxBin; i++) {
    const m = freqData[i];
    const w = m * m;
    weighted += w * i * binHz;
    total += w;
    const d = m - prevFreq[i];
    if (d > 0) flux += d;
    prevFreq[i] = m;
  }
  flux /= maxBin * 255;
  const centroid = total > 0 ? weighted / total : 100;
  const pitch = clamp(
    (Math.log2(Math.max(centroid, 1)) - Math.log2(100)) / (Math.log2(5000) - Math.log2(100)),
    0, 1
  );

  // Adapt to the room's background noise and the overall volume
  if (rms < noiseFloor) noiseFloor = rms;
  else noiseFloor += (rms - noiseFloor) * 0.00005;
  peakRms = Math.max(rms, peakRms * 0.9995, 0.02);
  const gate = Math.min(Math.max(0.008, noiseFloor * 2), peakRms * 0.3);

  return {
    rms,
    gate,
    flux,
    pitch,                                        // 0 = low, 1 = high
    loud: clamp(rms / peakRms, 0, 1),             // 0 = quiet, 1 = loudest so far
    roughness: clamp((zcr - 0.02) / 0.15, 0, 1)   // 0 = smooth tone, 1 = noisy/hissy
  };
}

// ---------- Creating strokes ----------
// In Auto mode, the character of the sound picks the brush
function chooseBrush(f) {
  if (currentBrush !== 'auto') return currentBrush;
  if (f.roughness > 0.45) return 'spray';   // hissy/noisy -> dots
  if (f.pitch > 0.62) return 'ink';         // high -> fine ink lines
  if (f.loud < 0.45) return 'watercolor';   // soft -> washes
  return 'bristle';                         // everything else -> oil
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

function createStroke(f) {
  const margin = size * 0.1;
  const x = margin + Math.random() * (size - margin * 2);
  // high sounds start near the top, low sounds near the bottom
  const y = clamp(
    size * (0.85 - f.pitch * 0.7) + (Math.random() - 0.5) * size * 0.3,
    margin, size - margin
  );

  const brush = chooseBrush(f);
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

  if (brush === 'bristle') s.bristles = makeBristles(x, y, base, f);
  if (brush === 'watercolor') { s.color = rgbStr(base); s.wet = 1; }
  if (brush === 'ink') { s.color = rgbStr(mix(base, [0, 0, 0], 0.25)); s.hx = 0; s.hy = 0; }
  if (brush === 'spray') {
    s.dotColors = [varyColor(base, 0.3), varyColor(base, 0.3), rgbStr(pickColor(f.pitch))];
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

  // splatter, mostly for sharp or noisy sounds
  const drops = Math.floor(f.loud * 4 + f.roughness * 10);
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

const RENDERERS = {
  bristle: paintBristles,
  watercolor: paintWatercolor,
  ink: paintInk,
  spray: paintSpray
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

  // smooth, gestural curves, with a little shake for noisy sounds
  s.turn = clamp(s.turn + (Math.random() - 0.5) * 0.006, -0.05, 0.05);
  s.angle += s.turn + (Math.random() - 0.5) * s.roughness * 0.5;

  // steer back toward the middle near the edges
  const margin = size * 0.08;
  if (s.x < margin || s.x > size - margin || s.y < margin || s.y > size - margin) {
    const toCenter = Math.atan2(size / 2 - s.y, size / 2 - s.x);
    const diff = Math.atan2(Math.sin(toCenter - s.angle), Math.cos(toCenter - s.angle));
    s.angle += diff * 0.12;
  }

  s.px = s.x;
  s.py = s.y;
  const speed = (1.5 + (isLive ? f.loud : 0.3) * 5) * scale;
  s.x += Math.cos(s.angle) * speed;
  s.y += Math.sin(s.angle) * speed;

  RENDERERS[s.brush](s);

  if (s.age > MAX_STROKE_FRAMES) endStroke(s);
  return s.fade !== 0;
}

// ---------- Main loop ----------
function draw() {
  requestAnimationFrame(draw);
  const now = performance.now();

  // painting timer for the placard
  if (lastTick !== null && isPainting()) paintSeconds += (now - lastTick) / 1000;
  lastTick = now;
  if (Math.floor(paintSeconds) !== shownSecond) {
    shownSecond = Math.floor(paintSeconds);
    plTime.textContent = formatTime(paintSeconds);
  }

  if (!analyser || !source) return;
  const f = analyze();

  // A "new sound" = the spectrum suddenly changed more than usual
  const isOnset =
    f.flux > fluxAvg * SENSITIVITY &&
    f.flux > 0.015 &&
    f.rms > f.gate &&
    now - lastOnset > MIN_GAP_MS;
  fluxAvg = fluxAvg * 0.9 + f.flux * 0.1;

  if (isOnset) {
    lastOnset = now;
    endStroke(liveStroke);
    liveStroke = createStroke(f);
    strokes.push(liveStroke);
    startMark(liveStroke, f);
    strokeCount++;
    brushesUsed.add(liveStroke.brush);
    updatePlacard();
  } else if (liveStroke && f.rms < f.gate * 0.8) {
    endStroke(liveStroke); // sound stopped, so lift the brush
    liveStroke = null;
  }

  strokes = strokes.filter(s => stepStroke(s, f, s === liveStroke));
  if (liveStroke && liveStroke.fade >= 0) liveStroke = null;
}

// ---------- Controls ----------
micBtn.addEventListener('click', startMic);

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) startFile(e.target.files[0]);
  e.target.value = ''; // allows re-uploading the same song
});

// let keyboard users open the file picker with Enter or Space
uploadBtn.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

clearBtn.addEventListener('click', clearCanvas);

saveBtn.addEventListener('click', () => {
  const slug = pieceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
  const link = document.createElement('a');
  link.download = `hueverb-${slug}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

sizeSlider.addEventListener('input', () => {
  brushSize = parseFloat(sizeSlider.value);
});

// Keyboard shortcuts: 1–5 switch brushes, P cycles palettes
document.addEventListener('keydown', e => {
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= BRUSHES.length) setBrush(BRUSHES[n - 1].id);
  if (e.key.toLowerCase() === 'p') setPalette((paletteIndex + 1) % PALETTES.length);
});

buildPickers();
setupCanvas();
draw();