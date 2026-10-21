// =====================================================================
// collection.js — acquiring paintings, the collection room, and the viewer
// Works are saved in the browser with IndexedDB, so they stay on this device.
// =====================================================================
import { $, formatTime, formatDate, slugify, store } from './utils.js';
import { MAX_WORKS } from './config.js';
import { state, currentSize, currentPalette, pieceTitle } from './state.js';
import { canvas, setupCanvas, resetCanvas } from './canvas.js';
import { showToast, updatePlacard, refreshPickers, mediumText } from './ui.js';
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
const viewerRemove = $('viewerRemove');
const vTitle = $('vTitle');
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

// =====================================================================
// Acquiring a painting
// =====================================================================
function canvasToBlob(c, type, quality) {
  return new Promise((resolve, reject) => {
    c.toBlob(b => (b ? resolve(b) : reject(new Error('Could not create image'))), type, quality);
  });
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

export async function acquire() {
  if (state.strokeCount === 0) {
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
      resolve(choice);
    };
    confirmModal.hidden = false;
    confirmHang.focus();
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
  viewer.hidden = false;
  viewerClose.focus();
}

export function closeViewer() {
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

function downloadWork() {
  if (!viewerWork) return;
  const link = document.createElement('a');
  link.download = `hueverb-${slugify(viewerWork.title)}.png`;
  link.href = viewerUrl;
  link.click();
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

// =====================================================================
// Wiring
// =====================================================================
export function initCollection() {
  confirmHang.addEventListener('click', () => dialogResolve && dialogResolve('hang'));
  confirmDiscard.addEventListener('click', () => dialogResolve && dialogResolve('discard'));
  confirmCancel.addEventListener('click', () => dialogResolve && dialogResolve('cancel'));
  viewerClose.addEventListener('click', closeViewer);
  viewerDownload.addEventListener('click', downloadWork);
  viewerRemove.addEventListener('click', removeWork);
}