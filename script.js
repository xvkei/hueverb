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
const BRISTLES = 7;             // number of "hairs" in each brush stroke

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
let sourceLabel = '';

// sound tracking
let fluxAvg = 0;
let noiseFloor = 0.01;
let peakRms = 0.05;
let lastOnset = 0;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ---------- Style ----------
// Each new song (or Clear) gets its own color palette
function newStyle() {
  style = {
    baseHue: Math.random() * 360,         // color for the lowest sounds
    hueRange: 100 + Math.random() * 140   // how far colors shift for high sounds
  };
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
  strokes = [];
  liveStroke = null;
  strokeCount = 0;
}

function updateStatus() {
  statusEl.textContent = `${sourceLabel} · 🎨 ${strokeCount} strokes`;
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
    sourceLabel = '🎤 Listening… clap, hum, whistle, talk';
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
    size * (0.85 - f.pitch * 0.7) + (Math.random() - 0.5) * size * 0.25,
    margin, size - margin
  );

  const bristles = [];
  for (let i = 0; i < BRISTLES; i++) {
    bristles.push({
      offset: i / (BRISTLES - 1) - 0.5 + (Math.random() - 0.5) * 0.1,
      alpha: 0.5 + Math.random() * 0.4,
      thick: 0.5 + Math.random() * 0.8,
      lx: x,
      ly: y
    });
  }

  return {
    x, y,
    angle: Math.random() * Math.PI * 2,
    turn: (Math.random() - 0.5) * 0.08,
    hue: (style.baseHue + f.pitch * style.hueRange) % 360,
    sat: 60 + Math.random() * 25,
    light: 35 + f.pitch * 25,     // low sounds darker, high sounds lighter
    roughness: f.roughness,
    width: 0,
    age: 0,
    fade: -1,                      // -1 = alive; otherwise counts down to 0
    bristles
  };
}

function endStroke(s) {
  if (s && s.fade < 0) s.fade = 10; // lift the brush gradually
}

// A little paint splatter where each new sound starts
function splat(s, f) {
  const drops = Math.floor(3 + f.loud * 10 + f.roughness * 6);
  for (let i = 0; i < drops; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() ** 2 * (10 + f.loud * 50) * scale;
    const r = (0.5 + Math.random() * (1 + f.loud * 4)) * scale;
    ctx.fillStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${0.4 + Math.random() * 0.5})`;
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
    s.width *= 0.8;
    if (s.fade > 0) s.fade--;
  } else {
    const target = (3 + f.loud * 26) * scale * Math.min(1, s.age / 6);
    s.width += (target - s.width) * 0.3;
  }

  // wander: smooth curves, plus jitter for noisy sounds
  s.turn = clamp(s.turn + (Math.random() - 0.5) * 0.01, -0.07, 0.07);
  s.angle += s.turn + (Math.random() - 0.5) * s.roughness * 0.8;

  // steer back toward the middle near the edges
  const margin = size * 0.08;
  if (s.x < margin || s.x > size - margin || s.y < margin || s.y > size - margin) {
    const toCenter = Math.atan2(size / 2 - s.y, size / 2 - s.x);
    const diff = Math.atan2(Math.sin(toCenter - s.angle), Math.cos(toCenter - s.angle));
    s.angle += diff * 0.15;
  }

  const speed = (1.5 + (isLive ? f.loud : 0.3) * 5) * scale;
  s.x += Math.cos(s.angle) * speed;
  s.y += Math.sin(s.angle) * speed;

  // paint each bristle side by side across the stroke
  const nx = -Math.sin(s.angle);
  const ny = Math.cos(s.angle);
  const jitter = s.roughness * s.width * 0.25;
  ctx.lineCap = 'round';
  for (const b of s.bristles) {
    const bx = s.x + nx * b.offset * s.width + (Math.random() - 0.5) * jitter;
    const by = s.y + ny * b.offset * s.width + (Math.random() - 0.5) * jitter;
    ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${b.alpha})`;
    ctx.lineWidth = Math.max(0.4, (s.width / BRISTLES) * 1.8 * b.thick);
    ctx.beginPath();
    ctx.moveTo(b.lx, b.ly);
    ctx.lineTo(bx, by);
    ctx.stroke();
    b.lx = bx;
    b.ly = by;
  }

  if (s.age > MAX_STROKE_FRAMES) endStroke(s);
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
  clearCanvas();
  newStyle();
});
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'hueverb.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

newStyle();
setupCanvas();
draw();