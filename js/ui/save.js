// Autosave to localStorage. Storage can be unavailable (private mode), so
// every call is guarded and the game still works without it.
import { STATE_VERSION } from '../engine/index.js';

const KEY = 'arrakis-wars-save';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: play on without saving */
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state.version !== STATE_VERSION || state.result) return null;
    return state;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
