// Looks up art slots from js/data/assets.js. If a slot's image file exists it is
// used, otherwise the emoji/colour fallback is shown.
import { ASSET_SLOTS } from '../data/assets.js';

const loaded = {};

export function preloadAssets(onChange) {
  for (const [name, slot] of Object.entries(ASSET_SLOTS)) {
    if (!slot.file) continue;
    const img = new Image();
    img.onload = () => {
      loaded[name] = slot.file;
      if (onChange) onChange(name);
    };
    img.src = slot.file;
  }
}

export const imageFor = (name) => loaded[name] || null;
export const emojiFor = (name) => ASSET_SLOTS[name]?.fallback?.emoji || '';
export const colourFor = (name) => ASSET_SLOTS[name]?.fallback?.colour || '#888';

// HTML icon: image if available, else emoji.
export function icon(name, alt = '') {
  const src = imageFor(name);
  if (src) return `<img src="${src}" alt="${alt}">`;
  return `<span aria-hidden="true">${emojiFor(name)}</span>`;
}

// SVG icon centred on (x, y).
export function svgIcon(name, x, y, size = 16) {
  const src = imageFor(name);
  if (src) return `<image href="${src}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" pointer-events="none"/>`;
  return `<text class="map-emoji" x="${x}" y="${y}" style="font-size:${size * 0.9}px">${emojiFor(name)}</text>`;
}
