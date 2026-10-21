// =====================================================================
// ui.js — placard, status, pickers, messages, overlays, and renaming
// =====================================================================
import { $, formatTime, joinList, isMobileLayout, store, load } from './utils.js';
import { SIZES, PALETTES } from './config.js';
import { state, currentSize, currentPalette, isTrackPlaying, pieceTitle } from './state.js';
import { BRUSHES, BRUSH_MAP } from './brushes/index.js';

// ---------- Elements ----------
const statusText = $('statusText');
const statusDot = $('statusDot');
const micBtn = $('micBtn');
const trackBtn = $('trackBtn');
const uploadLabel = $('uploadLabel');
const trackProgress = $('trackProgress');
const trackFill = $('trackFill');
const hud = $('hud');
const swipeHint = $('swipeHint');

const plTitle = $('plTitle');
const plMedium = $('plMedium');
const plStrokes = $('plStrokes');
const plTime = $('plTime');
const plDims = $('plDims');
const plPalette = $('plPalette');

const sizeChip = $('sizeChip');
const sizeChipBtn = $('sizeChipBtn');
const sizeChipIcon = $('sizeChipIcon');
const sizeChipLabel = $('sizeChipLabel');
const sizeMenu = $('sizeMenu');

const sizePicker = $('sizePicker');
const brushPicker = $('brushPicker');
const palettePicker = $('palettePicker');

const mbTrack = $('mbTrack');
const mbMic = $('mbMic');
const mbTime = $('mbTime');
const mbNote = $('mbNote');
const mbDots = $('mbDots');
const mbBrushes = $('mbBrushes');
const mbFill = $('mbFill');
const sheet = $('paletteSheet');
const sheetBackdrop = $('sheetBackdrop');
const sheetPalettes = $('sheetPalettes');
const sheetSizes = $('sheetSizes');
const sheetDone = $('sheetDone');

const guideOverlay = $('guideOverlay');
const guideClose = $('guideClose');
const toast = $('toast');
const toastText = $('toastText');
const toastAction = $('toastAction');

// =====================================================================
// Placard & status
// =====================================================================
export function mediumText() {
  const media = [...state.brushesUsed].map(id => BRUSH_MAP[id].medium);
  const parts = ['Sound', ...(state.voiceUsed ? ['voice'] : []), ...media];
  return `${joinList(parts)} on paper, ${new Date().getFullYear()}`;
}

export function updatePlacard() {
  plTitle.textContent = pieceTitle();
  plMedium.textContent = mediumText();
  plStrokes.textContent = `${state.strokeCount} ${state.strokeCount === 1 ? 'stroke' : 'strokes'}`;
  const s = currentSize();
  plDims.textContent = `${s.w} × ${s.h} px`;
  plPalette.textContent = `${currentPalette().name} palette`;
  updateSizeChip();
}

// The "Square · 1:1" label, shown only while the canvas is blank
function updateSizeChip() {
  const s = currentSize();
  const blank = state.strokeCount === 0;
  sizeChip.hidden = !blank;
  if (!blank) closeSizeMenu();
  sizeChipLabel.textContent = `${s.name} · ${s.ratio}`;
  const r = s.w / s.h;
  sizeChipIcon.style.width = (r >= 1 ? 14 : Math.round(14 * r)) + 'px';
  sizeChipIcon.style.height = (r >= 1 ? Math.round(14 / r) : 14) + 'px';
}

export function toggleSizeMenu() {
  const open = sizeMenu.hidden;
  sizeMenu.hidden = !open;
  sizeChipBtn.setAttribute('aria-expanded', String(open));
}

export function closeSizeMenu() {
  sizeMenu.hidden = true;
  sizeChipBtn.setAttribute('aria-expanded', 'false');
}

export function setStatusText(text) {
  statusText.textContent = text;
}

// Updates every button and label that depends on what's playing
export function refreshAll() {
  const playing = isTrackPlaying();
  const listening = !!state.micStream;
  const hasTrack = !!state.trackEl;

  // desktop buttons
  micBtn.textContent = listening ? 'Stop listening' : 'Listen';
  micBtn.classList.toggle('active', listening);
  trackBtn.hidden = !hasTrack;
  trackBtn.textContent = playing ? 'Pause track' : state.trackEnded ? 'Replay track' : 'Play track';
  uploadLabel.textContent = hasTrack ? 'Change track' : 'Upload a track';
  trackProgress.hidden = !hasTrack;

  // mobile buttons
  mbTrack.dataset.state = !hasTrack ? 'none' : playing ? 'playing' : 'paused';
  mbTrack.setAttribute('aria-label', !hasTrack ? 'Add a track' : playing ? 'Pause track' : 'Play track');
  mbMic.classList.toggle('active', listening);
  mbMic.setAttribute('aria-label', listening ? 'Stop listening' : 'Listen');

  // status line
  let text;
  if (playing && listening) text = 'Painting track and voice. Headphones help';
  else if (listening) text = 'Listening. Clap, hum, whistle, or sing';
  else if (playing) text = 'Now painting';
  else if (state.trackEnded) text = 'Finished. Acquire your piece';
  else if (hasTrack) text = 'Paused';
  else text = 'Choose a sound to begin';
  statusText.textContent = text;
  statusDot.classList.toggle('live', playing || listening);

  if (playing && listening) mbNote.textContent = 'Mic on · headphones help';
  else if (listening) mbNote.textContent = 'Mic on';
  else if (hasTrack) mbNote.textContent = playing ? 'Playing' : state.trackEnded ? 'Finished' : 'Paused';
  else mbNote.textContent = 'Add a track or tap the mic';

  updatePlacard();
}

// Called every frame; only touches the page when a value actually changes
let shownSecond = -1;
let lastMbTime = '';

export function updateTimers() {
  const sec = Math.floor(state.paintSeconds);
  if (sec !== shownSecond) {
    shownSecond = sec;
    plTime.textContent = formatTime(state.paintSeconds);
  }

  let timeText;
  if (state.trackEl) {
    const dur = state.trackEl.duration;
    const cur = state.trackEl.currentTime;
    const pct = isFinite(dur) && dur > 0 ? (cur / dur) * 100 : 0;
    trackFill.style.width = pct + '%';
    mbFill.style.width = pct + '%';
    timeText = `${formatTime(cur)} / ${isFinite(dur) ? formatTime(dur) : '0:00'}`;
  } else {
    mbFill.style.width = '0%';
    timeText = formatTime(state.paintSeconds);
  }
  if (timeText !== lastMbTime) {
    lastMbTime = timeText;
    mbTime.textContent = timeText;
  }
}

// ---------- Small messages ----------
let hudTimer = null;
let toastTimer = null;

export function showHud(text) {
  hud.textContent = text;
  hud.classList.add('show');
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => hud.classList.remove('show'), 1200);
}

export function showToast(text, actionLabel, action) {
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
// Layers: overlays that sit on top of the page
// While a layer is open, everything else is "inert", so Tab stays inside
// the layer and clicks behind it are ignored. Closing a layer returns
// focus to whatever opened it.
// =====================================================================
const layers = [];

function updateInert() {
  const top = layers[layers.length - 1];
  for (const child of document.body.children) {
    if (child.tagName === 'SCRIPT' || child.tagName === 'TEMPLATE') continue;
    child.inert = !!top && child !== top.el && !top.keep.includes(child) && child !== toast;
  }
}

// keep: extra elements that must stay clickable (like the sheet's backdrop)
export function openLayer(el, focusEl, keep = []) {
  layers.push({ el, keep, opener: document.activeElement });
  updateInert();
  (focusEl || el).focus();
}

export function closeLayer(el) {
  const i = layers.findIndex(l => l.el === el);
  if (i === -1) return;
  const [layer] = layers.splice(i, 1);
  updateInert();
  if (layer.opener && document.contains(layer.opener)) layer.opener.focus();
}

// =====================================================================
// Renaming
// Turns a title into a text field. onSave receives the new name
// ('' means "use the automatic title").
// =====================================================================
export function startRename({ titleEl, trigger, value, onSave }) {
  if (titleEl.hidden) return; // already editing

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-input';
  input.maxLength = 80;
  input.value = value;
  input.setAttribute('aria-label', 'Artwork title');

  titleEl.hidden = true;
  if (trigger) trigger.hidden = true;
  titleEl.after(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save, refocus) => {
    if (done) return;
    done = true;
    const name = input.value.trim().slice(0, 80);
    input.remove();
    titleEl.hidden = false;
    if (trigger) {
      trigger.hidden = false;
      if (refocus) trigger.focus(); // keyboard users land back on the Rename link
    }
    if (save) onSave(name);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true, true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // cancel the rename without closing the viewer
      finish(false, true);
    }
  });
  input.addEventListener('blur', () => finish(true, false));
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

function makeSizeButton(s, onSizePick) {
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
    if (s.id !== state.sizeId) onSizePick(s.id);
  });
  return btn;
}

// onSizePick is passed in from main.js, so this file doesn't need to know how new canvases start
export function buildPickers({ onSizePick }) {
  SIZES.forEach(s => {
    sizePicker.appendChild(makeSizeButton(s, onSizePick));
    sheetSizes.appendChild(makeSizeButton(s, onSizePick));
    sizeMenu.appendChild(makeSizeButton(s, onSizePick));
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

export function refreshPickers() {
  document.querySelectorAll('[data-brush]').forEach(b =>
    b.classList.toggle('active', b.dataset.brush === state.brush)
  );
  document.querySelectorAll('[data-palette]').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.palette) === state.paletteIndex)
  );
  document.querySelectorAll('[data-size]').forEach(b =>
    b.classList.toggle('active', b.dataset.size === state.sizeId)
  );

  // the mobile palette button shows 3 dots of the current palette
  const c = currentPalette().colors;
  mbDots.innerHTML = [c[0], c[2], c[4]].map(col => `<span style="background:${col}"></span>`).join('');

  // keep the active brush visible in the mobile strip
  if (isMobileLayout() && document.body.classList.contains('view-studio')) {
    const active = mbBrushes.querySelector('.pick.active');
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
}

export function setBrush(id, announce = false) {
  if (id !== state.brush) {
    state.prevBrush = state.brush;
    state.brush = id;
  }
  refreshPickers();
  if (announce) {
    const i = BRUSHES.findIndex(b => b.id === id);
    showHud(`${BRUSHES[i].label} · ${i + 1} of ${BRUSHES.length}`);
  }
}

export function setPalette(i, announce = false) {
  if (i !== state.paletteIndex) {
    state.prevPalette = state.paletteIndex;
    state.paletteIndex = i;
  }
  refreshPickers();
  updatePlacard();
  if (announce) showHud(`${PALETTES[i].name} · ${i + 1} of ${PALETTES.length}`);
}

export function stepBrush(dir) {
  const i = BRUSHES.findIndex(b => b.id === state.brush);
  setBrush(BRUSHES[(i + dir + BRUSHES.length) % BRUSHES.length].id, true);
}

export function stepPalette(dir) {
  setPalette((state.paletteIndex + dir + PALETTES.length) % PALETTES.length, true);
}

// =====================================================================
// Guide overlay, mobile sheet, swipe hint
// =====================================================================
export function openGuide() {
  if (!guideOverlay.hidden) return;
  guideOverlay.hidden = false;
  openLayer(guideOverlay, guideClose);
}

export function closeGuide() {
  if (guideOverlay.hidden) return;
  guideOverlay.hidden = true;
  closeLayer(guideOverlay);
}

export function openSheet() {
  if (sheet.classList.contains('open')) return;
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  sheetBackdrop.hidden = false;
  openLayer(sheet, sheet.querySelector('.pick.active') || sheetDone, [sheetBackdrop]);
}

export function closeSheet() {
  if (!sheet.classList.contains('open')) return;
  sheet.classList.remove('open');
  sheet.setAttribute('aria-hidden', 'true');
  sheetBackdrop.hidden = true;
  closeLayer(sheet);
}

export function maybeShowSwipeHint() {
  if (load('hueverb-swipe-hint') === '1' || !isMobileLayout()) return;
  swipeHint.classList.add('show');
  setTimeout(dismissSwipeHint, 6000);
}

export function dismissSwipeHint() {
  swipeHint.classList.remove('show');
  store('hueverb-swipe-hint', '1');
}