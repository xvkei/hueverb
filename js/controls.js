// =====================================================================
// controls.js — buttons, keyboard shortcuts, the desktop wheels, and swipes
// =====================================================================
import { $, clamp } from './utils.js';
import { PALETTES } from './config.js';
import { state } from './state.js';
import { canvas } from './canvas.js';
import { BRUSHES } from './brushes/index.js';
import { toggleMic, toggleTrack, loadTrack } from './audio.js';
import { acquire, startNewCanvas, closeViewer, cancelDialog, isDialogOpen } from './collection.js';
import {
  setBrush, setPalette, stepBrush, stepPalette,
  openGuide, closeGuide, openSheet, closeSheet, dismissSwipeHint
} from './ui.js';
import { isRoom } from './rooms.js';

// ---------- Elements ----------
const micBtn = $('micBtn');
const mbMic = $('mbMic');
const trackBtn = $('trackBtn');
const mbTrack = $('mbTrack');
const fileInput = $('fileInput');
const uploadBtn = $('uploadBtn');
const clearBtn = $('clearBtn');
const saveBtn = $('saveBtn');
const sizeSlider = $('sizeSlider');
const sizeSliderM = $('sizeSliderM');
const mbPalette = $('mbPalette');
const mbHelp = $('mbHelp');
const sheetDone = $('sheetDone');
const sheetBackdrop = $('sheetBackdrop');
const guideBtn = $('guideBtn');
const guideClose = $('guideClose');
const guideOverlay = $('guideOverlay');
const viewer = $('viewer');
const sheet = $('paletteSheet');

function overlayOpen() {
  return !guideOverlay.hidden || !viewer.hidden || isDialogOpen() || sheet.classList.contains('open');
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
      // three dots from the palette, laid along the ring
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

  // with nothing selected, the center shows the current choice
  const shown = i >= 0
    ? w.items[i]
    : w.isBrush ? BRUSHES.find(b => b.id === state.brush) : PALETTES[state.paletteIndex];
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
// Swipes on the canvas (mobile)
// =====================================================================
function initSwipe() {
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
}

// =====================================================================
// Buttons
// =====================================================================
function initButtons() {
  micBtn.addEventListener('click', toggleMic);
  mbMic.addEventListener('click', toggleMic);
  trackBtn.addEventListener('click', toggleTrack);
  mbTrack.addEventListener('click', toggleTrack);

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadTrack(e.target.files[0]);
    e.target.value = ''; // allows re-uploading the same song
  });

  // let keyboard users open the file picker with Enter or Space
  uploadBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  clearBtn.addEventListener('click', () => startNewCanvas());
  saveBtn.addEventListener('click', acquire);

  // the desktop and mobile size sliders stay in sync
  const onSizeInput = e => {
    state.brushSize = parseFloat(e.target.value);
    sizeSlider.value = e.target.value;
    sizeSliderM.value = e.target.value;
  };
  sizeSlider.addEventListener('input', onSizeInput);
  sizeSliderM.addEventListener('input', onSizeInput);

  mbPalette.addEventListener('click', openSheet);
  sheetDone.addEventListener('click', closeSheet);
  sheetBackdrop.addEventListener('click', closeSheet);

  guideBtn.addEventListener('click', openGuide);
  mbHelp.addEventListener('click', openGuide);
  guideClose.addEventListener('click', closeGuide);
}

// =====================================================================
// Keyboard
// =====================================================================
function initKeyboard() {
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (wheelState && wheelState.opened) updateWheelSelection();
  });

  document.addEventListener('keydown', e => {
    // Escape closes whatever is on top
    if (e.key === 'Escape') {
      if (isDialogOpen()) cancelDialog();
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
    if (e.key === '?' && !isRoom('entrance')) {
      if (guideOverlay.hidden) openGuide();
      else closeGuide();
      return;
    }

    // painting shortcuts only work in the studio with nothing on top
    if (!isRoom('studio') || overlayOpen()) return;

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
      if (type === 'brush') setBrush(state.prevBrush, true);
      else setPalette(state.prevPalette, true);
    } else {
      closeWheel(true);
    }
  });

  window.addEventListener('blur', () => closeWheel(false));
}

// =====================================================================
// Start
// =====================================================================
export function initControls() {
  buildWheel('brush');
  buildWheel('palette');
  initButtons();
  initSwipe();
  initKeyboard();

  // warn before leaving with an unsaved painting
  window.addEventListener('beforeunload', e => {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}