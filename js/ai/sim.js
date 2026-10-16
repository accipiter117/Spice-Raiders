// Runs a full AI-vs-AI game. Used by tests and by tools/sim.mjs for balance work.
import { createGame } from '../engine/index.js';
import { aiTurn, AI_TUNING } from './ai.js';

export function playAiGame(seed, { tuning = {}, maxRounds = 200, onRound = null } = {}) {
  let state = createGame({ seed });
  let guard = 0;
  while (!state.result && guard++ < maxRounds * 4) {
    const faction = state.order[state.active];
    const turnBefore = state.turn;
    state = aiTurn(state, faction, { ...AI_TUNING, ...(tuning[faction] || {}) }).state;
    if (onRound && state.turn !== turnBefore) onRound(state);
  }
  return state;
}
