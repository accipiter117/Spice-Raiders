// The single entry point for changing the game.
//   applyAction(state, action) -> { ok: true, state, events } | { ok: false, error, state }
// The input state is never changed; a fresh copy comes back on success.
//
// Actions (all carry `faction`, which must be the faction whose turn it is):
//   { type: 'move', unitIds, to }
//   { type: 'attack', unitIds, to }
//   { type: 'recruit', region, unit }
//   { type: 'annex', region }
//   { type: 'buildHarvester', region }
//   { type: 'sellSpice', amount }
//   { type: 'raid', region }          (factions with a raid ability)
//   { type: 'endTurn' }

import { RULES } from '../data/rules.js';
import {
  activeFaction, regionDef, unitDef, factionDef, annexBlocker, annexCost, harvesterBlocker,
  needsAttack, militiaSpec, raidBlocker,
} from './queries.js';
import { addUnit, log, checkVictory, name } from './state.js';
import { resolveAttack } from './combat.js';
import { advance } from './turn.js';

const clone = (s) => structuredClone(s);

function canAfford(f, cost) {
  return f.solari >= (cost.solari || 0) && f.manpower >= (cost.manpower || 0);
}

function pickUnits(state, faction, unitIds) {
  if (!Array.isArray(unitIds) || !unitIds.length) return { error: 'Select some units first.' };
  const units = [];
  for (const id of new Set(unitIds)) {
    const u = state.units[id];
    if (!u) return { error: 'That unit no longer exists.' };
    if (u.faction !== faction) return { error: 'Those are not your units.' };
    if (unitDef(u.type).static) return { error: 'Harvesters cannot move.' };
    units.push(u);
  }
  if (units.some((u) => u.region !== units[0].region)) return { error: 'Units must start in the same region.' };
  return { units };
}

const handlers = {
  move(state, faction, a) {
    const { units, error } = pickUnits(state, faction, a.unitIds);
    if (error) return error;
    const from = units[0].region;
    if (!regionDef(a.to)) return 'Unknown region.';
    if (!regionDef(from).neighbours.includes(a.to)) return 'You can only move to a neighbouring region.';
    if (units.some((u) => u.movesLeft <= 0)) return 'Some of those units have already moved.';
    if (needsAttack(state, faction, a.to)) return 'That region is defended. Attack it instead.';
    // Desert stride: stepping onto rock ends a stride unit's movement
    const ontoRock = regionDef(a.to).terrain === 'rock';
    for (const u of units) {
      u.region = a.to;
      u.movesLeft = ontoRock && factionDef(faction).desertStride ? 0 : u.movesLeft - 1;
    }
    return null;
  },

  attack(state, faction, a) {
    const { units, error } = pickUnits(state, faction, a.unitIds);
    if (error) return error;
    const from = units[0].region;
    if (!regionDef(a.to)) return 'Unknown region.';
    if (!regionDef(from).neighbours.includes(a.to)) return 'You can only attack a neighbouring region.';
    if (units.some((u) => u.attacked)) return 'Some of those units have already attacked.';
    if (!needsAttack(state, faction, a.to)) return 'Nothing to attack there. Move instead.';
    resolveAttack(state, units, a.to);
    return null;
  },

  recruit(state, faction, a) {
    const f = state.factions[faction];
    const def = unitDef(a.unit);
    const reg = state.regions[a.region];
    if (!reg) return 'Unknown region.';
    if (!def || !factionDef(faction).units.includes(a.unit)) return 'Your faction cannot recruit that.';
    if (reg.owner !== faction) return 'You can only recruit in your own villages.';
    if (!regionDef(a.region).village) return 'You can only recruit in a village.';
    if (!canAfford(f, def.cost)) return `Needs ${def.cost.solari} Solari and ${def.cost.manpower} Manpower.`;
    f.solari -= def.cost.solari;
    f.manpower -= def.cost.manpower;
    addUnit(state, faction, a.unit, a.region, { ready: false });
    return null;
  },

  annex(state, faction, a) {
    const blocker = annexBlocker(state, faction, a.region);
    if (blocker) return blocker;
    const f = state.factions[faction];
    f.authority -= annexCost(state, faction, a.region);
    state.regions[a.region].owner = faction;
    state.regions[a.region].militia = militiaSpec(state, a.region)?.hp || 0;
    log(state, 'annex', `${name(faction)} annexed ${regionDef(a.region).name}.`, { factions: [faction], region: a.region });
    return null;
  },

  buildHarvester(state, faction, a) {
    const f = state.factions[faction];
    const blocker = harvesterBlocker(state, faction, a.region);
    if (blocker) return blocker;
    const cost = unitDef('harvester').cost;
    f.solari -= cost.solari;
    f.manpower -= cost.manpower;
    addUnit(state, faction, 'harvester', a.region, { ready: false });
    return null;
  },

  sellSpice(state, faction, a) {
    const f = state.factions[faction];
    const amount = Math.floor(Number(a.amount));
    if (!(amount > 0)) return 'Choose an amount to sell.';
    if (amount > f.spice) return 'Not enough spice.';
    f.spice -= amount;
    f.solari += amount * RULES.market.solariPerSpice;
    return null;
  },

  raid(state, faction, a) {
    const blocker = raidBlocker(state, faction, a.region);
    if (blocker) return blocker;
    const raid = factionDef(faction).raid;
    const f = state.factions[faction];
    f.solari += raid.solari;
    f.nextRaid = state.turn + (raid.cooldown || 1);
    state.regions[a.region].hostile.push(faction);
    log(state, 'raid', `${name(faction)} raided ${regionDef(a.region).name} for ${raid.solari} Solari. It is now hostile.`, {
      factions: [faction], region: a.region,
    });
    return null;
  },

  endTurn(state) {
    advance(state);
    return null;
  },
};

export function applyAction(state, action) {
  if (state.result) return { ok: false, error: 'The game is over.', state };
  const handler = action && handlers[action.type];
  if (!handler) return { ok: false, error: 'Unknown action.', state };
  if (action.faction !== activeFaction(state)) return { ok: false, error: 'It is not your turn.', state };
  const next = clone(state);
  const seqBefore = next.logSeq;
  const error = handler(next, action.faction, action);
  if (error) return { ok: false, error, state };
  checkVictory(next);
  const events = next.log.filter((e) => e.seq > seqBefore);
  return { ok: true, state: next, events };
}
