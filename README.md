# Arrakis Wars

A turn-based, phone-first desert strategy prototype inspired by Dune: Spice Wars. Plain HTML, CSS and JavaScript (ES modules), no build step: open `index.html` from any static host (GitHub Pages).

## Layout
- `js/data/` map, factions, units, balance rules and art slots (edit these to retune)
- `js/engine/` pure rules engine, no DOM. `applyAction(state, action)` is the only way to change a game
- `js/ai/` rules-based AI and the AI-vs-AI simulator
- `js/ui/` browser interface
- `test/` run with `npm test` (Node 18+)

## Running locally
`python3 -m http.server` in this folder, then open http://localhost:8000. Balance report: `npm run sim`.
