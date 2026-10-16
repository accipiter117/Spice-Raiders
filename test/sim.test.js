import test from 'node:test';
import assert from 'node:assert/strict';
import { playAiGame } from '../js/ai/sim.js';

const RESOURCES = ['solari', 'spice', 'manpower', 'authority', 'hegemony'];

test('200 AI-vs-AI games: no crashes, no negative resources, all end within 120 turns', () => {
  const winners = {};
  for (let i = 0; i < 200; i++) {
    const seed = `test-${i}`;
    let negative = null;
    const state = playAiGame(seed, {
      maxRounds: 130,
      onRound: (s) => {
        for (const f of Object.values(s.factions)) {
          for (const r of RESOURCES) {
            if (!(f[r] >= 0)) negative = `${seed} turn ${s.turn}: ${f.id} ${r} = ${f[r]}`;
          }
        }
        for (const u of Object.values(s.units)) if (!(u.hp > 0)) negative = `${seed}: unit ${u.id} hp ${u.hp}`;
      },
    });
    assert.equal(negative, null, negative);
    assert.ok(state.result, `${seed} did not finish`);
    assert.ok(state.turn <= 120, `${seed} lasted ${state.turn} turns`);
    winners[state.result.winner] = (winners[state.result.winner] || 0) + 1;
  }
  assert.ok(Object.keys(winners).length >= 1);
});
