// =====================================================================
// audio.js — microphone, tracks, and turning sound into features
// =====================================================================
import { $, clamp, titleFromFile } from './utils.js';
import { PITCH_BANDS, SENSITIVITY, MIN_GAP_MS } from './config.js';
import { state, isPainting } from './state.js';
import { endStroke } from './strokes.js';
import { refreshAll, setStatusText, maybeShowSwipeHint } from './ui.js';

const fileInput = $('fileInput');

let freqData, prevFreq, timeData, bandEdges, maxBin;

// running measurements that adapt to each song or room
let fluxAvg = 0;
let noiseFloor = 0.01;
let peakRms = 0.05;
let pitchLo = 0.4;
let pitchHi = 0.6;
let lastOnset = 0;

// what the painter "hears" when nothing is playing
export const SILENCE = { rms: 0, gate: 1, flux: 0, punch: 0, pitch: 0.5, loud: 0, roughness: 0, onset: false };

function ensureAudio() {
  if (!state.audioCtx) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
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

    state.audioCtx = audioCtx;
    state.analyser = analyser;
  }
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
}

function resetTracking() {
  fluxAvg = 0;
  noiseFloor = 0.01;
  peakRms = 0.05;
  pitchLo = 0.4;
  pitchHi = 0.6;
  prevFreq.fill(0);
  endStroke(state.liveStroke);
  state.liveStroke = null;
}

// ---------- Microphone (can run alone or together with a track) ----------
export async function toggleMic() {
  if (state.micStream) stopMic();
  else await startMic();
}

async function startMic() {
  try {
    ensureAudio();
    if (!isPainting()) resetTracking();
    // turn off voice-call filters so claps, hums, and music come through naturally
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    state.micSource = state.audioCtx.createMediaStreamSource(state.micStream);
    state.micSource.connect(state.analyser); // not to speakers, to avoid feedback
    state.voiceUsed = true;
    refreshAll();
    maybeShowSwipeHint();
  } catch (err) {
    refreshAll();
    setStatusText('Microphone access was blocked');
    console.error(err);
  }
}

function stopMic() {
  if (state.micSource) state.micSource.disconnect();
  if (state.micStream) state.micStream.getTracks().forEach(t => t.stop()); // turns off the mic indicator
  state.micStream = null;
  state.micSource = null;
  refreshAll();
}

// ---------- Tracks (can run alone or together with the mic) ----------
export function loadTrack(file) {
  ensureAudio();
  if (state.trackEl) {
    state.trackEl.pause();
    state.trackSource.disconnect();
    URL.revokeObjectURL(state.trackEl.src);
  }
  if (!state.micStream) resetTracking();

  const trackEl = new Audio(URL.createObjectURL(file));
  state.trackEl = trackEl;
  state.trackSource = state.audioCtx.createMediaElementSource(trackEl);
  state.trackSource.connect(state.analyser);
  state.trackSource.connect(state.audioCtx.destination); // so you can hear it
  state.trackTitle = titleFromFile(file.name);
  state.trackEnded = false;

  trackEl.addEventListener('play', refreshAll);
  trackEl.addEventListener('pause', refreshAll);
  trackEl.addEventListener('ended', () => {
    state.trackEnded = true;
    refreshAll();
  });

  trackEl.play();
  refreshAll();
  maybeShowSwipeHint();
}

export function toggleTrack() {
  if (!state.trackEl) {
    fileInput.click();
    return;
  }
  if (state.trackEl.paused) {
    ensureAudio();
    state.trackEnded = false;
    state.trackEl.play();
  } else {
    state.trackEl.pause();
  }
}

// ---------- Listening: turn raw audio into features ----------
export function analyze(now) {
  const { analyser } = state;
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

  // A "new sound" = the spectrum suddenly changed more than usual
  const punch = flux / (fluxAvg + 0.0001);
  const onset = punch > SENSITIVITY && flux > 0.015 && rms > gate && now - lastOnset > MIN_GAP_MS;
  if (onset) lastOnset = now;
  fluxAvg = fluxAvg * 0.9 + flux * 0.1;

  return {
    rms,
    gate,
    flux,
    punch,                                        // how much bigger this change is than usual
    pitch,                                        // 0 = low, 1 = high (relative to this song)
    loud: clamp(rms / peakRms, 0, 1),             // 0 = quiet, 1 = loudest so far
    roughness: clamp((zcr - 0.02) / 0.15, 0, 1),  // 0 = smooth tone, 1 = noisy/hissy
    onset                                         // true when a new stroke should start
  };
}