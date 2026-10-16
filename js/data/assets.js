// Every image in the game goes through a named slot here.
// To add art: drop the file into /assets/ with the listed filename. If the file
// is missing the game uses the plain fallback (emoji and/or colour) instead.
// Set `file: null` to force the fallback.

export const ASSET_SLOTS = {
  // Painted board. Region outlines are drawn on top of it.
  board: { file: 'assets/board.png', fallback: { colour: '#2a1c12' }, size: '563x325 (or larger, same ratio)' },

  // Terrain textures, tiled inside each region
  'terrain.rock': { file: 'assets/terrain-rock.png', fallback: { colour: '#7a6555' }, size: '256x256 tile' },
  'terrain.sand': { file: 'assets/terrain-sand.png', fallback: { colour: '#d9a95f' }, size: '256x256 tile' },
  'terrain.deep': { file: 'assets/terrain-deep.png', fallback: { colour: '#b9773a' }, size: '256x256 tile' },

  // Map markers
  village: { file: 'assets/village.png', fallback: { emoji: '🏘️' }, size: '128x128 transparent' },
  capital: { file: 'assets/capital.png', fallback: { emoji: '🏰' }, size: '128x128 transparent' },
  spice: { file: 'assets/spice.png', fallback: { emoji: '🟠' }, size: '64x64 transparent' },

  // Units
  'unit.trooper': { file: 'assets/unit-trooper.png', fallback: { emoji: '🪖' }, size: '128x128 transparent' },
  'unit.swordmasters': { file: 'assets/unit-swordmasters.png', fallback: { emoji: '⚔️' }, size: '128x128 transparent' },
  'unit.shockTroops': { file: 'assets/unit-shocktroops.png', fallback: { emoji: '💀' }, size: '128x128 transparent' },
  'unit.fedaykin': { file: 'assets/unit-fedaykin.png', fallback: { emoji: '🗡️' }, size: '128x128 transparent' },
  'unit.ornithopter': { file: 'assets/unit-ornithopter.png', fallback: { emoji: '🚁' }, size: '128x128 transparent' },
  'unit.harvester': { file: 'assets/unit-harvester.png', fallback: { emoji: '🚜' }, size: '128x128 transparent' },

  // Faction emblems (pick screen, top bar)
  'faction.atreides': { file: 'assets/emblem-atreides.png', fallback: { emoji: '🦅', colour: '#3f7fd0' }, size: '256x256 transparent' },
  'faction.harkonnen': { file: 'assets/emblem-harkonnen.png', fallback: { emoji: '🐂', colour: '#c0392b' }, size: '256x256 transparent' },
  'faction.fremen': { file: 'assets/emblem-fremen.png', fallback: { emoji: '🌙', colour: '#d4a017' }, size: '256x256 transparent' },

  // Resource icons (top bar)
  'res.solari': { file: 'assets/res-solari.png', fallback: { emoji: '🪙' }, size: '64x64 transparent' },
  'res.spice': { file: 'assets/res-spice.png', fallback: { emoji: '✨' }, size: '64x64 transparent' },
  'res.manpower': { file: 'assets/res-manpower.png', fallback: { emoji: '👥' }, size: '64x64 transparent' },
  'res.authority': { file: 'assets/res-authority.png', fallback: { emoji: '📜' }, size: '64x64 transparent' },
  'res.hegemony': { file: 'assets/res-hegemony.png', fallback: { emoji: '👑' }, size: '64x64 transparent' },

  // Event toasts and cards
  'event.worm': { file: 'assets/event-worm.png', fallback: { emoji: '🪱' }, size: '256x256' },
  'event.combat': { file: 'assets/event-combat.png', fallback: { emoji: '⚔️' }, size: '256x256' },
  'event.tax': { file: 'assets/event-tax.png', fallback: { emoji: '📯' }, size: '256x256' },

  // Title screen
  title: { file: 'assets/title.jpg', fallback: { colour: '#1a110b' }, size: '1600x900' },
};
