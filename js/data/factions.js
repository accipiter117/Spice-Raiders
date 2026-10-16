// Faction definitions. Retune or replace freely: the engine only reads these
// fields, it never checks a faction by name.
//
//   annexCostMult     multiplier on Authority cost to annex peacefully
//   visionBonus       extra regions of sight range
//   combatMult        multiplier on combat strength (attack and defence)
//   solariMult        multiplier on Solari income from villages
//   supplyImmune      terrains where this faction's units take no supply loss
//   wormMult          multiplier on harvester worm risk
//   raid              null, or { solari } gained by raiding a neighbouring village
//   units             unit types this faction can recruit (see units.js)

export const FACTIONS = {
  atreides: {
    id: 'atreides',
    name: 'House Atreides',
    short: 'Atreides',
    colour: '#3f7fd0',
    blurb: 'Diplomats. Annexing villages costs 25% less Authority, and they see one region further.',
    annexCostMult: 0.75,
    visionBonus: 1,
    combatMult: 1,
    solariMult: 1,
    supplyImmune: [],
    wormMult: 1,
    raid: null,
    units: ['trooper', 'swordmasters', 'ornithopter'],
  },
  harkonnen: {
    id: 'harkonnen',
    name: 'House Harkonnen',
    short: 'Harkonnen',
    colour: '#c0392b',
    blurb: 'Brutes. +20% combat strength, and can raid a neighbouring village for Solari (it turns hostile).',
    annexCostMult: 1,
    visionBonus: 0,
    combatMult: 1.2,
    solariMult: 1,
    supplyImmune: [],
    wormMult: 1,
    raid: { solari: 25 },
    units: ['trooper', 'shockTroops', 'ornithopter'],
  },
  fremen: {
    id: 'fremen',
    name: 'The Fremen',
    short: 'Fremen',
    colour: '#d4a017',
    blurb: 'Desert people. No supply loss on sand or deep desert, harvesters face half the worm risk, but less Solari income.',
    annexCostMult: 1,
    visionBonus: 0,
    combatMult: 1,
    solariMult: 0.75,
    supplyImmune: ['sand', 'deep'],
    wormMult: 0.5,
    raid: null,
    units: ['trooper', 'fedaykin', 'ornithopter'],
  },
};

export const FACTION_IDS = Object.keys(FACTIONS);
