const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const micBtn = document.getElementById('micBtn');
const fileInput = document.getElementById('fileInput');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

let audioCtx, analyser, dataArray;
let source = null;
let audioEl = null;
let micStream = null;
let size = 600;
let angle = 0;
let hueShift = 0;

const BANDS = 64;      // how many frequency bands we draw
const SYMMETRY = 6;    // number of mirrored "petals"

// ---------- Canvas setup ----------
function setupCanvas() {
  size = Math.min(window.innerWidth - 32, 700);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  clearCanvas();
}

function clearCanvas() {
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, size, size);
}

// ---------- Audio setup ----------
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function stopCurrentSource() {
  if (source) source.disconnect();
  if (audioEl) { audioEl.pause(); audioEl = null; }
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  source = null;
}

async function startMic() {
  try {
    ensureAudio();
    stopCurrentSource();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser); // not to speakers, to avoid feedback
    statusEl.textContent = 'Listening… make some noise!';
  } catch (err) {
    statusEl.textContent = 'Microphone access was blocked.';
    console.error(err);
  }
}

function startFile(file) {
  ensureAudio();
  stopCurrentSource();
  audioEl = new Audio(URL.createObjectURL(file));
  source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  source.connect(audioCtx.destination); // so you can hear it
  audioEl.play();
  statusEl.textContent = `Painting: ${file.name}`;
  audioEl.onended = () => (statusEl.textContent = 'Done! Save your art 💾');
}

// ---------- Drawing loop ----------
function draw() {
  requestAnimationFrame(draw);
  if (!analyser || !source) return;

  analyser.getByteFrequencyData(dataArray);

  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.06;
  const outerR = size * 0.45;
  const step = Math.floor(dataArray.length / BANDS);
  let energy = 0;

  for (let i = 0; i < BANDS; i++) {
    const v = dataArray[i * step] / 255; // loudness 0–1
    energy += v;
    if (v < 0.08) continue; // skip near-silence

    const r = innerR + (i / BANDS) * (outerR - innerR) + v * 12;
    const hue = (i / BANDS) * 280 + hueShift;
    const dot = 0.6 + v * 3.5;

    ctx.fillStyle = `hsla(${hue % 360}, 85%, 60%, ${0.08 + v * 0.35})`;

    for (let k = 0; k < SYMMETRY; k++) {
      const a = angle + i * 0.015 + (k * Math.PI * 2) / SYMMETRY;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // louder music = faster rotation and color drift
  const avg = energy / BANDS;
  angle += 0.002 + avg * 0.01;
  hueShift += avg * 0.5;
}

// ---------- Buttons ----------
micBtn.addEventListener('click', startMic);
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) startFile(e.target.files[0]);
});
clearBtn.addEventListener('click', clearCanvas);
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'hueverb.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

setupCanvas();
draw();