# Arrakis Wars

A turn-based desert strategy game for phones, inspired by Dune: Spice Wars. Three powers (House Atreides, House Harkonnen and the Fremen) fight over twenty regions of Arrakis for spice, villages and the Emperor's favour. You lead one; the computer runs the other two.

Plain HTML, CSS and JavaScript (ES modules) with no build step, so it runs straight from GitHub Pages. Best played on a phone held sideways.

## Playing it
- **On GitHub Pages:** Settings, then Pages, then "Deploy from a branch" and pick the branch and `/ (root)`.
- **Locally:** run `python3 -m http.server` in this folder and open http://localhost:8000.
- The game saves itself after every move. "How to play" is on the title screen and in the in-game menu.

## How the code is laid out
- `js/data/` the map, factions, units, balance rules and art slots. Retune the game here.
- `js/engine/` the rules, with no screen code. `applyAction(state, action)` is the only way to change a game, and games are reproducible from their seed.
- `js/ai/` the computer players (rules-based, same actions as the player) and the AI-vs-AI simulator.
- `js/ui/` the browser interface.
- `test/` run with `npm test` (Node 18 or newer), including 200 AI-vs-AI games.
- `tools/` `npm run sim` prints win rates by faction; `npm run assets` refreshes the art list below.

## Balance (computer vs computer)
Over 900 games: Atreides about 26%, Harkonnen about 38%, Fremen about 34%; median game 42 turns. Check again with `npm run sim` after any change to `js/data/`.

## Art
Every image goes through a named slot in `js/data/assets.js`. To add or replace art, save the file into `assets/` with the name listed below; if it is missing, the game shows the fallback instead. Most current art is reused from the My Arrakis project.

<!-- ASSET-LIST:START -->
| Slot | File | Size | Fallback | Status |
| --- | --- | --- | --- | --- |
| `board` | `assets/board.webp` | 563x325 (or larger, same ratio) | #120c08 | optional |
| `terrain.rock` | `assets/terrain-rock.webp` | 256x256 seamless tile | #7a5a3e | done |
| `terrain.sand` | `assets/terrain-sand.webp` | 256x256 seamless tile | #d9a95f | done |
| `terrain.deep` | `assets/terrain-deep.webp` | 256x256 seamless tile | #b9773a | done |
| `village` | `assets/village.webp` | 128x128 round, transparent | 🏘️ | done |
| `capital` | `assets/capital.webp` | 128x128 round, transparent | 🏰 | done |
| `spice` | `assets/spice.webp` | 64x64 transparent | 🟠 | done |
| `unit.trooper` | (none) | 128x128 round token | 🪖 | uses fallback by design |
| `unit.trooper.atreides` | `assets/emblem-atreides.webp` | 128x128 round token | 🪖 | done |
| `unit.trooper.harkonnen` | `assets/emblem-harkonnen.webp` | 128x128 round token | 🪖 | done |
| `unit.trooper.fremen` | `assets/emblem-fremen.webp` | 128x128 round token | 🪖 | done |
| `unit.swordmasters` | `assets/unit-swordmasters.webp` | 128x128 round portrait | ⚔️ | done |
| `unit.shockTroops` | `assets/unit-shocktroops.webp` | 128x128 round portrait | 💀 | done |
| `unit.fedaykin` | `assets/unit-fedaykin.webp` | 128x128 round portrait | 🗡️ | done |
| `unit.ornithopter` | (none) | 160x160 transparent | 🚁 | uses fallback by design |
| `unit.ornithopter.atreides` | `assets/unit-ornithopter-atreides.webp` | 160x160 transparent | 🚁 | done |
| `unit.ornithopter.harkonnen` | `assets/unit-ornithopter-harkonnen.webp` | 160x160 transparent | 🚁 | done |
| `unit.ornithopter.fremen` | `assets/unit-ornithopter-fremen.webp` | 160x160 transparent | 🚁 | done |
| `unit.harvester` | `assets/unit-harvester.webp` | 128x128 transparent (still to make) | 🚜 | **needed** |
| `faction.atreides` | `assets/emblem-atreides.webp` | 128x128 round | 🦅 #3f7047 | done |
| `faction.harkonnen` | `assets/emblem-harkonnen.webp` | 128x128 round | 🐂 #9c2a24 | done |
| `faction.fremen` | `assets/emblem-fremen.webp` | 128x128 round | 🌙 #2b6f86 | done |
| `res.solari` | `assets/res-solari.webp` | 64x64 transparent (still to make) | 🪙 | **needed** |
| `res.spice` | `assets/res-spice.webp` | 64x64 transparent | ✨ | done |
| `res.manpower` | `assets/res-manpower.webp` | 64x64 transparent (still to make) | 👥 | **needed** |
| `res.authority` | `assets/res-authority.webp` | 64x64 transparent (still to make) | 📜 | **needed** |
| `res.hegemony` | `assets/res-hegemony.webp` | 64x64 transparent (still to make) | 👑 | **needed** |
| `event.worm` | `assets/event-worm.webp` | 160x160 transparent | 🪱 | done |
| `event.combat` | `assets/event-combat.webp` | 200x200 round | ⚔️ | done |
| `event.tax` | `assets/event-tax.webp` | 64x64 transparent (still to make) | 📯 | **needed** |
| `ui.endTurn` | `assets/ui-end-turn.webp` | 240x176 | ⏩ | done |
| `ui.log` | `assets/ui-log.webp` | 240x176 | 📜 | done |
| `title` | `assets/title.webp` | 1280x720 | #1a110b | done |
| `victory` | `assets/victory.webp` | 1280x720 | #1a110b | done |
<!-- ASSET-LIST:END -->
