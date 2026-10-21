// =====================================================================
// collection.js — acquiring paintings, the collection room, the viewer,
// renaming saved works, and framed prints.
// Works are saved in the browser with IndexedDB, so they stay on this device.
// =====================================================================
import { $, formatTime, formatDate, slugify, store } from './utils.js';
import { MAX_WORKS } from './config.js';
import { state, currentSize, currentPalette, pieceTitle, autoTitle } from './state.js';
import { canvas, setupCanvas, resetCanvas } from './canvas.js';
import {
  showToast, updatePlacard, refreshPickers, mediumText,
  openLayer, closeLayer, startRename
} from './ui.js';
import { go } from './rooms.js';

// ---------- Elements ----------
const collectionGrid = $('collectionGrid');
const collectionEmpty = $('collectionEmpty');
const collectionCount = $('collectionCount');

const confirmModal = $('confirmModal');
const confirmHang = $('confirmHang');
const confirmDiscard = $('confirmDiscard');
const confirmCancel = $('confirmCancel');

const viewer = $('viewer');
const viewerClose = $('viewerClose');
const viewerImg = $('viewerImg');
const viewerDownload = $('viewerDownload');
const viewerFramed = $('viewerFramed');
const viewerRemove = $('viewerRemove');
const vTitle = $('vTitle');
const vRenameBtn = $('vRenameBtn');
const vMedium = $('vMedium');
const vMeta = $('vMeta');
const vDims = $('vDims');
const vDate = $('vDate');

// =====================================================================
// IndexedDB (the browser's built-in database)
// =====================================================================
const DB_NAME = 'hueverb';
const STORE_NAME = 'works';
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
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
const dbPut = work => dbRequest('readwrite', s => s.put(work));
const dbDelete = id => dbRequest('readwrite', s => s.delete(id));

// =====================================================================
// Image helpers
// =====================================================================
function canvasToBlob(c, type, quality) {
  return new Promise((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), type, quality);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// A small JPEG for the collection grid, so the page loads quickly
function makeThumb() {
  const s = currentSize();
  const k = 480 / Math.max(s.w, s.h);
  const off = document.createElement('canvas');
  off.width = Math.round(s.w * k);
  off.height = Math.round(s.h * k);
  off.getContext('2d').drawImage(canvas, 0, 0, off.width, off.height);
  return canvasToBlob(off, 'image/jpeg', 0.85);
}

// =====================================================================
// Acquiring a painting
// =====================================================================
export async function acquire() {
  if (state.strokeCount === 0) {
    showToast('Paint something first, then acquire it');
    return false;
  }

  let blob;
  try {
    blob = await canvasToBlob(canvas, 'image/png');
  } catch (err) {
    console.error(err);
    showToast("Couldn't capture the painting");
    return false;
  }

  // if the browser blocks storage (some private modes), download the painting instead
  try {
    await openDB();
  } catch (err) {
    console.error(err);
    downloadBlob(blob, `hueverb-${slugify(pieceTitle())}.png`);
    state.dirty = false;
    showToast('Storage is blocked in this browser, so your painting was downloaded instead');
    return true;
  }

  try {
    if ((await dbCount()) >= MAX_WORKS) {
      showToast('Your collection is full. Remove a work to make room', 'Open', () => go('collection'));
      return false;
    }
    const s = currentSize();
    const thumb = await makeThumb();
    await dbAdd({
      title: pieceTitle(),
      autoTitle: autoTitle(), // used if the visitor clears a custom name later
      medium: mediumText(),
      strokes: state.strokeCount,
      seconds: Math.round(state.paintSeconds),
      palette: currentPalette().name,
      w: s.w,
      h: s.h,
      date: Date.now(),
      blob,
      thumb
    });
    state.dirty = false;
    showToast('Hung in your collection', 'View', () => go('collection'));
    return true;
  } catch (err) {
    console.error(err);
    showToast("Couldn't save to your collection");
    return false;
  }
}

// =====================================================================
// New canvas, with "Hang this piece first?"
// =====================================================================
let dialogResolve = null;

// Resolves to 'hang', 'discard', or 'cancel'
function askToHang() {
  return new Promise(resolve => {
    dialogResolve = choice => {
      confirmModal.hidden = true;
      dialogResolve = null;
      closeLayer(confirmModal);
      resolve(choice);
    };
    confirmModal.hidden = false;
    openLayer(confirmModal, confirmHang);
  });
}

export const isDialogOpen = () => !!dialogResolve;

export function cancelDialog() {
  if (dialogResolve) dialogResolve('cancel');
}

// Starts a fresh canvas, optionally in a new shape
export async function startNewCanvas(sizeId) {
  if (state.dirty) {
    const choice = await askToHang();
    if (choice === 'cancel') return;
    if (choice === 'hang' && !(await acquire())) return;
  }
  if (sizeId) {
    state.sizeId = sizeId;
    store('hueverb-size', sizeId);
    setupCanvas();
  } else {
    resetCanvas();
  }
  updatePlacard();
  refreshPickers();
}

// =====================================================================
// Collection room
// =====================================================================
let collectionUrls = [];

export async function renderCollection() {
  collectionUrls.forEach(u => URL.revokeObjectURL(u));
  collectionUrls = [];

  let works;
  try {
    works = await dbAll();
  } catch (err) {
    console.error(err);
    collectionGrid.innerHTML = '';
    collectionEmpty.hidden = true;
    collectionCount.textContent = "Your browser is blocking storage, so the collection isn't available here";
    return;
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
    // titles can come from file names or visitors, so they're set as text (never as HTML)
    btn.querySelector('img').alt = work.title;
    btn.querySelector('.work-title').textContent = work.title;
    btn.querySelector('.work-meta').textContent = `${work.palette} palette · ${formatDate(work.date)}`;
    btn.addEventListener('click', () => openViewer(work));
    collectionGrid.appendChild(btn);
  });
}

// =====================================================================
// Viewing screen
// =====================================================================
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
  if (viewer.hidden) {
    viewer.hidden = false;
    openLayer(viewer, viewerClose);
  }
}

export function closeViewer() {
  if (viewer.hidden) return;
  viewer.hidden = true;
  viewerWork = null;
  resetRemoveButton();
  closeLayer(viewer);
}

function resetRemoveButton() {
  clearTimeout(removeTimer);
  viewerRemove.textContent = 'Remove from collection';
  viewerRemove.classList.remove('armed');
  viewerRemove.dataset.armed = '';
}

function downloadWork() {
  if (!viewerWork) return;
  downloadBlob(viewerWork.blob, `hueverb-${slugify(viewerWork.title)}.png`);
}

// Removing needs a second tap, so nothing is deleted by accident
async function removeWork() {
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
}

// ---------- Renaming a saved work ----------
function renameInViewer() {
  const work = viewerWork;
  if (!work) return;
  startRename({
    titleEl: vTitle,
    trigger: vRenameBtn,
    value: work.title,
    onSave: name => saveWorkTitle(work, name)
  });
}

async function saveWorkTitle(work, name) {
  // an empty name brings back the automatic title
  const title = name || work.autoTitle || work.title;
  if (title === work.title) return;
  work.title = title;
  try {
    await dbPut(work);
    if (viewerWork === work) {
      vTitle.textContent = title;
      viewerImg.alt = title;
    }
    renderCollection();
    showToast('Renamed');
  } catch (err) {
    console.error(err);
    showToast("Couldn't rename that work");
  }
}

// =====================================================================
// Framed print: the painting in its frame and mat, with the placard below
// =====================================================================

// Shortens text with "…" until it fits the width
function fitText(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

// Splits text into lines that fit the width, up to maxLines
function wrapText(g, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width <= maxW || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(g, lines.slice(maxLines - 1).join(' '), maxW);
    return kept;
  }
  return lines.map(l => fitText(g, l, maxW));
}

// Draws letter-spaced text one character at a time
function drawSpaced(g, text, x, y, spacing) {
  for (const ch of text) {
    g.fillText(ch, x, y);
    x += g.measureText(ch).width + spacing;
  }
}

function renderFramedPrint(work, img) {
  const { w, h } = work;
  const u = Math.max(w, h) / 100; // layout unit, so every shape gets the same proportions
  const margin = 8 * u;
  const frame = 1.2 * u;
  const mat = 5 * u;
  const boxW = w + 2 * (mat + frame);
  const boxH = h + 2 * (mat + frame);
  const placardH = 20 * u;

  const c = document.createElement('canvas');
  c.width = Math.round(boxW + 2 * margin);
  c.height = Math.round(margin + boxH + 6 * u + placardH + margin * 0.8);
  const g = c.getContext('2d');

  // wall
  g.fillStyle = '#f6f4ef';
  g.fillRect(0, 0, c.width, c.height);

  // frame with a soft shadow
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.28)';
  g.shadowBlur = 4 * u;
  g.shadowOffsetY = 1.6 * u;
  g.fillStyle = '#1f1f1f';
  g.fillRect(margin, margin, boxW, boxH);
  g.restore();

  // mat and painting
  g.fillStyle = '#ffffff';
  g.fillRect(margin + frame, margin + frame, boxW - 2 * frame, boxH - 2 * frame);
  g.drawImage(img, margin + frame + mat, margin + frame + mat, w, h);

  // placard, aligned with the frame's left edge
  const x = margin;
  const maxW = boxW;
  let y = margin + boxH + 6 * u;
  g.textBaseline = 'top';

  g.fillStyle = '#1f1f1f';
  g.font = `italic ${3.4 * u}px "Cormorant Garamond", Georgia, serif`;
  for (const line of wrapText(g, work.title, maxW, 2)) {
    g.fillText(line, x, y);
    y += 4 * u;
  }
  y += 0.6 * u;

  g.font = `${2.1 * u}px "Cormorant Garamond", Georgia, serif`;
  g.fillText(fitText(g, work.medium, maxW), x, y);
  y += 3.2 * u;

  g.fillStyle = '#6b6b6b';
  g.font = `${1.45 * u}px Inter, system-ui, sans-serif`;
  const meta = `${work.strokes} strokes · ${formatTime(work.seconds)} · ${w} × ${h} px · ${work.palette} palette`;
  g.fillText(fitText(g, meta, maxW), x, y);
  y += 3.4 * u;

  g.fillStyle = '#a3242c';
  g.fillRect(x, y, 2.6 * u, Math.max(1, 0.12 * u));
  y += 1.8 * u;

  g.fillStyle = '#6b6b6b';
  g.font = `500 ${1.15 * u}px Inter, system-ui, sans-serif`;
  drawSpaced(g, 'HUEVERB', x, y, 0.45 * u);

  return canvasToBlob(c, 'image/png');
}

async function downloadFramed() {
  const work = viewerWork;
  if (!work) return;
  showToast('Preparing your framed print…');
  try {
    await viewerImg.decode(); // make sure the painting has loaded
    // make sure the site's fonts are ready before drawing text on the canvas
    await Promise.all([
      document.fonts.load('italic 40px "Cormorant Garamond"'),
      document.fonts.load('40px "Cormorant Garamond"'),
      document.fonts.load('40px Inter'),
      document.fonts.load('500 40px Inter')
    ]);
    const blob = await renderFramedPrint(work, viewerImg);
    downloadBlob(blob, `hueverb-${slugify(work.title)}-framed.png`);
    showToast('Framed print downloaded');
  } catch (err) {
    console.error(err);
    showToast("Couldn't create the framed print");
  }
}

// =====================================================================
// Wiring
// =====================================================================
export function initCollection() {
  confirmHang.addEventListener('click', () => dialogResolve && dialogResolve('hang'));
  confirmDiscard.addEventListener('click', () => dialogResolve && dialogResolve('discard'));
  confirmCancel.addEventListener('click', () => dialogResolve && dialogResolve('cancel'));
  viewerClose.addEventListener('click', closeViewer);
  viewerDownload.addEventListener('click', downloadWork);
  viewerFramed.addEventListener('click', downloadFramed);
  viewerRemove.addEventListener('click', removeWork);
  vTitle.addEventListener('click', renameInViewer);
  vRenameBtn.addEventListener('click', renameInViewer);
}