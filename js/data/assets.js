// Every image in the game goes through a named slot here.
// To add or replace art: drop the file into /assets/ with the listed filename.
// If the file is missing the game uses the plain fallback (emoji and/or colour).
// Set `file: null` to force the fallback.
//
// Unit art can be per faction: the game first looks for 'unit.<type>.<faction>',
// then 'unit.<type>'.
//
// Art marked "My Arrakis" is reused from the My Arrakis project (same owner).

export const ASSET_SLOTS = {
  // Painted board. Region outlines are drawn on top of it. (Not made yet.)
  board: { file: 'assets/board.webp', optional: true, fallback: { colour: '#120c08' }, size: '563x325 (or larger, same ratio)' },

  // Terrain textures, tiled inside each region (cut from the My Arrakis map)
  'terrain.rock': { file: 'assets/terrain-rock.webp', fallback: { colour: '#7a5a3e' }, size: '256x256 seamless tile' },
  'terrain.sand': { file: 'assets/terrain-sand.webp', fallback: { colour: '#d9a95f' }, size: '256x256 seamless tile' },
  'terrain.deep': { file: 'assets/terrain-deep.webp', fallback: { colour: '#b9773a' }, size: '256x256 seamless tile' },

  // Map markers
  village: { file: 'assets/village.webp', fallback: { emoji: '🏘️' }, size: '128x128 round, transparent' },
  capital: { file: 'assets/capital.webp', fallback: { emoji: '🏰' }, size: '128x128 round, transparent' },
  spice: { file: 'assets/spice.webp', fallback: { emoji: '🟠' }, size: '64x64 transparent' },

  // Units (troopers use each faction's token; My Arrakis)
  'unit.trooper': { file: null, fallback: { emoji: '🪖' }, size: '128x128 round token' },
  'unit.trooper.atreides': { file: 'assets/emblem-atreides.webp', fallback: { emoji: '🪖' }, size: '128x128 round token' },
  'unit.trooper.harkonnen': { file: 'assets/emblem-harkonnen.webp', fallback: { emoji: '🪖' }, size: '128x128 round token' },
  'unit.trooper.fremen': { file: 'assets/emblem-fremen.webp', fallback: { emoji: '🪖' }, size: '128x128 round token' },
  'unit.swordmasters': { file: 'assets/unit-swordmasters.webp', fallback: { emoji: '⚔️' }, size: '128x128 round portrait' },
  'unit.shockTroops': { file: 'assets/unit-shocktroops.webp', fallback: { emoji: '💀' }, size: '128x128 round portrait' },
  'unit.fedaykin': { file: 'assets/unit-fedaykin.webp', fallback: { emoji: '🗡️' }, size: '128x128 round portrait' },
  'unit.ornithopter': { file: null, fallback: { emoji: '🚁' }, size: '160x160 transparent' },
  'unit.ornithopter.atreides': { file: 'assets/unit-ornithopter-atreides.webp', fallback: { emoji: '🚁' }, size: '160x160 transparent' },
  'unit.ornithopter.harkonnen': { file: 'assets/unit-ornithopter-harkonnen.webp', fallback: { emoji: '🚁' }, size: '160x160 transparent' },
  'unit.ornithopter.fremen': { file: 'assets/unit-ornithopter-fremen.webp', fallback: { emoji: '🚁' }, size: '160x160 transparent' },
  'unit.harvester': { file: 'assets/unit-harvester.webp', fallback: { emoji: '🚜' }, size: '128x128 transparent (still to make)' },

  // Faction emblems (pick screen, top bar; My Arrakis)
  'faction.atreides': { file: 'assets/emblem-atreides.webp', fallback: { emoji: '🦅', colour: '#3f7047' }, size: '128x128 round' },
  'faction.harkonnen': { file: 'assets/emblem-harkonnen.webp', fallback: { emoji: '🐂', colour: '#9c2a24' }, size: '128x128 round' },
  'faction.fremen': { file: 'assets/emblem-fremen.webp', fallback: { emoji: '🌙', colour: '#2b6f86' }, size: '128x128 round' },

  // Resource icons (top bar)
  'res.solari': { file: 'assets/res-solari.webp', fallback: { emoji: '🪙' }, size: '64x64 transparent (still to make)' },
  'res.spice': { file: 'assets/res-spice.webp', fallback: { emoji: '✨' }, size: '64x64 transparent' },
  'res.manpower': { file: 'assets/res-manpower.webp', fallback: { emoji: '👥' }, size: '64x64 transparent (still to make)' },
  'res.authority': { file: 'assets/res-authority.webp', fallback: { emoji: '📜' }, size: '64x64 transparent (still to make)' },
  'res.hegemony': { file: 'assets/res-hegemony.webp', fallback: { emoji: '👑' }, size: '64x64 transparent (still to make)' },

  // Event toasts and cards
  'event.worm': { file: 'assets/event-worm.webp', fallback: { emoji: '🪱' }, size: '160x160 transparent' },
  'event.combat': { file: 'assets/event-combat.webp', fallback: { emoji: '⚔️' }, size: '200x200 round' },
  'event.tax': { file: 'assets/event-tax.webp', fallback: { emoji: '📯' }, size: '64x64 transparent (still to make)' },

  // Brass buttons (My Arrakis)
  'ui.endTurn': { file: 'assets/ui-end-turn.webp', fallback: { emoji: '⏩' }, size: '240x176' },
  'ui.log': { file: 'assets/ui-log.webp', fallback: { emoji: '📜' }, size: '240x176' },

  // Title and end screens (My Arrakis)
  title: { file: 'assets/title.webp', fallback: { colour: '#1a110b' }, size: '1280x720' },
  victory: { file: 'assets/victory.webp', fallback: { colour: '#1a110b' }, size: '1280x720' },
};
