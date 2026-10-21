// ---------- Elements ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const micBtn = document.getElementById('micBtn');
const fileInput = document.getElementById('fileInput');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// ---------- Settings you can tweak ----------
const PAPER = '#f3eee4';        // canvas background color
const SENSITIVITY = 1.6;        // lower = more strokes, higher = fewer (try 1.3–2.2)
const MIN_GAP_MS = 120;         // minimum time between new strokes
const MAX_STROKE_FRAMES = 240;  // longest a single stroke can flow (~4 seconds)
const BRISTLES = 26;            // number of "hairs" in each brush

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
let size = 600;
let scale = 1;
let style = {};
let strokes = [];
let liveStroke = null;
let strokeCount = 0;
let sourceLabel = 'Choose a sound source to begin';

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

function mix(c1, c2, t) {
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
}

// Pick a palette color based on pitch, with some randomness for variety
function pickColor(pitch) {
  const p = style.colors;
  const idx = clamp(Math.round(pitch * (p.length - 1) + (Math.random() - 0.5) * 1.5), 0, p.length - 1);
  return p[idx];
}

// Slightly lighter or darker version of a color, for natural streaks
function varyColor(rgb, amount) {
  const v = (Math.random() - 0.5) * amount;
  const c = v > 0 ? mix(rgb, [255, 255, 255], v) : mix(rgb, [0, 0, 0], -v);
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// ---------- Style ----------
function newStyle() {
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  style = { name: palette.name, colors: palette.colors.map(hexToRgb) };
}

// ---------- Canvas setup ----------
function setupCanvas() {
  size = Math.min(window.innerWidth - 32, 700);
  scale = size / 600;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clearCanvas();
}

function clearCanvas() {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  addPaperGrain();
  strokes = [];
  liveStroke = null;
  strokeCount = 0;
}

// Tiny light and dark specks so the canvas feels like real paper
function addPaperGrain() {
  const specks = Math.floor((size * size) / 25);
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
}

function updateStatus() {
  statusEl.textContent = `${sourceLabel} · 🎨 ${strokeCount} strokes · ${style.name} palette`;
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
    newStyle();
    resetTracking();
    // turn off voice-call filters so claps, hums, and music come through naturally
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser); // not to speakers, to avoid feedback
    sourceLabel = '🎤 Listening';
    updateStatus();
  } catch (err) {
    statusEl.textContent = 'Microphone access was blocked.';
    console.error(err);
  }
}

function startFile(file) {
  ensureAudio();
  stopCurrentSource();
  newStyle();
  resetTracking();
  audioEl = new Audio(URL.createObjectURL(file));
  source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  source.connect(audioCtx.destination); // so you can hear it
  audioEl.play();
  sourceLabel = `🎵 ${file.name}`;
  updateStatus();
  audioEl.onended = () => {
    sourceLabel = '✅ Done! Save your painting';
    updateStatus();
  };
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

// ---------- Brush strokes ----------
function createStroke(f) {
  const margin = size * 0.1;
  const x = margin + Math.random() * (size - margin * 2);
  // high sounds start near the top, low sounds near the bottom
  const y = clamp(
    size * (0.85 - f.pitch * 0.7) + (Math.random() - 0.5) * size * 0.3,
    margin, size - margin
  );

  const base = pickColor(f.pitch);
  const load = 0.6 + f.loud * 0.4; // louder sounds load more paint onto the brush

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

  return {
    x, y,
    base,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.06,
    roughness: f.roughness,
    width: 0,
    age: 0,
    fade: -1,   // -1 = alive; otherwise counts down to 0
    bristles
  };
}

function endStroke(s) {
  if (s && s.fade < 0) s.fade = 12; // lift the brush gradually
}

// Paint splatter, only for sharp or noisy sounds (claps, "ssss", cymbals)
function splat(s, f) {
  const drops = Math.floor(f.loud * 4 + f.roughness * 10);
  for (let i = 0; i < drops; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() ** 2 * (15 + f.loud * 45) * scale;
    const r = (0.6 + Math.random() * (0.8 + f.loud * 2.5)) * scale;
    ctx.fillStyle = varyColor(s.base, 0.3);
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Move the brush one step and paint it. Returns false when the stroke is finished.
function stepStroke(s, f, isLive) {
  s.age++;

  // width follows loudness while the sound lasts, then tapers off
  if (s.fade >= 0) {
    s.width *= 0.85;
    if (s.fade > 0) s.fade--;
  } else {
    const target = (4 + f.loud * 30) * scale * Math.min(1, s.age / 5);
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

  const speed = (1.5 + (isLive ? f.loud : 0.3) * 5) * scale;
  s.x += Math.cos(s.angle) * speed;
  s.y += Math.sin(s.angle) * speed;

  // paint each bristle
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

  // end the stroke when it's too long or every bristle has run dry
  if (s.age > MAX_STROKE_FRAMES || s.bristles.every(b => b.paint <= 0)) endStroke(s);
  return s.fade !== 0;
}

// ---------- Main loop ----------
function draw() {
  requestAnimationFrame(draw);
  if (!analyser || !source) return;

  const f = analyze();
  const now = performance.now();

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
    splat(liveStroke, f);
    strokeCount++;
    updateStatus();
  } else if (liveStroke && f.rms < f.gate * 0.8) {
    endStroke(liveStroke); // sound stopped, so lift the brush
    liveStroke = null;
  }

  strokes = strokes.filter(s => stepStroke(s, f, s === liveStroke));
  if (liveStroke && liveStroke.fade >= 0) liveStroke = null;
}

// ---------- Buttons ----------
micBtn.addEventListener('click', startMic);
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) startFile(e.target.files[0]);
  e.target.value = ''; // allows re-uploading the same song
});
clearBtn.addEventListener('click', () => {
  newStyle();
  clearCanvas();
  updateStatus();
});
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'hueverb.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

newStyle();
setupCanvas();
updateStatus();
draw();