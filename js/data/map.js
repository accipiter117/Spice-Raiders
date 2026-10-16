// Map data. Everything about the board lives here so it can be redrawn or
// replaced (for example by a single painted board image) without touching rules.
//
// Region fields:
//   id          unique key used everywhere in the engine
//   name        display name
//   terrain     'rock' | 'sand' | 'deep'  (see TERRAIN below)
//   village     true if the region holds a village (rock only)
//   spice       spice field value 0 to 3 (0 = no field)
//   neighbours  ids of adjacent regions (must be symmetric; tests check this)
//   points      SVG polygon outline in board coordinates
//   label       [x, y] centre point for icons and labels

export const BOARD = {
  width: 563,
  height: 325,
  padding: 12,
  // Set to an asset slot name (see assets.js) once a painted board exists.
  // Region outlines are then drawn on top of the image.
  backgroundSlot: 'board',
};

export const TERRAIN = {
  rock: { name: 'Rock', canHoldVillage: true, wormRisk: false, supplyLossMult: 1 },
  sand: { name: 'Sand', canHoldVillage: false, wormRisk: true, supplyLossMult: 1 },
  deep: { name: 'Deep desert', canHoldVillage: false, wormRisk: true, supplyLossMult: 2 },
};

export const CAPITALS = {
  atreides: 'arrakeen',
  harkonnen: 'carthag',
  fremen: 'sietch-tabr',
};

// Each faction also starts owning one neighbouring spice field (with a harvester).
export const START_FIELDS = {
  atreides: 'hagga-basin',
  harkonnen: 'red-chasm',
  fremen: 'cielago-depression',
};

export const REGIONS = [
  {
    id: 'arrakeen', name: "Arrakeen", terrain: 'rock', village: true, spice: 0,
    neighbours: ['shield-wall', 'tsimpo', 'old-gap', 'hagga-basin'],
    points: '130,100 130,150 87,175 43,150 43,100 87,75', label: [87, 125],
  },
  {
    id: 'carthag', name: "Carthag", terrain: 'rock', village: true, spice: 0,
    neighbours: ['false-wall-east', 'red-chasm', 'harg-pass', 'gara-kulon'],
    points: '520,175 520,225 476,250 433,225 433,175 476,150', label: [476, 200],
  },
  {
    id: 'cielago-depression', name: "Cielago Depression", terrain: 'deep', village: false, spice: 3,
    neighbours: ['false-wall-east', 'habbanya-erg', 'great-flat', 'minor-erg', 'sietch-tabr', 'tueks-sietch'],
    points: '346,175 346,225 303,250 260,225 260,175 303,150', label: [303, 200],
  },
  {
    id: 'false-wall-east', name: "False Wall East", terrain: 'rock', village: false, spice: 0,
    neighbours: ['carthag', 'cielago-depression', 'minor-erg', 'red-chasm', 'tueks-sietch', 'gara-kulon'],
    points: '433,175 433,225 390,250 346,225 346,175 390,150', label: [390, 200],
  },
  {
    id: 'funeral-plain', name: "Funeral Plain", terrain: 'sand', village: false, spice: 1,
    neighbours: ['pasty-mesa', 'tsimpo', 'shield-wall', 'great-flat'],
    points: '260,25 260,75 217,100 173,75 173,25 217,0', label: [217, 50],
  },
  {
    id: 'gara-kulon', name: "Gara Kulon", terrain: 'rock', village: true, spice: 0,
    neighbours: ['tueks-sietch', 'false-wall-east', 'carthag'],
    points: '476,250 476,300 433,325 390,300 390,250 433,225', label: [433, 275],
  },
  {
    id: 'great-flat', name: "The Great Flat", terrain: 'deep', village: false, spice: 3,
    neighbours: ['minor-erg', 'shield-wall', 'funeral-plain', 'pasty-mesa', 'habbanya-erg', 'cielago-depression'],
    points: '303,100 303,150 260,175 217,150 217,100 260,75', label: [260, 125],
  },
  {
    id: 'habbanya-erg', name: "Habbanya Erg", terrain: 'deep', village: false, spice: 3,
    neighbours: ['cielago-depression', 'hagga-basin', 'shield-wall', 'great-flat', 'habbanya-ridge', 'sietch-tabr'],
    points: '260,175 260,225 217,250 173,225 173,175 217,150', label: [217, 200],
  },
  {
    id: 'habbanya-ridge', name: "Habbanya Ridge", terrain: 'rock', village: true, spice: 0,
    neighbours: ['sietch-tabr', 'hagga-basin', 'habbanya-erg'],
    points: '217,250 217,300 173,325 130,300 130,250 173,225', label: [173, 275],
  },
  {
    id: 'hagga-basin', name: "Hagga Basin", terrain: 'sand', village: false, spice: 2,
    neighbours: ['habbanya-erg', 'old-gap', 'arrakeen', 'shield-wall', 'habbanya-ridge'],
    points: '173,175 173,225 130,250 87,225 87,175 130,150', label: [130, 200],
  },
  {
    id: 'harg-pass', name: "Harg Pass", terrain: 'rock', village: true, spice: 0,
    neighbours: ['red-chasm', 'carthag'],
    points: '563,100 563,150 520,175 476,150 476,100 520,75', label: [520, 125],
  },
  {
    id: 'minor-erg', name: "Minor Erg", terrain: 'sand', village: false, spice: 2,
    neighbours: ['red-chasm', 'great-flat', 'pasty-mesa', 'wind-pass', 'cielago-depression', 'false-wall-east'],
    points: '390,100 390,150 346,175 303,150 303,100 346,75', label: [346, 125],
  },
  {
    id: 'old-gap', name: "Old Gap", terrain: 'rock', village: true, spice: 0,
    neighbours: ['hagga-basin', 'arrakeen'],
    points: '87,175 87,225 43,250 0,225 0,175 43,150', label: [43, 200],
  },
  {
    id: 'pasty-mesa', name: "Pasty Mesa", terrain: 'rock', village: true, spice: 0,
    neighbours: ['wind-pass', 'funeral-plain', 'great-flat', 'minor-erg'],
    points: '346,25 346,75 303,100 260,75 260,25 303,0', label: [303, 50],
  },
  {
    id: 'red-chasm', name: "Red Chasm", terrain: 'sand', village: false, spice: 2,
    neighbours: ['harg-pass', 'minor-erg', 'wind-pass', 'false-wall-east', 'carthag'],
    points: '476,100 476,150 433,175 390,150 390,100 433,75', label: [433, 125],
  },
  {
    id: 'shield-wall', name: "Shield Wall", terrain: 'rock', village: false, spice: 0,
    neighbours: ['great-flat', 'arrakeen', 'tsimpo', 'funeral-plain', 'hagga-basin', 'habbanya-erg'],
    points: '217,100 217,150 173,175 130,150 130,100 173,75', label: [173, 125],
  },
  {
    id: 'sietch-tabr', name: "Sietch Tabr", terrain: 'rock', village: true, spice: 0,
    neighbours: ['tueks-sietch', 'habbanya-ridge', 'habbanya-erg', 'cielago-depression'],
    points: '303,250 303,300 260,325 217,300 217,250 260,225', label: [260, 275],
  },
  {
    id: 'tsimpo', name: "Tsimpo", terrain: 'rock', village: true, spice: 0,
    neighbours: ['funeral-plain', 'arrakeen', 'shield-wall'],
    points: '173,25 173,75 130,100 87,75 87,25 130,0', label: [130, 50],
  },
  {
    id: 'tueks-sietch', name: "Tuek's Sietch", terrain: 'rock', village: true, spice: 0,
    neighbours: ['gara-kulon', 'sietch-tabr', 'cielago-depression', 'false-wall-east'],
    points: '390,250 390,300 346,325 303,300 303,250 346,225', label: [346, 275],
  },
  {
    id: 'wind-pass', name: "Wind Pass", terrain: 'sand', village: false, spice: 1,
    neighbours: ['pasty-mesa', 'minor-erg', 'red-chasm'],
    points: '433,25 433,75 390,100 346,75 346,25 390,0', label: [390, 50],
  },

];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
