// Unit types. Costs are paid on recruit, upkeep is Solari per turn.
//   hp         health; a unit is destroyed at 0
//   strength   combat strength at full health
//   moves      regions it can move per turn
//   vision     extra sight range from the unit's region
//   static     cannot move or attack (harvesters)

export const UNITS = {
  trooper: {
    id: 'trooper', name: 'Troopers', cost: { solari: 12, manpower: 3 }, upkeep: 1,
    hp: 10, strength: 3, moves: 1, vision: 0,
  },
  swordmasters: {
    id: 'swordmasters', name: 'Swordmasters', elite: true, cost: { solari: 26, manpower: 5 }, upkeep: 2,
    hp: 14, strength: 5, moves: 1, vision: 0,
  },
  shockTroops: {
    id: 'shockTroops', name: 'Shock Troops', elite: true, cost: { solari: 26, manpower: 5 }, upkeep: 2,
    hp: 13, strength: 5, moves: 1, vision: 0,
  },
  fedaykin: {
    id: 'fedaykin', name: 'Fedaykin', elite: true, cost: { solari: 24, manpower: 5 }, upkeep: 2,
    hp: 12, strength: 5, moves: 1, vision: 0,
  },
  ornithopter: {
    id: 'ornithopter', name: 'Ornithopter', cost: { solari: 14, manpower: 1 }, upkeep: 1,
    hp: 4, strength: 1, moves: 2, vision: 1,
  },
  harvester: {
    id: 'harvester', name: 'Harvester', static: true, cost: { solari: 20, manpower: 0 }, upkeep: 0,
    hp: 6, strength: 0, moves: 0, vision: 0,
  },
};
