import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REGION_BY_ID, TERRAIN, CAPITALS, START_FIELDS } from '../js/data/map.js';
import { FACTIONS, FACTION_IDS } from '../js/data/factions.js';
import { UNITS } from '../js/data/units.js';
import { ASSET_SLOTS } from '../js/data/assets.js';

test('map has 20 regions with unique ids', () => {
  assert.equal(REGIONS.length, 20);
  assert.equal(new Set(REGIONS.map((r) => r.id)).size, 20);
});

test('neighbours are valid and symmetric', () => {
  for (const r of REGIONS) {
    assert.ok(r.neighbours.length > 0, r.id);
    for (const n of r.neighbours) {
      assert.ok(REGION_BY_ID[n], `${r.id} -> ${n} missing`);
      assert.ok(REGION_BY_ID[n].neighbours.includes(r.id), `${n} does not list ${r.id}`);
    }
  }
});

test('map is connected', () => {
  const seen = new Set([REGIONS[0].id]);
  const queue = [REGIONS[0].id];
  while (queue.length) {
    for (const n of REGION_BY_ID[queue.shift()].neighbours) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  assert.equal(seen.size, REGIONS.length);
});

test('terrain rules hold: villages only on rock, spice 0 to 3', () => {
  for (const r of REGIONS) {
    assert.ok(TERRAIN[r.terrain], r.id);
    if (r.village) assert.ok(TERRAIN[r.terrain].canHoldVillage, `${r.id} village on ${r.terrain}`);
    assert.ok(Number.isInteger(r.spice) && r.spice >= 0 && r.spice <= 3, r.id);
    assert.equal(r.points.trim().split(/\s+/).length, 6, `${r.id} polygon`);
  }
});

test('capitals are villages; starting fields border them and hold spice', () => {
  for (const id of FACTION_IDS) {
    const cap = REGION_BY_ID[CAPITALS[id]];
    assert.ok(cap && cap.village, id);
    const field = REGION_BY_ID[START_FIELDS[id]];
    assert.ok(field.spice > 0);
    assert.ok(cap.neighbours.includes(field.id));
  }
});

test('every faction can recruit real units including one elite', () => {
  for (const f of Object.values(FACTIONS)) {
    for (const u of f.units) assert.ok(UNITS[u], `${f.id}: ${u}`);
    assert.equal(f.units.filter((u) => UNITS[u].elite).length, 1, f.id);
  }
});

test('every asset slot has a fallback, and every unit and faction has a slot', () => {
  for (const [name, slot] of Object.entries(ASSET_SLOTS)) {
    assert.ok(slot.fallback && (slot.fallback.emoji || slot.fallback.colour), name);
  }
  for (const u of Object.keys(UNITS)) assert.ok(ASSET_SLOTS['unit.' + u], u);
  for (const f of FACTION_IDS) assert.ok(ASSET_SLOTS['faction.' + f], f);
});

test('README art list matches the asset slots (run npm run assets to refresh)', async () => {
  const { readFileSync } = await import('node:fs');
  const { assetTable, withAssetTable } = await import('../tools/asset-list.mjs');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.equal(readme, withAssetTable(readme, assetTable()));
});
