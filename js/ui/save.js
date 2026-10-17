// Autosave to localStorage. Storage can be unavailable (private mode, full,
// blocked), so every call is guarded and the game still works without it.
import { STATE_VERSION } from '../engine/index.js';

const KEY = 'arrakis-wars-save';
const META = 'arrakis-wars-save-meta';
const SEEN_GUIDE = 'arrakis-wars-seen-guide';

// Returns true if the game was saved.
export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(META, JSON.stringify({ savedAt: Date.now(), turn: state.turn, player: state.player }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Saves from older versions of the rules (or finished games) are not resumed
    if (state.version !== STATE_VERSION || state.result) return null;
    return state;
  } catch {
    return null;
  }
}

export function savedAt() {
  try {
    return JSON.parse(localStorage.getItem(META) || 'null')?.savedAt || null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(META);
  } catch {
    /* ignore */
  }
}

export function hasSeenGuide() {
  try {
    return localStorage.getItem(SEEN_GUIDE) === '1';
  } catch {
    return true; // cannot remember: do not nag every game
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(SEEN_GUIDE, '1');
  } catch {
    /* ignore */
  }
}
