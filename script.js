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

let style = {};
let bassAvg = 0;
let pulse = 0;

// ---------- Style ----------
// Gives each new song its own visual personality
function newStyle() {
  const symmetryOptions = [3, 4, 5, 6, 7, 8, 10, 12];
  style = {
    symmetry: symmetryOptions[Math.floor(Math.random() * symmetryOptions.length)],
    baseHue: Math.random() * 360,           // starting color
    hueRange: 120 + Math.random() * 200,    // how wide the palette is
    twist: Math.random() * 0.06 - 0.03,     // spiral curve (0 = straight spokes)
    direction: Math.random() < 0.5 ? 1 : -1 // spin clockwise or counter
  };
  hueShift = 0;
}

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
    newStyle();
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
  newStyle();
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

  // --- Beat detection: compare current bass to its recent average ---
  let bass = 0;
  for (let i = 0; i < 6; i++) bass += dataArray[i];
  bass /= 6 * 255;
  bassAvg = bassAvg * 0.95 + bass * 0.05;

  if (bass > bassAvg * 1.3 && bass > 0.45 && pulse < 0.1) {
    pulse = 1;        // trigger a pulse
    hueShift += 25;   // jump to a new color on the beat
  }
  pulse *= 0.9;       // pulse fades out smoothly

  // --- Draw the frequency bands ---
  let energy = 0;
  for (let i = 0; i < BANDS; i++) {
    const v = dataArray[i * step] / 255; // loudness 0–1
    energy += v;
    if (v < 0.08) continue; // skip near-silence

    const r = innerR + (i / BANDS) * (outerR - innerR) + v * 12 + pulse * 15;
    const hue = style.baseHue + (i / BANDS) * style.hueRange + hueShift;
    const dot = 0.6 + v * 3.5 + pulse * 2;

    ctx.fillStyle = `hsla(${hue % 360}, 85%, 60%, ${0.08 + v * 0.35})`;

    for (let k = 0; k < style.symmetry; k++) {
      const a = angle + i * style.twist + (k * Math.PI * 2) / style.symmetry;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // louder music = faster rotation and color drift
  const avg = energy / BANDS;
  angle += (0.002 + avg * 0.01) * style.direction;
  hueShift += avg * 0.5;
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