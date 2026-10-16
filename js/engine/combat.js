// Auto-resolved combat. Each side totals its strength (wounded units count for
// less), rolls a small random factor, and the stronger side wins. Losses are
// split by the strength ratio: a lopsided win is cheap, a close one is bloody.

import { RULES } from '../data/rules.js';
import { random } from './rng.js';
import { regionDef, unitDef, foreignUnits, attackStrength, militiaStrength } from './queries.js';
import { log, eliminate, name } from './state.js';
import { CAPITALS } from '../data/map.js';

function roll(state) {
  return 1 + (random(state) * 2 - 1) * RULES.combat.randomSpread;
}

// Damage a list of units by a share of their health. Winners never die outright.
function damage(units, share, canDie) {
  const losses = [];
  for (const u of units) {
    const lost = Math.min(u.hp, Math.ceil(u.hp * share));
    const before = u.hp;
    u.hp = canDie ? u.hp - lost : Math.max(1, u.hp - lost);
    losses.push({ id: u.id, type: u.type, hpLost: before - u.hp, destroyed: u.hp <= 0 });
  }
  return losses;
}

// Mutates state. Attackers must already be validated by the caller.
export function resolveAttack(state, attackers, targetId) {
  const attackerFaction = attackers[0].faction;
  const fromId = attackers[0].region;
  const target = state.regions[targetId];
  const def = regionDef(targetId);
  const defenders = foreignUnits(state, attackerFaction, targetId);
  const defenderFaction = target.owner || (defenders[0] && defenders[0].faction) || null;
  const militia = militiaStrength(state, targetId);
  const terrain = RULES.combat.terrainDefence[def.terrain] || 1;

  const baseAtk = attackStrength(state, attackers);
  const baseDef = (attackStrength(state, defenders) + militia) * terrain;
  const contested = baseDef > 0;
  const atk = contested ? baseAtk * roll(state) : baseAtk;
  const dfn = contested ? baseDef * roll(state) : 0;
  const attackerWon = atk > dfn;

  let attackerLosses = [];
  let defenderLosses = [];
  let militiaLost = 0;
  if (contested) {
    const W = Math.max(atk, dfn);
    const L = Math.max(Math.min(atk, dfn), 0.01);
    const loserShare = Math.min(1, RULES.combat.loserLoss * (W / L));
    const winnerShare = Math.min(0.9, RULES.combat.winnerLoss * (L / W));
    if (attackerWon) {
      attackerLosses = damage(attackers, winnerShare, false);
      defenderLosses = damage(defenders, loserShare, true);
      militiaLost = target.militia;
      target.militia = 0;
    } else {
      attackerLosses = damage(attackers, loserShare, true);
      defenderLosses = damage(defenders, winnerShare, false);
      const before = target.militia;
      if (before > 0) target.militia = Math.max(1, before - Math.ceil(before * winnerShare));
      militiaLost = before - target.militia;
    }
  }
  for (const u of [...attackers, ...defenders]) {
    if (u.hp <= 0) delete state.units[u.id];
  }

  let captured = false;
  let capitalTaken = null;
  if (attackerWon) {
    // Surviving defenders fall back to a friendly neighbour, or are lost
    for (const u of defenders) {
      if (!state.units[u.id]) continue;
      const fallback = unitDef(u.type).static
        ? null
        : def.neighbours.find((n) => state.regions[n].owner === u.faction && !foreignUnits(state, u.faction, n).length);
      if (fallback) {
        u.region = fallback;
        u.movesLeft = 0;
      } else {
        delete state.units[u.id];
        const loss = defenderLosses.find((l) => l.id === u.id);
        if (loss) loss.destroyed = true;
      }
    }
    for (const u of attackers) {
      if (!state.units[u.id]) continue;
      u.region = targetId;
    }
    if (target.owner || def.village) {
      const previous = target.owner;
      target.owner = attackerFaction;
      target.militia = 0;
      captured = true;
      if (previous && CAPITALS[previous] === targetId) capitalTaken = previous;
    }
  }
  for (const u of attackers) {
    if (!state.units[u.id]) continue;
    u.attacked = true;
    u.movesLeft = 0;
  }

  const winner = attackerWon ? attackerFaction : defenderFaction;
  if (contested && winner) state.factions[winner].hegemony += RULES.combat.hegemonyPerWin;

  const result = {
    region: targetId,
    from: fromId,
    attacker: attackerFaction,
    defender: defenderFaction,
    hadMilitia: militia > 0,
    attackStrength: Math.round(atk * 10) / 10,
    defenceStrength: Math.round(dfn * 10) / 10,
    attackerWon,
    contested,
    attackerLosses,
    defenderLosses,
    militiaLost,
    captured,
    capitalTaken,
  };
  state.lastCombat = result;

  const who = defenderFaction ? name(defenderFaction) : 'the village militia';
  const text = attackerWon
    ? contested
      ? `${name(attackerFaction)} beat ${who} at ${def.name}${captured ? ' and took it' : ''}.`
      : `${name(attackerFaction)} took ${def.name} unopposed.`
    : `${name(attackerFaction)} were driven back from ${def.name} by ${who}.`;
  log(state, 'combat', text, { factions: [attackerFaction, defenderFaction].filter(Boolean), region: targetId, combat: result });

  if (capitalTaken) {
    state.factions[attackerFaction].hegemony += RULES.combat.hegemonyForCapital;
    eliminate(state, capitalTaken, attackerFaction);
  }
  return result;
}
