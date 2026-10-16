// Balance numbers. Everything tunable that is not tied to a faction or unit.

export const RULES = {
  maxTurns: 100, // safety net: at the end of this turn the highest Hegemony wins
  hegemonyToWin: 100,

  start: {
    solari: 40, spice: 10, manpower: 8, authority: 10,
    units: ['trooper', 'trooper'],
    harvester: true, // a harvester on the starting spice field
  },

  income: {
    villageSolari: 6,
    villageManpower: 2,
    capitalSolari: 6, // extra on top of the village amount
    capitalManpower: 2,
    authority: 3,
    spicePerField: 4, // per point of spice field value, per harvester
    hegemonyPerVillage: 0.5, // rounded down across all villages each turn
  },

  annex: {
    villageAuthority: 20,
    emptyAuthority: 6, // non-village regions (spice fields, passes)
  },

  market: { solariPerSpice: 2, lot: 10 },

  militia: {
    // a village defends itself with militia: strength at full health, and health
    neutral: { strength: 6, hp: 18 },
    owned: { strength: 4, hp: 12 },
    capital: { strength: 12, hp: 36 },
    regenPerTurn: 4,
  },

  combat: {
    randomSpread: 0.15, // each side rolls +/- 15%
    loserLoss: 0.6, // loser loses this share of health, times winner/loser strength
    winnerLoss: 0.4, // winner loses this share, times loser/winner strength
    woundedFloor: 0.5, // a unit at 1 health still fights at 50% strength
    terrainDefence: { rock: 1.25, sand: 1, deep: 1 },
    hegemonyPerWin: 1,
    hegemonyForCapital: 15,
  },

  worms: { sand: 0.07, deep: 0.14 },

  supply: {
    lossOutside: 2, // health lost per turn outside owned territory (times terrain mult)
    healInside: 2,
  },

  // When Solari cannot cover upkeep, every unit loses this much health
  unpaidUpkeepDamage: 2,

  tax: {
    interval: 6, // due at the end of every 6th turn
    firstAmount: 20,
    increase: 10,
    hegemonyPaid: 10,
    hegemonyMissed: 10,
    authorityMissed: 10,
  },
};
