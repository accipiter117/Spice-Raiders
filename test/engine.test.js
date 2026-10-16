import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, applyAction, unitsIn, unitsOf, visibleRegions, annexCost, turnsUntilTax, incomeOf,
  needsAttack, militiaStrength,
} from '../js/engine/index.js';
import { FACTIONS } from '../js/data/factions.js';
import { CAPITALS, START_FIELDS } from '../js/data/map.js';
import { RULES } from '../js/data/rules.js';

const ok = (res) => {
  assert.equal(res.error, undefined);
  assert.ok(res.ok);
  return res.state;
};

// Run every faction's end turn until it is `faction`'s go again.
function passRound(state) {
  const start = state.order[state.active];
  do {
    state = ok(applyAction(state, { type: 'endTurn', faction: state.order[state.active] }));
  } while (state.order[state.active] !== start && !state.result);
  return state;
}

function withRule(path, value, fn) {
  const keys = path.split('.');
  const obj = keys.slice(0, -1).reduce((o, k) => o[k], RULES);
  const last = keys[keys.length - 1];
  const old = obj[last];
  obj[last] = value;
  try {
    return fn();
  } finally {
    obj[last] = old;
  }
}

test('same seed gives the same game; state survives JSON', () => {
  const a = createGame({ seed: 'abc', player: 'atreides' });
  const b = createGame({ seed: 'abc', player: 'atreides' });
  assert.deepEqual(a, b);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(a.order[0], 'atreides');
  assert.equal(a.turn, 1);
});

test('applyAction never changes the state it was given', () => {
  const s = createGame({ seed: 1, player: 'atreides' });
  const before = JSON.stringify(s);
  const troops = unitsIn(s, 'arrakeen').map((u) => u.id);
  ok(applyAction(s, { type: 'move', faction: 'atreides', unitIds: troops, to: 'hagga-basin' }));
  assert.equal(JSON.stringify(s), before);
});

test('only the active faction may act', () => {
  const s = createGame({ seed: 1, player: 'atreides' });
  const res = applyAction(s, { type: 'sellSpice', faction: 'harkonnen', amount: 5 });
  assert.equal(res.ok, false);
  assert.match(res.error, /not your turn/);
});

test('units move one region per turn', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  const troops = unitsIn(s, 'arrakeen').filter((u) => u.type === 'trooper').map((u) => u.id);
  s = ok(applyAction(s, { type: 'move', faction: 'atreides', unitIds: troops, to: 'shield-wall' }));
  assert.equal(s.units[troops[0]].region, 'shield-wall');
  const again = applyAction(s, { type: 'move', faction: 'atreides', unitIds: troops, to: 'great-flat' });
  assert.equal(again.ok, false);
  const far = applyAction(createGame({ seed: 1, player: 'atreides' }), {
    type: 'move', faction: 'atreides', unitIds: troops, to: 'carthag',
  });
  assert.equal(far.ok, false);
});

test('defended regions need an attack, and attacks resolve with a result', () => {
  let s = createGame({ seed: 7, player: 'atreides' });
  const troops = unitsIn(s, 'arrakeen').map((u) => u.id);
  const move = applyAction(s, { type: 'move', faction: 'atreides', unitIds: troops, to: 'tsimpo' });
  assert.equal(move.ok, false);
  const res = applyAction(s, { type: 'attack', faction: 'atreides', unitIds: troops, to: 'tsimpo' });
  s = ok(res);
  assert.ok(s.lastCombat && s.lastCombat.region === 'tsimpo');
  assert.ok(res.events.some((e) => e.type === 'combat'));
  for (const id of troops) if (s.units[id]) assert.ok(s.units[id].attacked);
});

test('a strong attack captures a neutral village', () => {
  let s = createGame({ seed: 3, player: 'atreides' });
  s.factions.atreides.solari = 500;
  s.factions.atreides.manpower = 100;
  for (let i = 0; i < 4; i++) s = ok(applyAction(s, { type: 'recruit', faction: 'atreides', region: 'arrakeen', unit: 'swordmasters' }));
  s = passRound(s);
  const army = unitsIn(s, 'arrakeen').map((u) => u.id);
  s = ok(applyAction(s, { type: 'attack', faction: 'atreides', unitIds: army, to: 'tsimpo' }));
  assert.ok(s.lastCombat.attackerWon);
  assert.equal(s.regions.tsimpo.owner, 'atreides');
  assert.ok(unitsIn(s, 'tsimpo').length > 0);
});

test('recruiting costs Solari and Manpower and the unit waits a turn', () => {
  let s = createGame({ seed: 1, player: 'harkonnen' });
  const f0 = s.factions.harkonnen;
  s = ok(applyAction(s, { type: 'recruit', faction: 'harkonnen', region: 'carthag', unit: 'shockTroops' }));
  assert.equal(s.factions.harkonnen.solari, f0.solari - 26);
  assert.equal(s.factions.harkonnen.manpower, f0.manpower - 5);
  const fresh = unitsIn(s, 'carthag').find((u) => u.type === 'shockTroops');
  assert.equal(fresh.movesLeft, 0);
  const wrong = applyAction(s, { type: 'recruit', faction: 'harkonnen', region: 'carthag', unit: 'fedaykin' });
  assert.equal(wrong.ok, false);
});

test('Atreides annex for 25% less Authority', () => {
  const s = createGame({ seed: 1 });
  assert.equal(annexCost(s, 'atreides', 'tsimpo'), Math.round(RULES.annex.villageAuthority * 0.75));
  assert.equal(annexCost(s, 'harkonnen', 'harg-pass'), RULES.annex.villageAuthority);
});

test('annexing needs a border and enough Authority', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  s.factions.atreides.authority = 0;
  assert.equal(applyAction(s, { type: 'annex', faction: 'atreides', region: 'tsimpo' }).ok, false);
  s.factions.atreides.authority = 50;
  assert.equal(applyAction(s, { type: 'annex', faction: 'atreides', region: 'carthag' }).ok, false);
  s = ok(applyAction(s, { type: 'annex', faction: 'atreides', region: 'tsimpo' }));
  assert.equal(s.regions.tsimpo.owner, 'atreides');
  assert.equal(s.factions.atreides.authority, 50 - 15);
});

test('harvesters need an owned, empty spice field', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  s.factions.atreides.solari = 100;
  assert.equal(applyAction(s, { type: 'buildHarvester', faction: 'atreides', region: START_FIELDS.atreides }).ok, false);
  assert.equal(applyAction(s, { type: 'buildHarvester', faction: 'atreides', region: 'arrakeen' }).ok, false);
  s.factions.atreides.authority = 50;
  s = ok(applyAction(s, { type: 'annex', faction: 'atreides', region: 'shield-wall' }));
  assert.equal(applyAction(s, { type: 'buildHarvester', faction: 'atreides', region: 'shield-wall' }).ok, false);
});

test('selling spice pays Solari', () => {
  let s = createGame({ seed: 1, player: 'fremen' });
  const before = s.factions.fremen;
  s = ok(applyAction(s, { type: 'sellSpice', faction: 'fremen', amount: 5 }));
  assert.equal(s.factions.fremen.spice, before.spice - 5);
  assert.equal(s.factions.fremen.solari, before.solari + 5 * RULES.market.solariPerSpice);
  assert.equal(applyAction(s, { type: 'sellSpice', faction: 'fremen', amount: 999 }).ok, false);
});

test('only Harkonnen can raid, with a cooldown, and the village turns hostile', () => {
  let s = createGame({ seed: 1, player: 'harkonnen' });
  const solari = s.factions.harkonnen.solari;
  s = ok(applyAction(s, { type: 'raid', faction: 'harkonnen', region: 'harg-pass' }));
  assert.equal(s.factions.harkonnen.solari, solari + FACTIONS.harkonnen.raid.solari);
  assert.ok(militiaStrength(s, 'harg-pass', 'harkonnen') > militiaStrength(s, 'harg-pass', 'atreides'));
  assert.ok(s.regions['harg-pass'].hostile.includes('harkonnen'));
  assert.equal(applyAction(s, { type: 'raid', faction: 'harkonnen', region: 'gara-kulon' }).ok, false);
  s.factions.harkonnen.authority = 100;
  assert.equal(applyAction(s, { type: 'annex', faction: 'harkonnen', region: 'harg-pass' }).ok, false);
  const a = createGame({ seed: 1, player: 'atreides' });
  assert.equal(applyAction(a, { type: 'raid', faction: 'atreides', region: 'tsimpo' }).ok, false);
});

test('ending a round pays income and counts down to tax', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  const before = s.factions.atreides.authority;
  const income = incomeOf(s, 'atreides').authority;
  assert.equal(income, RULES.income.authority + FACTIONS.atreides.authorityBonus);
  assert.equal(turnsUntilTax(s), RULES.tax.interval - 1);
  s = passRound(s);
  assert.equal(s.turn, 2);
  assert.equal(s.factions.atreides.authority, before + income);
});

test('spice tax: paying gives Hegemony, missing costs Hegemony and Authority', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  s.tax.nextTurn = 1;
  s.factions.atreides.spice = 500;
  s.factions.harkonnen.spice = 0;
  s.factions.harkonnen.hegemony = 30;
  s.factions.harkonnen.authority = 30;
  const heg = s.factions.atreides.hegemony;
  s = passRound(s);
  assert.ok(s.factions.atreides.hegemony >= heg + RULES.tax.hegemonyPaid);
  assert.ok(s.factions.harkonnen.hegemony < 30 + RULES.tax.hegemonyPaid);
  assert.equal(s.tax.amount, RULES.tax.firstAmount + RULES.tax.increase);
  assert.equal(s.tax.nextTurn, 1 + RULES.tax.interval);
});

test('worms can swallow harvesters on sand', () => {
  withRule('worms.sand', 1, () => {
    let s = createGame({ seed: 1, player: 'atreides' });
    s = passRound(s);
    assert.equal(unitsIn(s, START_FIELDS.atreides).length, 0);
    assert.ok(s.log.some((e) => e.type === 'worm'));
  });
});

test('supply: units outside territory lose health, Fremen do not on sand', () => {
  let s = createGame({ seed: 1, player: 'atreides' });
  const id = unitsIn(s, 'arrakeen').find((u) => u.type === 'trooper').id;
  s = ok(applyAction(s, { type: 'move', faction: 'atreides', unitIds: [id], to: 'shield-wall' }));
  s = passRound(s);
  assert.equal(s.units[id].hp, 10 - RULES.supply.lossOutside);

  let f = createGame({ seed: 1, player: 'fremen' });
  const fid = unitsIn(f, 'sietch-tabr').find((u) => u.type === 'trooper').id;
  f = ok(applyAction(f, { type: 'move', faction: 'fremen', unitIds: [fid], to: 'habbanya-erg' }));
  f = passRound(f);
  assert.equal(f.units[fid].hp, 10);
});

test('taking a capital eliminates that faction; losing yours ends the game', () => {
  let s = createGame({ seed: 5, player: 'harkonnen' });
  for (const u of unitsOf(s, 'harkonnen')) delete s.units[u.id];
  s.regions[CAPITALS.harkonnen].militia = 0;
  s.active = s.order.indexOf('fremen');
  const trooper = unitsIn(s, 'sietch-tabr').find((u) => u.type === 'trooper');
  trooper.region = 'false-wall-east';
  s = ok(applyAction(s, { type: 'attack', faction: 'fremen', unitIds: [trooper.id], to: 'carthag' }));
  assert.equal(s.factions.harkonnen.alive, false);
  assert.equal(s.regions.carthag.owner, 'fremen');
  assert.ok(s.result);
  assert.equal(s.result.reason, 'capital-lost');
  assert.equal(applyAction(s, { type: 'endTurn', faction: 'fremen' }).ok, false);
});

test('fog of war: own land plus neighbours; Atreides see further', () => {
  const s = createGame({ seed: 1 });
  const h = visibleRegions(s, 'harkonnen');
  assert.ok(h.has('carthag') && h.has('harg-pass'));
  assert.ok(!h.has('arrakeen'));
  assert.ok(visibleRegions(s, 'atreides').size > visibleRegions(s, 'harkonnen').size);
});

test('owned land without a village keeps a garrison, so it must be attacked', () => {
  const s = createGame({ seed: 1, player: 'harkonnen' });
  assert.equal(s.regions['hagga-basin'].owner, 'atreides');
  assert.ok(needsAttack(s, 'harkonnen', 'hagga-basin'));
  assert.equal(s.regions['hagga-basin'].militia, RULES.militia.outpost.hp);
  assert.ok(militiaStrength(s, 'hagga-basin') > 0);
});

test('deep desert cannot be owned, but harvesters can be sent onto its spice', () => {
  let s = createGame({ seed: 1, player: 'fremen' });
  s.factions.fremen.authority = 50;
  s.factions.fremen.solari = 100;
  const annex = applyAction(s, { type: 'annex', faction: 'fremen', region: 'habbanya-erg' });
  assert.equal(annex.ok, false);
  assert.match(annex.error, /Deep desert/);
  s = ok(applyAction(s, { type: 'buildHarvester', faction: 'fremen', region: 'habbanya-erg' }));
  assert.equal(s.regions['habbanya-erg'].owner, null);
  assert.equal(unitsIn(s, 'habbanya-erg')[0].type, 'harvester');
  // too far from Fremen land
  assert.equal(applyAction(s, { type: 'buildHarvester', faction: 'fremen', region: 'minor-erg' }).ok, false);
});

test('Fremen stride over the desert; stepping onto rock ends the move', () => {
  let s = createGame({ seed: 1, player: 'fremen' });
  const id = unitsIn(s, 'sietch-tabr').find((u) => u.type === 'trooper').id;
  s = ok(applyAction(s, { type: 'move', faction: 'fremen', unitIds: [id], to: 'habbanya-erg' }));
  s = ok(applyAction(s, { type: 'move', faction: 'fremen', unitIds: [id], to: 'great-flat' }));
  assert.equal(s.units[id].movesLeft, 0);
  let r = createGame({ seed: 1, player: 'fremen' });
  const rid = unitsIn(r, 'sietch-tabr').find((u) => u.type === 'trooper').id;
  r.units[rid].region = 'cielago-depression';
  r = ok(applyAction(r, { type: 'move', faction: 'fremen', unitIds: [rid], to: 'false-wall-east' }));
  assert.equal(r.units[rid].movesLeft, 0);
  let a = createGame({ seed: 1, player: 'atreides' });
  const aid = unitsIn(a, 'arrakeen').find((u) => u.type === 'trooper').id;
  a = ok(applyAction(a, { type: 'move', faction: 'atreides', unitIds: [aid], to: 'hagga-basin' }));
  assert.equal(applyAction(a, { type: 'move', faction: 'atreides', unitIds: [aid], to: 'great-flat' }).ok, false);
});

test('only the Fremen can win over a sietch peacefully', () => {
  const s = createGame({ seed: 1 });
  s.factions.atreides.authority = 100;
  s.factions.fremen.authority = 100;
  s.regions['shield-wall'].owner = 'atreides';
  s.active = s.order.indexOf('atreides');
  const a = applyAction(s, { type: 'annex', faction: 'atreides', region: 'habbanya-ridge' });
  assert.equal(a.ok, false);
  assert.match(a.error, /Fremen/);
  s.active = s.order.indexOf('fremen');
  ok(applyAction(s, { type: 'annex', faction: 'fremen', region: 'habbanya-ridge' }));
  assert.ok(militiaStrength(s, 'habbanya-ridge') >= RULES.militia.sietch.strength);
});

test('Atreides villages defend harder than other houses\' villages', () => {
  const s = createGame({ seed: 1 });
  s.regions['tsimpo'].owner = 'atreides';
  s.regions['harg-pass'].owner = 'harkonnen';
  s.regions['tsimpo'].militia = RULES.militia.owned.hp;
  s.regions['harg-pass'].militia = RULES.militia.owned.hp;
  assert.ok(militiaStrength(s, 'tsimpo') > militiaStrength(s, 'harg-pass'));
});
