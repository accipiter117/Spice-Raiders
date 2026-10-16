// The turn cycle. A "round" is one full turn for every faction:
//   start of round: income, worm check, units refreshed
//   each faction acts in order (player first)
//   end of round: upkeep, supply, militia recovery, spice tax, victory check

import { RULES } from '../data/rules.js';
import { random } from './rng.js';
import {
  regionDef, unitDef, unitsOf, incomeOf, upkeepOf, wormRisk, supplyLoss, militiaSpec, unitMoves,
} from './queries.js';
import { log, leader, checkVictory, name } from './state.js';

function aliveIds(state) {
  return state.order.filter((id) => state.factions[id].alive);
}

export function startRound(state) {
  state.turn += 1;
  for (const id of aliveIds(state)) {
    const f = state.factions[id];
    const inc = incomeOf(state, id);
    f.solari += inc.solari;
    f.manpower += inc.manpower;
    f.spice += inc.spice;
    f.authority += inc.authority;
    f.hegemony += inc.hegemony;
  }
  // Worm check for harvesters on sand and deep desert
  for (const u of Object.values(state.units)) {
    if (u.type !== 'harvester') continue;
    const risk = wormRisk(state, u);
    if (risk > 0 && random(state) < risk) {
      delete state.units[u.id];
      log(state, 'worm', `A sandworm swallowed the ${name(u.faction)} harvester at ${regionDef(u.region).name}.`, {
        factions: [u.faction], region: u.region,
      });
    }
  }
  for (const u of Object.values(state.units)) {
    u.movesLeft = unitMoves(u.faction, u.type);
    u.attacked = false;
  }
  state.active = state.order.findIndex((id) => state.factions[id].alive);
  checkVictory(state);
}

export function endRound(state) {
  for (const id of aliveIds(state)) {
    const f = state.factions[id];
    const upkeep = upkeepOf(state, id);
    if (f.solari >= upkeep) {
      f.solari -= upkeep;
    } else {
      f.solari = 0;
      for (const u of unitsOf(state, id)) {
        if (!unitDef(u.type).static) u.hp -= RULES.unpaidUpkeepDamage;
      }
      log(state, 'upkeep', `${name(id)} could not pay their troops. Units lose health.`, { factions: [id] });
    }
  }
  // Supply: units outside owned territory lose health, units inside heal
  for (const u of Object.values(state.units)) {
    const loss = supplyLoss(state, u);
    if (loss > 0) u.hp -= loss;
    else if (state.regions[u.region].owner === u.faction) u.hp = Math.min(unitDef(u.type).hp, u.hp + RULES.supply.healInside);
  }
  for (const u of Object.values(state.units)) {
    if (u.hp <= 0) {
      delete state.units[u.id];
      log(state, 'attrition', `${name(u.faction)} ${unitDef(u.type).name} perished at ${regionDef(u.region).name}.`, {
        factions: [u.faction], region: u.region,
      });
    }
  }
  // Village militia recover
  for (const [id, reg] of Object.entries(state.regions)) {
    const spec = militiaSpec(state, id);
    if (spec) reg.militia = Math.min(spec.hp, reg.militia + RULES.militia.regenPerTurn);
  }
  // Spice tax
  if (state.turn === state.tax.nextTurn) {
    const amount = state.tax.amount;
    for (const id of aliveIds(state)) {
      const f = state.factions[id];
      if (f.spice >= amount) {
        f.spice -= amount;
        f.hegemony += RULES.tax.hegemonyPaid;
        log(state, 'tax', `${name(id)} paid the Imperial spice tax (${amount}). +${RULES.tax.hegemonyPaid} Hegemony.`, { factions: [id] });
      } else {
        f.hegemony = Math.max(0, f.hegemony - RULES.tax.hegemonyMissed);
        f.authority = Math.max(0, f.authority - RULES.tax.authorityMissed);
        log(state, 'tax', `${name(id)} missed the Imperial spice tax (${amount}). The Emperor is displeased.`, { factions: [id] });
      }
    }
    state.tax.nextTurn += RULES.tax.interval;
    state.tax.amount += RULES.tax.increase;
  }
  checkVictory(state);
  if (!state.result && state.turn >= RULES.maxTurns) {
    state.result = { winner: leader(state), reason: 'time' };
    log(state, 'victory', `Time is up. ${name(state.result.winner)} leads and wins.`, { factions: [state.result.winner] });
  }
}

// Called when the active faction ends its turn.
export function advance(state) {
  const order = state.order;
  for (let i = state.active + 1; i < order.length; i++) {
    if (state.factions[order[i]].alive) {
      state.active = i;
      return;
    }
  }
  endRound(state);
  if (!state.result) startRound(state);
}
