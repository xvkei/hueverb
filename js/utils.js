// =====================================================================
// utils.js — small helpers with no dependencies, used everywhere
// =====================================================================

export const $ = id => document.getElementById(id);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const isMobileLayout = () => window.matchMedia('(max-width: 899px)').matches;

// localStorage can throw in some private browsing modes, so these fail quietly
export function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

export function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// ---------- Colors ----------
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(c1, c2, t) {
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
}

export const rgbStr = c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
export const rgbaStr = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

// Slightly lighter or darker version of a color, for natural variation
export function varyColor(rgb, amount) {
  const v = (Math.random() - 0.5) * amount;
  return rgbStr(v > 0 ? mix(rgb, [255, 255, 255], v) : mix(rgb, [0, 0, 0], -v));
}

// ---------- Text ----------
export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
}

// ['Sound', 'oil', 'ink'] -> "Sound, oil and ink"
export function joinList(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

// "my_song-final.mp3" -> "my song final"
export function titleFromFile(name) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
}