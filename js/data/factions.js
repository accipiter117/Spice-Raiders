// Faction definitions. Retune or replace freely: the engine only reads these
// fields, it never checks a faction by name.
//
//   annexCostMult     multiplier on Authority cost to annex peacefully
//   visionBonus       extra regions of sight range
//   authorityBonus    extra Authority income each turn
//   militiaMult       multiplier on the militia of villages and outposts this faction owns
//   combatMult        multiplier on combat strength (attack and defence)
//   solariMult        multiplier on Solari income from villages
//   terrainCombat     extra combat multiplier when fighting in a terrain
//   supplyImmune      terrains where this faction's units take no supply loss
//   wormMult          multiplier on harvester worm risk
//   raid              null, or { solari } gained by raiding a neighbouring village
//   sietchFriend      can annex Fremen sietches peacefully (others must fight)
//   deepReach         how far from your land you can send a harvester into deep desert
//   desertStride      units get one extra move a turn while travelling over sand
//                     or deep desert (moving onto rock ends their movement)
//   colour / ink      map tint / readable text colour (from My Arrakis)
//   units             unit types this faction can recruit (see units.js)

export const FACTIONS = {
  atreides: {
    id: 'atreides',
    name: 'House Atreides',
    short: 'Atreides',
    colour: '#3f7047',
    ink: '#7fbf88',
    blurb: 'Diplomats. Extra Authority each turn, annexing costs 25% less, their loyal villages defend much harder, and they see one region further.',
    annexCostMult: 0.75,
    visionBonus: 1,
    authorityBonus: 2,
    militiaMult: 1.75,
    combatMult: 1,
    terrainCombat: {},
    solariMult: 1,
    supplyImmune: [],
    wormMult: 1,
    raid: null,
    deepReach: 1,
    desertStride: false,
    sietchFriend: false,
    units: ['trooper', 'swordmasters', 'ornithopter'],
  },
  harkonnen: {
    id: 'harkonnen',
    name: 'House Harkonnen',
    short: 'Harkonnen',
    colour: '#9c2a24',
    ink: '#e0705f',
    blurb: 'Brutes. +20% combat strength, and every few turns can raid a neighbouring village for Solari (it turns hostile).',
    annexCostMult: 1,
    visionBonus: 0,
    authorityBonus: 0,
    militiaMult: 1,
    combatMult: 1.2,
    terrainCombat: {},
    solariMult: 1,
    supplyImmune: [],
    wormMult: 1,
    raid: { solari: 20, cooldown: 3 }, // cooldown: turns between raids
    deepReach: 1,
    desertStride: false,
    sietchFriend: false,
    units: ['trooper', 'shockTroops', 'ornithopter'],
  },
  fremen: {
    id: 'fremen',
    name: 'The Fremen',
    short: 'Fremen',
    colour: '#2b6f86',
    ink: '#6fc3dd',
    blurb: 'Masters of the desert. Move further over sand, no supply loss in the desert, half the worm risk, and only they can win over the sietches. Less Solari income.',
    annexCostMult: 1,
    visionBonus: 0,
    authorityBonus: 0,
    militiaMult: 1,
    combatMult: 1,
    terrainCombat: {},
    solariMult: 0.73,
    supplyImmune: ['sand', 'deep'],
    wormMult: 0.5,
    raid: null,
    deepReach: 1,
    desertStride: true,
    sietchFriend: true,
    units: ['trooper', 'fedaykin', 'ornithopter'],
  },
};

export const FACTION_IDS = Object.keys(FACTIONS);
