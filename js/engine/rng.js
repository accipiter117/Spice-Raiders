// Seeded random numbers (mulberry32). The generator's position lives in
// state.rng so a saved game replays identically.

export function seedFrom(value) {
  if (typeof value === 'number') return value >>> 0;
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Returns a float in [0, 1) and advances state.rng (mutates state).
export function random(state) {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
