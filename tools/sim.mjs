// Balance report: node tools/sim.mjs [games] [seedPrefix]
import { playAiGame } from '../js/ai/sim.js';

const games = Number(process.argv[2] || 200);
const prefix = process.argv[3] || 'sim';
const wins = {};
const reasons = {};
let turns = 0;
for (let i = 0; i < games; i++) {
  const s = playAiGame(`${prefix}-${i}`);
  wins[s.result.winner] = (wins[s.result.winner] || 0) + 1;
  reasons[s.result.reason] = (reasons[s.result.reason] || 0) + 1;
  turns += s.turn;
}
const pct = (n) => Math.floor((100 * (n || 0)) / games) + '%';
console.log(`${games} games: Atreides ${pct(wins.atreides)}, Harkonnen ${pct(wins.harkonnen)}, Fremen ${pct(wins.fremen)}; average ${Math.floor(turns / games)} turns; endings ${JSON.stringify(reasons)}`);
