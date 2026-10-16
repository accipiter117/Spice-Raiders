// Builds the HTML for the top bar and the right-hand panel. Buttons carry
// data-act attributes; main.js handles the clicks.
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { TERRAIN, CAPITALS } from '../data/map.js';
import { RULES } from '../data/rules.js';
import {
  regionDef, unitsIn, incomeOf, upkeepOf, turnsUntilTax, annexBlocker, annexCost, harvesterIn,
  militiaStrength, defenceStrength, attackStrength, wormRisk, adjacentToTerritory, raidBlocker, harvesterBlocker, militiaSpec,
} from '../engine/index.js';
import { icon } from './assets.js';

const n = (v) => Math.floor(v);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function renderTopbar(state) {
  const me = state.player;
  const f = state.factions[me];
  const inc = incomeOf(state, me);
  const net = inc.solari - upkeepOf(state, me);
  const due = turnsUntilTax(state);
  const sign = (v) => (v >= 0 ? '+' + v : String(v));
  const res = (slot, value, delta, warn = false, title = '') =>
    `<span class="res${warn ? ' warn' : ''}" title="${title}">${icon(slot)}<b>${n(value)}</b>${delta !== null ? `<span class="delta">${sign(delta)}</span>` : ''}</span>`;
  return [
    `<span class="topbar-faction" style="color:${FACTIONS[me].colour}">${icon('faction.' + me)}${FACTIONS[me].short}</span>`,
    res('res.solari', f.solari, net, net < 0, 'Solari'),
    res('res.spice', f.spice, inc.spice, f.spice < state.tax.amount && due <= 2, 'Spice'),
    res('res.manpower', f.manpower, inc.manpower, false, 'Manpower'),
    res('res.authority', f.authority, inc.authority, false, 'Authority'),
    `<span class="res" title="Hegemony">${icon('res.hegemony')}<b>${n(f.hegemony)}</b><span class="delta">/${RULES.hegemonyToWin}</span></span>`,
    '<span class="topbar-spacer"></span>',
    `<span>Turn <b>${state.turn}</b></span>`,
    `<span class="tax-due">${icon('event.tax')} Tax <b>${state.tax.amount}</b> ${due === 0 ? '<b>this turn</b>' : `in ${due}`}</span>`,
  ].join('');
}

export function renderPanel(state, ui) {
  if (ui.confirmAttack) return attackConfirm(state, ui);
  if (!ui.selected) return overview(state);
  return regionPanel(state, ui);
}

function overview(state) {
  const me = state.player;
  const f = state.factions[me];
  const inc = incomeOf(state, me);
  const upkeep = upkeepOf(state, me);
  const lot = RULES.market.lot;
  const surplus = Math.max(0, f.spice - state.tax.amount);
  const rivals = state.order.filter((id) => id !== me).map((id) => {
    const r = state.factions[id];
    return `<dt style="color:${FACTIONS[id].colour}">${FACTIONS[id].short}</dt><dd>${r.alive ? `${n(r.hegemony)} Hegemony` : 'Fallen'}</dd>`;
  });
  return `
    <div class="p-title">${icon('faction.' + me)} ${FACTIONS[me].name}</div>
    <div class="p-sub">Tap a region on the map to see it and give orders.</div>
    <div class="p-section"><h3>Each turn</h3>
      <dl class="facts">
        <dt>Solari</dt><dd>+${inc.solari} income, -${upkeep} upkeep</dd>
        <dt>Spice</dt><dd>+${inc.spice} from harvesters</dd>
        <dt>Manpower</dt><dd>+${inc.manpower}</dd>
        <dt>Authority</dt><dd>+${inc.authority}</dd>
        <dt>Hegemony</dt><dd>+${inc.hegemony} from villages</dd>
      </dl>
    </div>
    <div class="p-section"><h3>Imperial spice tax</h3>
      <div class="note">${state.tax.amount} spice due ${turnsUntilTax(state) === 0 ? 'at the end of this turn' : `in ${turnsUntilTax(state)} turn(s)`}. Paying earns ${RULES.tax.hegemonyPaid} Hegemony; missing it costs Hegemony and Authority.</div>
    </div>
    <div class="p-section"><h3>Spice market (${RULES.market.solariPerSpice} Solari each)</h3>
      <div class="actions">
        <button data-act="sell" data-amount="${lot}" ${f.spice < lot ? 'disabled' : ''}>Sell ${lot} spice <span class="cost">+${lot * RULES.market.solariPerSpice} Solari</span></button>
        <button data-act="sell" data-amount="${surplus}" ${surplus <= 0 ? 'disabled' : ''}>Sell all but the tax <span class="cost">${surplus} spice</span></button>
      </div>
    </div>
    <div class="p-section"><h3>Rivals</h3><dl class="facts">${rivals.join('')}</dl></div>
  `;
}

function unitRow(state, u, ui, mine) {
  const def = UNITS[u.type];
  const spent = mine && !def.static && u.movesLeft <= 0 && u.attacked;
  const on = ui.chosen.has(u.id);
  const status = def.static
    ? `Worm risk ${Math.round(wormRisk(state, u) * 100)}% a turn`
    : mine
      ? u.attacked ? 'Done this turn' : u.movesLeft > 0 ? 'Ready' : 'Moved (can still attack)'
      : FACTIONS[u.faction].short;
  const tag = mine && !def.static ? 'button' : 'div';
  return `<${tag} class="unit-row${on ? ' on' : ''}${spent ? ' spent' : ''}" ${tag === 'button' ? `data-act="toggle" data-unit="${u.id}"` : ''}>
    <span class="u-icon">${icon('unit.' + u.type)}</span>
    <span class="u-name">${def.name}<div class="hp"><i style="width:${(100 * u.hp) / def.hp}%"></i></div></span>
    <span class="u-state">${status}</span>
  </${tag}>`;
}

function regionPanel(state, ui) {
  const me = state.player;
  const id = ui.selected;
  const def = regionDef(id);
  const reg = state.regions[id];
  const seen = ui.visible.has(id);
  const owner = reg.owner;
  const isCap = Object.values(CAPITALS).includes(id);
  const ownerText = !seen && owner !== me ? 'Unknown' : owner ? `<span style="color:${FACTIONS[owner].colour}">${FACTIONS[owner].short}</span>` : 'Neutral';
  const facts = [
    `<dt>Terrain</dt><dd>${TERRAIN[def.terrain].name}${TERRAIN[def.terrain].wormRisk ? ' (worms)' : ''}</dd>`,
    `<dt>Owner</dt><dd>${ownerText}</dd>`,
  ];
  if (def.village) facts.push(`<dt>Village</dt><dd>${isCap ? 'Capital' : 'Yes'}${reg.hostile.includes(me) ? ' (hostile to you)' : ''}</dd>`);
  if (def.spice) facts.push(`<dt>Spice field</dt><dd>${'●'.repeat(def.spice)} (+${def.spice * RULES.income.spicePerField} a turn)</dd>`);
  if (!TERRAIN[def.terrain].ownable) facts.push('<dt>Holding</dt><dd>Nobody can own deep desert</dd>');
  if (def.sietch) facts.push('<dt>Sietch</dt><dd>Only the Fremen can annex it</dd>');
  if (militiaSpec(state, id) && seen && owner !== me) facts.push(`<dt>${def.village ? 'Militia' : 'Garrison'}</dt><dd>strength ${n(militiaStrength(state, id, me))}</dd>`);

  const parts = [
    `<div class="p-title">${esc(def.name)}</div>`,
    `<dl class="facts">${facts.join('')}</dl>`,
  ];

  if (!seen) {
    parts.push('<div class="p-section note">Out of sight. Move units or expand nearby to see what is here.</div>');
    parts.push(backButton());
    return parts.join('');
  }

  const units = unitsIn(state, id);
  const mine = units.filter((u) => u.faction === me);
  const theirs = units.filter((u) => u.faction !== me);

  if (ui.mode === 'orders') {
    const count = [...ui.chosen].filter((u) => state.units[u]).length;
    const t = ui.targets || { move: [], attack: [] };
    parts.push(`<div class="p-section"><h3>Orders</h3>
      <div class="note">${count} unit(s) chosen. Tap a <b style="color:var(--good)">green</b> region to move${t.attack.length ? ', or a <b style="color:var(--bad)">red</b> one to attack' : ''}.</div>
      ${!t.move.length && !t.attack.length ? '<div class="why">Nowhere to go: these units have already acted.</div>' : ''}
      <div class="actions" style="margin-top:6px"><button data-act="cancel-orders">Cancel</button></div>
    </div>`);
  }

  if (mine.length) {
    const movable = mine.filter((u) => !UNITS[u.type].static);
    parts.push(`<div class="p-section"><h3>Your units${movable.length ? ' (tap to choose)' : ''}</h3><div class="units">${mine.map((u) => unitRow(state, u, ui, true)).join('')}</div></div>`);
    if (ui.mode !== 'orders' && movable.length) {
      const chosen = movable.filter((u) => ui.chosen.has(u.id));
      const canAct = chosen.some((u) => u.movesLeft > 0 || !u.attacked);
      parts.push(`<div class="actions"><button class="primary" data-act="orders" ${chosen.length && canAct ? '' : 'disabled'}>Give orders <span class="cost">${chosen.length} unit(s)</span></button></div>`);
    }
  }
  if (theirs.length) {
    parts.push(`<div class="p-section"><h3>Other units</h3><div class="units">${theirs.map((u) => unitRow(state, u, ui, false)).join('')}</div></div>`);
  }

  if (ui.mode !== 'orders') parts.push(regionActions(state, id));
  parts.push(backButton());
  return parts.join('');
}

function regionActions(state, id) {
  const me = state.player;
  const f = state.factions[me];
  const def = regionDef(id);
  const reg = state.regions[id];
  const out = [];
  if (reg.owner === me && def.village) {
    const rows = FACTIONS[me].units.map((type) => {
      const u = UNITS[type];
      const ok = f.solari >= u.cost.solari && f.manpower >= u.cost.manpower;
      return `<button data-act="recruit" data-unit="${type}" ${ok ? '' : 'disabled'}>${icon('unit.' + type)} ${u.name}<span class="cost">${u.cost.solari} Sol · ${u.cost.manpower} Man · ${u.upkeep}/turn</span></button>`;
    });
    out.push(`<div class="p-section"><h3>Recruit (ready next turn)</h3><div class="actions">${rows.join('')}</div></div>`);
  }
  if (def.spice > 0 && !harvesterIn(state, id)) {
    const c = UNITS.harvester.cost.solari;
    const blocker = harvesterBlocker(state, me, id);
    const mine = reg.owner === me || (!TERRAIN[def.terrain].ownable && !/territory/.test(blocker || ''));
    if (mine) {
      out.push(`<div class="p-section"><h3>Spice</h3><div class="actions"><button data-act="harvester" ${blocker ? 'disabled' : ''}>${icon('unit.harvester')} ${reg.owner === me ? 'Build' : 'Send'} harvester<span class="cost">${c} Solari</span></button>${blocker ? `<div class="why">${esc(blocker)}</div>` : ''}</div></div>`);
    }
  }
  if (!reg.owner && TERRAIN[def.terrain].ownable && adjacentToTerritory(state, me, id)) {
    const blocker = annexBlocker(state, me, id);
    out.push(`<div class="p-section"><h3>Annex peacefully</h3><div class="actions"><button data-act="annex" ${blocker ? 'disabled' : ''}>${icon('res.authority')} Annex ${def.village ? 'village' : 'region'}<span class="cost">${annexCost(state, me, id)} Authority</span></button>${blocker ? `<div class="why">${esc(blocker)}</div>` : ''}</div></div>`);
  }
  const raid = FACTIONS[me].raid;
  if (raid && def.village && !reg.owner && !reg.hostile.includes(me)) {
    const blocker = raidBlocker(state, me, id);
    if (!blocker || !blocker.startsWith('Must border')) {
      out.push(`<div class="p-section"><h3>Raid</h3><div class="actions"><button class="danger" data-act="raid" ${blocker ? 'disabled' : ''}>Raid village<span class="cost">+${raid.solari} Solari, turns hostile</span></button>${blocker ? `<div class="why">${esc(blocker)}</div>` : ''}</div></div>`);
    }
  }
  return out.join('');
}

function attackConfirm(state, ui) {
  const me = state.player;
  const target = ui.confirmAttack;
  const units = [...ui.chosen].map((id) => state.units[id]).filter(Boolean);
  const atk = attackStrength(state, units, target);
  const dfn = defenceStrength(state, me, target);
  const ratio = dfn > 0 ? atk / dfn : Infinity;
  const verdict = ratio === Infinity ? 'Undefended. You will take it.' : ratio > 1.3 ? 'Good odds.' : ratio > 1 ? 'Risky: could go either way.' : 'Poor odds: likely defeat.';
  return `
    <div class="p-title">Attack ${esc(regionDef(target).name)}?</div>
    <div class="odds">Your strength <b>${atk.toFixed(1)}</b> vs their defence <b>${dfn.toFixed(1)}</b><br><span class="note">${verdict} Each side rolls ±${Math.round(RULES.combat.randomSpread * 100)}%.</span></div>
    <div class="actions">
      <button class="danger" data-act="attack">Attack with ${units.length} unit(s)</button>
      <button data-act="cancel-attack">Cancel</button>
    </div>`;
}

function backButton() {
  return '<div class="actions" style="margin-top:12px"><button data-act="deselect">Back to overview</button></div>';
}
