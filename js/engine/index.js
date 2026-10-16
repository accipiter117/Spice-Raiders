// Public face of the rules engine. The UI and AI import from here only.
export { createGame, STATE_VERSION } from './state.js';
export { applyAction } from './actions.js';
export * from './queries.js';
