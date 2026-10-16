// Creating a new game, plus small mutation helpers shared by the engine.
// Helpers here mutate the state they are given; applyAction always hands
// them a fresh copy, so the caller's state is never changed.

import { REGIONS, CAPITALS, START_FIELDS } from '../data/map.js';
import { FACTIONS, FACTION_IDS } from '../data/factions.js';
import { RULES } from '../data/rules.js';
import { seedFrom } from './rng.js';
import { unitDef, militiaSpec, ownedRegions } from './queries.js';
import { startRound } from './turn.js';

export const STATE_VERSION = 1;
const LOG_LIMIT = 300;

export function createGame({ seed = Date.now(), player = null } = {}) {
  const order = player ? [player, ...FACTION_IDS.filter((f) => f !== player)] : [...FACTION_IDS];
  const state = {
    version: STATE_VERSION,
    seed: String(seed),
    rng: seedFrom(seed),
    turn: 0,
    order,
    active: 0,
    player,
    factions: {},
    regions: {},
    units: {},
    nextId: 1,
    tax: { nextTurn: RULES.tax.interval, amount: RULES.tax.firstAmount },
    log: [],
    logSeq: 0,
    lastCombat: null,
    result: null,
  };
  for (const r of REGIONS) {
    state.regions[r.id] = { owner: null, militia: 0, hostile: [] };
  }
  for (const id of FACTION_IDS) {
    const s = RULES.start;
    state.factions[id] = {
      id,
      alive: true,
      solari: s.solari,
      spice: s.spice,
      manpower: s.manpower,
      authority: s.authority,
      hegemony: 0,
      raidedThisTurn: false,
    };
    state.regions[CAPITALS[id]].owner = id;
    for (const type of s.units) addUnit(state, id, type, CAPITALS[id]);
    if (START_FIELDS[id]) {
      state.regions[START_FIELDS[id]].owner = id;
      if (s.harvester) addUnit(state, id, 'harvester', START_FIELDS[id]);
    }
  }
  for (const r of REGIONS) {
    const spec = militiaSpec(state, r.id);
    state.regions[r.id].militia = spec ? spec.hp : 0;
  }
  startRound(state);
  return state;
}

export function addUnit(state, faction, type, region, { ready = true } = {}) {
  const def = unitDef(type);
  const id = 'u' + state.nextId++;
  state.units[id] = {
    id,
    type,
    faction,
    region,
    hp: def.hp,
    movesLeft: ready ? def.moves : 0,
    attacked: !ready,
  };
  return state.units[id];
}

export function log(state, type, text, extra = {}) {
  const entry = { seq: ++state.logSeq, turn: state.turn, type, text, ...extra };
  state.log.push(entry);
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  return entry;
}

// A faction whose capital falls is out: its units vanish and its land goes neutral.
export function eliminate(state, factionId, byFaction) {
  const f = state.factions[factionId];
  if (!f.alive) return;
  f.alive = false;
  for (const id of ownedRegions(state, factionId)) {
    state.regions[id].owner = null;
    state.regions[id].militia = 0;
  }
  for (const u of Object.values(state.units)) {
    if (u.faction === factionId) delete state.units[u.id];
  }
  log(state, 'eliminated', `${name(factionId)} has fallen${byFaction ? ' to ' + name(byFaction) : ''}.`, {
    factions: [factionId, byFaction].filter(Boolean),
  });
  if (state.player === factionId) {
    state.result = { winner: leader(state), loser: factionId, reason: 'capital-lost' };
  }
}

export function leader(state) {
  const alive = Object.values(state.factions).filter((f) => f.alive);
  alive.sort((a, b) => b.hegemony - a.hegemony || state.order.indexOf(a.id) - state.order.indexOf(b.id));
  return alive.length ? alive[0].id : null;
}

export function checkVictory(state) {
  if (state.result) return state.result;
  const alive = Object.values(state.factions).filter((f) => f.alive);
  if (alive.length === 1) {
    state.result = { winner: alive[0].id, reason: 'conquest' };
  } else {
    const top = alive.filter((f) => f.hegemony >= RULES.hegemonyToWin);
    if (top.length) state.result = { winner: leader(state), reason: 'hegemony' };
  }
  if (state.result) log(state, 'victory', `${name(state.result.winner)} wins.`, { factions: [state.result.winner] });
  return state.result;
}

export function name(factionId) {
  return FACTIONS[factionId]?.short || factionId;
}
