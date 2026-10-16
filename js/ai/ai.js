// Rules-based AI. It plays through exactly the same applyAction interface as
// the player. Each step it picks the most important thing it can do:
//   1. keep enough spice for the next tax, sell the rest
//   2. annex nearby villages (then spice fields)
//   3. put harvesters on owned spice fields
//   4. defend the capital
//   5. recruit while income allows
//   6. attack weak neighbours, otherwise march towards the best target
// v1 note: the AI sees the whole map (it ignores fog of war).

import { RULES } from '../data/rules.js';
import { REGIONS, CAPITALS } from '../data/map.js';
import {
  applyAction, regionDef, unitDef, factionDef, unitsOf, unitsIn, ownedRegions, ownedVillages,
  annexBlocker, annexCost, harvesterIn, needsAttack, defenceStrength, attackStrength, unitStrength,
  incomeOf, upkeepOf, foreignUnits,
} from '../engine/index.js';

export const AI_TUNING = {
  attackRatio: 1.3, // attack only when this much stronger than the defence
  capitalSafety: 1.0, // keep the capital garrison at least this share of the nearby threat
  spiceBuffer: 0, // extra spice kept on top of the next tax
  armyPerVillage: 1.2,
  baseArmy: 2,
  solariReserve: 6,
};

const MAX_STEPS = 80;

export function aiTurn(state, faction, tuning = AI_TUNING) {
  const actions = [];
  const tried = new Set();
  let s = state;
  for (let step = 0; step < MAX_STEPS; step++) {
    if (s.result) break;
    const action = chooseAction(s, faction, tuning, tried);
    if (!action) break;
    const key = JSON.stringify(action);
    tried.add(key);
    const res = applyAction(s, { ...action, faction });
    if (res.ok) {
      s = res.state;
      actions.push(action);
    }
  }
  if (!s.result && s.order[s.active] === faction) {
    const res = applyAction(s, { type: 'endTurn', faction });
    if (res.ok) s = res.state;
    actions.push({ type: 'endTurn' });
  }
  return { state: s, actions };
}

function chooseAction(state, faction, t, tried) {
  const fresh = (a) => (tried.has(JSON.stringify(a)) ? null : a);
  for (const pick of [sellSpice, annex, harvester, defendCapital, recruit, military, raid]) {
    const list = pick(state, faction, t);
    for (const a of list) {
      const ok = fresh(a);
      if (ok) return ok;
    }
  }
  return null;
}

function sellSpice(state, faction, t) {
  const f = state.factions[faction];
  const keep = state.tax.amount + t.spiceBuffer;
  const surplus = f.spice - keep;
  if (surplus >= RULES.market.lot) return [{ type: 'sellSpice', amount: surplus }];
  return [];
}

function annex(state, faction) {
  const f = state.factions[faction];
  const villageCost = annexCost(state, faction, REGIONS.find((r) => r.village).id);
  const options = [];
  let villageWaiting = false;
  for (const r of REGIONS) {
    if (state.regions[r.id].owner) continue;
    const blocker = annexBlocker(state, faction, r.id);
    if (blocker && r.village && blocker.startsWith('Needs')) villageWaiting = true;
    if (blocker) continue;
    options.push({ id: r.id, score: r.village ? 10 : r.spice * 2 + 0.5 });
  }
  options.sort((a, b) => b.score - a.score);
  return options
    .filter((o) => regionDef(o.id).village || !villageWaiting || f.authority - annexCost(state, faction, o.id) >= villageCost)
    .map((o) => ({ type: 'annex', region: o.id }));
}

function harvester(state, faction, t) {
  const f = state.factions[faction];
  const cost = unitDef('harvester').cost.solari;
  if (f.solari - cost < upkeepOf(state, faction) + t.solariReserve) return [];
  return ownedRegions(state, faction)
    .filter((id) => regionDef(id).spice > 0 && !harvesterIn(state, id))
    .sort((a, b) => regionDef(b).spice - regionDef(a).spice)
    .map((id) => ({ type: 'buildHarvester', region: id }));
}

// Enemy strength within two regions (units can move one and then attack).
function threatTo(state, faction, regionId) {
  let threat = 0;
  for (const u of Object.values(state.units)) {
    if (u.faction === faction || unitDef(u.type).static) continue;
    if (hops(u.region, regionId) <= 2) threat += unitStrength(state, u);
  }
  return threat;
}

function garrison(state, faction, regionId) {
  return attackStrength(state, unitsIn(state, regionId).filter((u) => u.faction === faction && !unitDef(u.type).static));
}

function defendCapital(state, faction, t) {
  const cap = CAPITALS[faction];
  const threat = threatTo(state, faction, cap) * t.capitalSafety;
  if (threat <= 0 || garrison(state, faction, cap) >= threat) return [];
  const actions = [];
  for (const n of regionDef(cap).neighbours) {
    const ready = unitsIn(state, n).filter((u) => u.faction === faction && u.movesLeft > 0 && !unitDef(u.type).static);
    if (ready.length) actions.push({ type: 'move', unitIds: ready.map((u) => u.id), to: cap });
  }
  for (const type of affordableUnits(state, faction, t, true)) actions.push({ type: 'recruit', region: cap, unit: type });
  return actions;
}

function armyOf(state, faction) {
  return unitsOf(state, faction).filter((u) => !unitDef(u.type).static);
}

function recruit(state, faction, t) {
  const f = state.factions[faction];
  const army = armyOf(state, faction).length;
  const target = t.baseArmy + ownedVillages(state, faction).length * t.armyPerVillage + state.turn / 10 + f.solari / 60;
  if (army >= target) return [];
  const choices = affordableUnits(state, faction, t, false);
  if (!choices.length) return [];
  // Recruit at the owned village closest to something worth fighting for
  const villages = ownedVillages(state, faction);
  const goals = targetRegions(state, faction).map((g) => g.id);
  let best = villages[0];
  let bestD = Infinity;
  for (const v of villages) {
    const d = Math.min(...goals.map((g) => hops(v, g)), 99);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return choices.map((type) => ({ type: 'recruit', region: best, unit: type }));
}

// Unit types we can buy without going broke at upkeep time. In an emergency
// we accept running at a loss for a while if the treasury can carry it.
function affordableUnits(state, faction, t, emergency) {
  const f = state.factions[faction];
  const net = incomeOf(state, faction).solari - upkeepOf(state, faction);
  const elite = factionDef(faction).units.find((u) => unitDef(u).elite);
  const out = [];
  for (const type of [elite, 'trooper']) {
    const def = unitDef(type);
    const left = f.solari - def.cost.solari;
    if (left < upkeepOf(state, faction) + def.upkeep + t.solariReserve || f.manpower < def.cost.manpower) continue;
    if (net - def.upkeep < 0 && left < (emergency ? 15 : 60)) continue;
    out.push(type);
  }
  return out;
}

// Regions worth taking by force, with a base value.
function targetRegions(state, faction) {
  const out = [];
  const authority = state.factions[faction].authority;
  for (const r of REGIONS) {
    const reg = state.regions[r.id];
    if (!needsAttack(state, faction, r.id)) continue;
    let value = 0;
    if (reg.owner) {
      if (CAPITALS[reg.owner] === r.id) value = 14;
      else if (r.village) value = 10;
      else if (harvesterIn(state, r.id)) value = 7;
      else value = 3;
    } else if (r.village) {
      // Neutral village: only fight for it if we cannot annex it soon
      const soon = !reg.hostile.includes(faction) && authority + 2 * RULES.income.authority >= annexCost(state, faction, r.id);
      value = soon ? 2 : 8;
    } else {
      value = 3; // enemy units in open desert
    }
    out.push({ id: r.id, value });
  }
  return out;
}

const hopCache = new Map();
function hops(a, b) {
  const key = a + '|' + b;
  if (!hopCache.has(key)) {
    const seen = new Set([a]);
    let frontier = [a];
    let d = 0;
    let found = a === b ? 0 : Infinity;
    while (frontier.length && found === Infinity) {
      d++;
      const next = [];
      for (const id of frontier) {
        for (const n of regionDef(id).neighbours) {
          if (seen.has(n)) continue;
          if (n === b) found = d;
          seen.add(n);
          next.push(n);
        }
      }
      frontier = next;
    }
    hopCache.set(key, found);
  }
  return hopCache.get(key);
}

// First step on a path towards goal that only passes through enterable regions.
function stepTowards(state, faction, from, goal) {
  const prev = new Map([[from, null]]);
  let frontier = [from];
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const n of regionDef(id).neighbours) {
        if (prev.has(n)) continue;
        prev.set(n, id);
        if (n === goal) {
          let step = n;
          while (prev.get(step) !== from) step = prev.get(step);
          return step;
        }
        if (!needsAttack(state, faction, n)) next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

function military(state, faction, t) {
  const actions = [];
  const cap = CAPITALS[faction];
  const stacks = new Map();
  for (const u of armyOf(state, faction)) {
    if (!stacks.has(u.region)) stacks.set(u.region, []);
    stacks.get(u.region).push(u);
  }
  const targets = targetRegions(state, faction);
  for (const [region, units] of stacks) {
    let free = units.filter((u) => !u.attacked);
    if (!free.length) continue;
    // Keep enough at home to match the nearby threat
    if (region === cap) {
      const threat = threatTo(state, faction, cap) * t.capitalSafety;
      if (threat > 0) {
        free.sort((a, b) => unitStrength(state, a) - unitStrength(state, b));
        let kept = 0;
        while (free.length && kept < threat) kept += unitStrength(state, free.pop());
        if (!free.length) continue;
      }
    }
    const power = attackStrength(state, free);
    // Wounded units outside territory head home
    const owned = state.regions[region].owner === faction;
    // Attack an adjacent target if strong enough
    let bestAttack = null;
    for (const n of regionDef(region).neighbours) {
      const tg = targets.find((x) => x.id === n);
      if (!tg) continue;
      const dfn = defenceStrength(state, faction, n);
      if (dfn > 0 && power < dfn * t.attackRatio) continue;
      const score = tg.value + (dfn === 0 ? 2 : 0);
      if (!bestAttack || score > bestAttack.score) bestAttack = { to: n, score };
    }
    if (bestAttack && bestAttack.score >= 3) {
      actions.push({ type: 'attack', unitIds: free.map((u) => u.id), to: bestAttack.to });
      continue;
    }
    const movers = free.filter((u) => u.movesLeft > 0);
    if (!movers.length) continue;
    const hurt = movers.filter((u) => u.hp < unitDef(u.type).hp * 0.5);
    if (!owned && hurt.length === movers.length) {
      const home = regionDef(region).neighbours.find((n) => state.regions[n].owner === faction);
      if (home) {
        actions.push({ type: 'move', unitIds: movers.map((u) => u.id), to: home });
        continue;
      }
    }
    // March towards the most attractive target (value over distance, scaled by our odds)
    let best = null;
    for (const tg of targets) {
      if (tg.value < 3) continue;
      const d = hops(region, tg.id);
      if (d <= 1 || d === Infinity) continue;
      const dfn = defenceStrength(state, faction, tg.id);
      const odds = dfn === 0 ? 1.2 : Math.min(1.2, power / (dfn * t.attackRatio));
      const score = (tg.value * odds) / d;
      if (!best || score > best.score) best = { id: tg.id, score };
    }
    if (!best) continue;
    const step = stepTowards(state, faction, region, best.id);
    if (step && !needsAttack(state, faction, step)) {
      actions.push({ type: 'move', unitIds: movers.map((u) => u.id), to: step });
    }
  }
  return actions;
}

function raid(state, faction) {
  if (!factionDef(faction).raid || state.factions[faction].raidedThisTurn) return [];
  if (state.factions[faction].solari >= 30) return [];
  // Raid villages we are not about to annex anyway
  return REGIONS.filter((r) => r.village && !state.regions[r.id].owner && !state.regions[r.id].hostile.includes(faction))
    .filter((r) => (annexBlocker(state, faction, r.id) || '').startsWith('Needs'))
    .map((r) => ({ type: 'raid', region: r.id }));
}
