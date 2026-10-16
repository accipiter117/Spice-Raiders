// Read-only helpers over game state. Nothing here changes state.

import { REGION_BY_ID, REGIONS, TERRAIN, CAPITALS } from '../data/map.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { RULES } from '../data/rules.js';

export const regionDef = (id) => REGION_BY_ID[id];
export const unitDef = (type) => UNITS[type];
export const factionDef = (id) => FACTIONS[id];

export function activeFaction(state) {
  return state.order[state.active];
}

export function unitsIn(state, regionId) {
  return Object.values(state.units).filter((u) => u.region === regionId);
}

export function unitsOf(state, factionId) {
  return Object.values(state.units).filter((u) => u.faction === factionId);
}

export function ownedRegions(state, factionId) {
  return REGIONS.filter((r) => state.regions[r.id].owner === factionId).map((r) => r.id);
}

export function ownedVillages(state, factionId) {
  return REGIONS.filter((r) => r.village && state.regions[r.id].owner === factionId).map((r) => r.id);
}

export function isCapital(regionId) {
  return Object.values(CAPITALS).includes(regionId);
}

export function harvesterIn(state, regionId) {
  return unitsIn(state, regionId).find((u) => u.type === 'harvester') || null;
}

export function adjacentToTerritory(state, factionId, regionId) {
  return regionDef(regionId).neighbours.some((n) => state.regions[n].owner === factionId);
}

// Other factions' units in a region (ignores the faction asking).
export function foreignUnits(state, factionId, regionId) {
  return unitsIn(state, regionId).filter((u) => u.faction !== factionId);
}

export function militiaSpec(state, regionId) {
  const def = regionDef(regionId);
  const owner = state.regions[regionId].owner;
  if (!def.village) return owner ? RULES.militia.outpost : null;
  if (!owner) return def.sietch ? RULES.militia.sietch : RULES.militia.neutral;
  if (def.sietch && factionDef(owner).sietchFriend) return RULES.militia.sietch; // Fremen-held sietch
  if (CAPITALS[owner] === regionId) return RULES.militia.capital;
  return RULES.militia.owned;
}

export function annexCost(state, factionId, regionId) {
  const base = regionDef(regionId).village ? RULES.annex.villageAuthority : RULES.annex.emptyAuthority;
  return Math.round(base * factionDef(factionId).annexCostMult);
}

// Why a peaceful annex is not allowed, or null if it is.
export function annexBlocker(state, factionId, regionId) {
  const reg = state.regions[regionId];
  if (!reg) return 'Unknown region.';
  if (reg.owner === factionId) return 'You already own this region.';
  if (reg.owner) return 'Owned by another faction. Take it by force.';
  if (!TERRAIN[regionDef(regionId).terrain].ownable) return 'Deep desert cannot be held.';
  if (!adjacentToTerritory(state, factionId, regionId)) return 'Must border your territory.';
  if (reg.hostile.includes(factionId)) return 'This village is hostile to you. Take it by force.';
  if (regionDef(regionId).sietch && !factionDef(factionId).sietchFriend) return 'Only the Fremen can win over a sietch.';
  if (foreignUnits(state, factionId, regionId).length) return 'Enemy units are in the way.';
  const cost = annexCost(state, factionId, regionId);
  if (state.factions[factionId].authority < cost) return `Needs ${cost} Authority.`;
  return null;
}

// Why a harvester cannot go here, or null if it can. Owned spice fields, or
// deep desert spice next to your territory (nobody can own deep desert).
export function harvesterBlocker(state, factionId, regionId) {
  const def = regionDef(regionId);
  const reg = state.regions[regionId];
  if (!def || !reg) return 'Unknown region.';
  if (def.spice <= 0) return 'There is no spice field here.';
  if (harvesterIn(state, regionId)) return 'There is already a harvester here.';
  if (TERRAIN[def.terrain].ownable) {
    if (reg.owner !== factionId) return 'You can only build on your own land.';
  } else {
    const reach = factionDef(factionId).deepReach || 1;
    const owned = ownedRegions(state, factionId);
    if (!owned.some((id) => distance(id, regionId) <= reach)) return reach > 1 ? `Must be within ${reach} regions of your territory.` : 'Must border your territory.';
    if (foreignUnits(state, factionId, regionId).length) return 'Enemy units are in the way.';
  }
  const cost = UNITS.harvester.cost.solari;
  if (state.factions[factionId].solari < cost) return `Needs ${cost} Solari.`;
  return null;
}

export function unitMoves(factionId, type) {
  const def = unitDef(type);
  if (def.static) return 0;
  return def.moves + (factionDef(factionId).desertStride ? 1 : 0);
}

// Strength in a fight; `where` is the region being fought over (defaults to the unit's own).
export function unitStrength(state, unit, where = unit.region) {
  const def = unitDef(unit.type);
  const f = factionDef(unit.faction);
  const floor = RULES.combat.woundedFloor;
  const health = floor + (1 - floor) * (unit.hp / def.hp);
  const terrain = (f.terrainCombat || {})[regionDef(where).terrain] || 1;
  return def.strength * health * f.combatMult * terrain;
}

// Militia strength, against `attacker` if given (raided villages fight harder).
export function militiaStrength(state, regionId, attacker = null) {
  const spec = militiaSpec(state, regionId);
  const reg = state.regions[regionId];
  if (!spec || reg.militia <= 0) return 0;
  const floor = RULES.combat.woundedFloor;
  const hostile = attacker && reg.hostile.includes(attacker) ? RULES.militia.hostileMult : 1;
  const loyal = reg.owner ? factionDef(reg.owner).militiaMult || 1 : 1;
  return spec.strength * (floor + (1 - floor) * (reg.militia / spec.hp)) * hostile * loyal;
}

// Why a raid is not allowed, or null if it is.
export function raidBlocker(state, factionId, regionId) {
  const raid = factionDef(factionId).raid;
  const def = regionDef(regionId);
  const reg = state.regions[regionId];
  if (!raid) return 'Your faction cannot raid.';
  if (!def || !def.village) return 'You can only raid a village.';
  if (reg.owner) return 'You can only raid neutral villages.';
  if (reg.hostile.includes(factionId)) return 'This village has already been raided.';
  const wait = (state.factions[factionId].nextRaid || 0) - state.turn;
  if (wait > 0) return `Your raiders need ${wait} more turn(s).`;
  const nearUnit = unitsOf(state, factionId).some((u) => regionDef(u.region).neighbours.includes(regionId));
  if (!adjacentToTerritory(state, factionId, regionId) && !nearUnit) return 'Must border your territory or troops.';
  return null;
}

// Defence total a region would put up against `factionId` (no random factor).
export function defenceStrength(state, factionId, regionId) {
  const units = foreignUnits(state, factionId, regionId);
  const terrain = RULES.combat.terrainDefence[regionDef(regionId).terrain] || 1;
  const owner = state.regions[regionId].owner;
  const militia = owner === factionId ? 0 : militiaStrength(state, regionId, factionId);
  return (units.reduce((s, u) => s + unitStrength(state, u, regionId), 0) + militia) * terrain;
}

// Total strength of these units fighting over `where` (defaults to where they stand).
export function attackStrength(state, units, where) {
  return units.reduce((s, u) => s + unitStrength(state, u, where || u.region), 0);
}

// Does entering this region need an attack (rather than a move)?
export function needsAttack(state, factionId, regionId) {
  const reg = state.regions[regionId];
  if (reg.owner === factionId) return false;
  if (foreignUnits(state, factionId, regionId).length) return true;
  if (reg.owner) return true; // owned land always has a garrison
  return regionDef(regionId).village; // neutral village: fight its militia
}

export function upkeepOf(state, factionId) {
  return unitsOf(state, factionId).reduce((s, u) => s + unitDef(u.type).upkeep, 0);
}

export function incomeOf(state, factionId) {
  const f = factionDef(factionId);
  const inc = RULES.income;
  let solari = 0;
  let manpower = 0;
  for (const id of ownedVillages(state, factionId)) {
    solari += inc.villageSolari;
    manpower += inc.villageManpower;
    if (CAPITALS[factionId] === id) {
      solari += inc.capitalSolari;
      manpower += inc.capitalManpower;
    }
  }
  solari = Math.floor(solari * f.solariMult);
  let spice = 0;
  for (const u of unitsOf(state, factionId)) {
    if (u.type === 'harvester') spice += regionDef(u.region).spice * inc.spicePerField;
  }
  const hegemony = Math.floor(ownedVillages(state, factionId).length * inc.hegemonyPerVillage);
  return { solari, manpower, spice, authority: inc.authority + (f.authorityBonus || 0), hegemony };
}

export function turnsUntilTax(state) {
  return state.tax.nextTurn - state.turn;
}

export function wormRisk(state, unit) {
  const terrain = regionDef(unit.region).terrain;
  const base = RULES.worms[terrain] || 0;
  return base * factionDef(unit.faction).wormMult;
}

export function supplyLoss(state, unit) {
  if (unitDef(unit.type).static) return 0;
  if (state.regions[unit.region].owner === unit.faction) return 0;
  const terrain = regionDef(unit.region).terrain;
  if (factionDef(unit.faction).supplyImmune.includes(terrain)) return 0;
  return RULES.supply.lossOutside * TERRAIN[terrain].supplyLossMult;
}

// Regions this faction can currently see (Set of ids).
export function visibleRegions(state, factionId) {
  const f = factionDef(factionId);
  const seen = new Set();
  const spread = (start, range) => {
    let frontier = [start];
    seen.add(start);
    for (let i = 0; i < range; i++) {
      const next = [];
      for (const id of frontier) {
        for (const n of regionDef(id).neighbours) {
          if (!seen.has(n)) next.push(n);
          seen.add(n);
        }
      }
      frontier = next;
    }
  };
  for (const id of ownedRegions(state, factionId)) spread(id, 1 + f.visionBonus);
  for (const u of unitsOf(state, factionId)) spread(u.region, 1 + f.visionBonus + unitDef(u.type).vision);
  return seen;
}

// Shortest path length between two regions (optionally only through `allowed`).
export function distance(from, to, allowed = null) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  let d = 0;
  while (frontier.length) {
    d++;
    const next = [];
    for (const id of frontier) {
      for (const n of regionDef(id).neighbours) {
        if (seen.has(n)) continue;
        if (n === to) return d;
        if (allowed && !allowed(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return Infinity;
}

// Where can these units go this turn? Returns { move: [...ids], attack: [...ids] }.
export function unitTargets(state, unitIds) {
  const units = unitIds.map((id) => state.units[id]).filter(Boolean);
  const out = { move: [], attack: [] };
  if (!units.length) return out;
  const region = units[0].region;
  if (units.some((u) => u.region !== region || unitDef(u.type).static)) return out;
  const faction = units[0].faction;
  const canMove = units.every((u) => u.movesLeft > 0);
  const canAttack = units.every((u) => !u.attacked);
  for (const n of regionDef(region).neighbours) {
    if (needsAttack(state, faction, n)) {
      if (canAttack) out.attack.push(n);
    } else if (canMove) {
      out.move.push(n);
    }
  }
  return out;
}
