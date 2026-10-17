// UI controller: screens, player input, AI turns, toasts, cards and autosave.
import { FACTIONS, FACTION_IDS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { RULES } from '../data/rules.js';
import {
  createGame, applyAction, unitsIn, unitTargets, visibleRegions, regionDef, turnsUntilTax,
} from '../engine/index.js';
import { aiTurn } from '../ai/ai.js';
import { MapView } from './mapview.js';
import { renderTopbar, renderPanel } from './panel.js';
import { preloadAssets, icon, imageFor, unitSlot } from './assets.js';
import { saveGame, loadGame, clearSave, savedAt, hasSeenGuide, markGuideSeen } from './save.js';
import { howToPlayHtml } from './howto.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let game = null;
let busy = false;
let warnedNoSave = false;
const ui = { selected: null, chosen: new Set(), mode: 'idle', targets: null, confirmAttack: null, visible: new Set() };

const map = new MapView($('#map'), { onTap: onRegionTap });

// ---------- Screens ----------

function paintBackdrops() {
  const title = imageFor('title');
  for (const el of [$('#screen-start'), $('#rotate')]) el.style.backgroundImage = title ? `url(${title})` : '';
  const brass = (el, slot, label) => {
    const src = imageFor(slot);
    el.classList.toggle('fallback', !src);
    el.innerHTML = (src ? `<img src="${src}" alt="">` : '') + `<span>${label}</span>`;
  };
  brass($('#end-turn'), 'ui.endTurn', 'End turn');
  brass($('#log-btn'), 'ui.log', 'Log');
}

function showStart() {
  paintBackdrops();
  $('#screen-game').classList.add('hidden');
  $('#screen-start').classList.remove('hidden');
  closeModal();
  const saved = loadGame();
  const when = savedAt();
  $('#continue-wrap').innerHTML = `
    ${saved ? `<button class="primary" id="continue-btn">Continue as ${FACTIONS[saved.player].short} <span class="cost">turn ${saved.turn}${when ? ', ' + ago(when) : ''}</span></button>` : ''}
    <button id="howto-btn">How to play</button>`;
  if (saved) $('#continue-btn').onclick = () => startGame(saved);
  $('#howto-btn').onclick = () => showHowTo();
  $('#faction-cards').innerHTML = FACTION_IDS.map((id) => {
    const f = FACTIONS[id];
    const elite = UNITS[f.units.find((u) => UNITS[u].elite)];
    return `<button class="faction-card" data-faction="${id}" style="--fc:${f.colour}">
      <span class="head"><span class="emblem">${icon('faction.' + id)}</span><strong style="color:${f.ink}">${f.name}</strong></span>
      <p>${f.blurb}</p>
      <span class="elite">${icon(unitSlot(elite.id, id))} Elite: ${elite.name}</span>
    </button>`;
  }).join('');
  for (const card of document.querySelectorAll('.faction-card')) {
    card.onclick = () => {
      const pick = card.dataset.faction;
      const begin = () => startGame(createGame({ seed: Date.now(), player: pick }));
      const go = () => (hasSeenGuide() ? begin() : showHowTo(begin));
      if (saved) askConfirm(`Start a new game as ${FACTIONS[pick].short}? Your saved game will be replaced.`, 'Start new game', go);
      else go();
    };
  }
}

function startGame(state) {
  game = state;
  resetSelection();
  $('#screen-start').classList.add('hidden');
  $('#screen-game').classList.remove('hidden');
  autosave();
  render();
  // A game closed while the other powers were moving picks up where it left off
  if (game.order[game.active] !== game.player) runOtherTurns(game.logSeq);
  else turnStartNotices();
}

function autosave() {
  if (!saveGame(game) && !warnedNoSave) {
    warnedNoSave = true;
    toast('This browser is not letting the game save. Progress will be lost if you close it.', 'error');
  }
}

function ago(t) {
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

// ---------- Rendering ----------

function render() {
  if (!game) return;
  ui.visible = visibleRegions(game, game.player);
  if (ui.mode === 'orders') ui.targets = unitTargets(game, [...ui.chosen].filter((id) => game.units[id]));
  $('#topbar').innerHTML = renderTopbar(game);
  $('#panel').innerHTML = renderPanel(game, ui);
  map.render(game, ui);
  $('#end-turn').disabled = busy || !!game.result;
  const hint = ui.mode === 'orders' ? 'Tap a highlighted region' : '';
  $('#map-hint').innerHTML = hint ? `<span>${hint}</span>` : '';
}

function resetSelection() {
  ui.selected = null;
  ui.chosen = new Set();
  ui.mode = 'idle';
  ui.targets = null;
  ui.confirmAttack = null;
}

function selectRegion(id) {
  ui.selected = id;
  ui.mode = 'idle';
  ui.confirmAttack = null;
  ui.chosen = new Set(
    unitsIn(game, id)
      .filter((u) => u.faction === game.player && !UNITS[u.type].static && (u.movesLeft > 0 || !u.attacked))
      .map((u) => u.id),
  );
}

// ---------- Input ----------

function onRegionTap(id) {
  if (!game || busy || game.result) return;
  if (ui.mode === 'orders' && ui.targets) {
    const units = [...ui.chosen].filter((u) => game.units[u]);
    if (ui.targets.move.includes(id)) {
      if (act({ type: 'move', unitIds: units, to: id })) {
        selectRegion(id);
        render();
      }
      return;
    }
    if (ui.targets.attack.includes(id)) {
      ui.confirmAttack = id;
      render();
      return;
    }
  }
  selectRegion(id);
  render();
}

$('#panel').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled || busy) return;
  const a = btn.dataset.act;
  if (a === 'toggle') {
    const id = btn.dataset.unit;
    if (ui.chosen.has(id)) ui.chosen.delete(id);
    else ui.chosen.add(id);
  } else if (a === 'orders') {
    ui.mode = 'orders';
  } else if (a === 'cancel-orders') {
    ui.mode = 'idle';
  } else if (a === 'cancel-attack') {
    ui.confirmAttack = null;
  } else if (a === 'attack') {
    const target = ui.confirmAttack;
    const units = [...ui.chosen].filter((u) => game.units[u]);
    ui.confirmAttack = null;
    if (act({ type: 'attack', unitIds: units, to: target })) {
      showCombatCard(game.lastCombat);
      selectRegion(game.lastCombat.attackerWon ? target : ui.selected);
    }
  } else if (a === 'deselect') {
    resetSelection();
  } else if (a === 'sell') {
    act({ type: 'sellSpice', amount: Number(btn.dataset.amount) });
  } else if (a === 'recruit') {
    act({ type: 'recruit', region: ui.selected, unit: btn.dataset.unit });
  } else if (a === 'harvester') {
    act({ type: 'buildHarvester', region: ui.selected });
  } else if (a === 'annex') {
    act({ type: 'annex', region: ui.selected });
  } else if (a === 'raid') {
    act({ type: 'raid', region: ui.selected });
  }
  render();
});

$('#end-turn').addEventListener('click', endTurn);
$('#log-btn').addEventListener('click', () => game && showLog());
$('#topbar').addEventListener('click', (e) => {
  if (e.target.closest('#menu-btn')) showMenu();
});

// Apply a player action; show the error as a toast if it is refused.
function act(action) {
  const res = applyAction(game, { ...action, faction: game.player });
  if (!res.ok) {
    toast(res.error, 'error');
    return false;
  }
  game = res.state;
  for (const e of res.events) {
    if (e.type === 'combat' && e.combat.attacker === game.player) continue; // shown as a card
    if (e.type === 'annex' || e.type === 'raid') continue; // obvious from the panel
    toast(e.text, e.type);
  }
  autosave();
  if (game.result) showGameOver();
  return true;
}

async function endTurn() {
  if (busy || !game || game.result) return;
  const fromSeq = game.logSeq;
  const res = applyAction(game, { type: 'endTurn', faction: game.player });
  if (!res.ok) return toast(res.error, 'error');
  game = res.state;
  autosave();
  await runOtherTurns(fromSeq);
}

// Let the computer powers move until it is the player's turn again.
async function runOtherTurns(fromSeq) {
  busy = true;
  resetSelection();
  render();
  while (!game.result && game.order[game.active] !== game.player) {
    const f = game.order[game.active];
    $('#busy').classList.remove('hidden');
    $('#busy-text').textContent = `${FACTIONS[f].short} are making their moves...`;
    await sleep(450);
    game = aiTurn(game, f).state;
    autosave();
    render();
  }
  $('#busy').classList.add('hidden');
  busy = false;
  reportEvents(fromSeq);
  autosave();
  render();
  if (game.result) showGameOver();
  else turnStartNotices();
}

// Toast whatever happened since `fromSeq` that the player would know about.
function reportEvents(fromSeq) {
  const me = game.player;
  for (const e of game.log) {
    if (e.seq <= fromSeq) continue;
    const involved = (e.factions || []).includes(me);
    const visible = e.region && ui.visible.has(e.region);
    if (e.type === 'tax' && !involved) continue;
    if (e.type === 'annex' && !visible) continue;
    if (involved || visible || e.type === 'eliminated') toast(e.text, e.type);
  }
}

function turnStartNotices() {
  const due = turnsUntilTax(game);
  const f = game.factions[game.player];
  if (due === 0) {
    const short = game.tax.amount - f.spice;
    toast(`Spice tax of ${game.tax.amount} is due at the end of this turn. ${short > 0 ? `You are ${short} short.` : 'You can pay it.'}`, 'tax');
  } else if (due === 1) {
    toast(`Spice tax of ${game.tax.amount} is due next turn. You have ${f.spice}.`, 'tax');
  }
}

// ---------- Toasts and modals ----------

function toast(text, type = '') {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const slot = { worm: 'event.worm', combat: 'event.combat', tax: 'res.spice' }[type];
  el.innerHTML = (slot ? icon(slot) : '') + `<span>${escapeHtml(text)}</span>`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4300);
}

function openModal(html, art = null) {
  const box = $('#modal-box');
  const src = art && imageFor(art);
  box.classList.toggle('victory-art', !!src);
  box.style.backgroundImage = src ? `linear-gradient(180deg, transparent 0, transparent 90px, var(--basalt) 190px), url(${src})` : '';
  box.innerHTML = html;
  $('#modal').classList.remove('hidden');
}

function closeModal() {
  $('#modal').classList.add('hidden');
}

$('#modal').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-modal]');
  if (!btn) return;
  const a = btn.dataset.modal;
  if (a === 'close') closeModal();
  if (a === 'new') {
    clearSave();
    game = null;
    showStart();
  }
  if (a === 'log') showLog();
  if (a === 'howto') showHowTo();
  if (a === 'title') {
    autosave();
    game = null;
    showStart();
  }
  if (a === 'begin') {
    const next = pendingStart;
    pendingStart = null;
    closeModal();
    if (next) next();
  }
  if (a === 'quit') {
    askConfirm('Abandon this game? It will be deleted.', 'Abandon game', () => {
      clearSave();
      game = null;
      showStart();
    });
  }
  if (a === 'confirm-yes') {
    const next = pendingConfirm;
    pendingConfirm = null;
    closeModal();
    if (next) next();
  }
});

function lossText(losses) {
  const destroyed = {};
  let wounded = 0;
  for (const l of losses) {
    if (l.destroyed) destroyed[l.type] = (destroyed[l.type] || 0) + 1;
    else if (l.hpLost > 0) wounded++;
  }
  const parts = Object.entries(destroyed).map(([t, c]) => `${c} ${UNITS[t].name} lost`);
  if (wounded) parts.push(`${wounded} wounded`);
  return parts.join(', ') || 'No losses';
}

function showCombatCard(c) {
  if (!c) return;
  const me = game.player;
  const won = c.attacker === me ? c.attackerWon : !c.attackerWon;
  const name = (f) => (f ? FACTIONS[f].short : 'Militia');
  const region = regionDef(c.region).name;
  openModal(`
    <h2>${icon('event.combat')} Battle of ${escapeHtml(region)}</h2>
    <div class="big-result" style="color:${won ? 'var(--good)' : 'var(--bad)'}">${won ? 'Victory' : 'Defeat'}</div>
    <div class="card-vs">
      <div class="card-side ${c.attackerWon ? 'won' : ''}"><div class="who" style="color:${FACTIONS[c.attacker].ink}">${name(c.attacker)}</div><div class="big">${c.attackStrength}</div><div class="note">attack</div></div>
      <div class="vs">vs</div>
      <div class="card-side ${!c.attackerWon ? 'won' : ''}"><div class="who" style="color:${c.defender ? FACTIONS[c.defender].ink : 'var(--sand-soft)'}">${c.defender ? name(c.defender) : 'Village militia'}${c.defender && c.hadMilitia ? ' + militia' : ''}</div><div class="big">${c.defenceStrength}</div><div class="note">defence</div></div>
    </div>
    <div class="card-losses">
      <div><b>${name(c.attacker)}:</b> ${lossText(c.attackerLosses)}</div>
      <div><b>${c.defender ? name(c.defender) : 'Militia'}:</b> ${c.defenderLosses.length || !c.hadMilitia ? lossText(c.defenderLosses) : c.attackerWon ? 'Militia scattered' : 'Militia held'}</div>
      ${c.captured ? `<div style="color:var(--good)">${escapeHtml(region)} is now ${name(c.attacker)}.</div>` : ''}
      ${c.capitalTaken ? `<div style="color:var(--accent)">${name(c.capitalTaken)} have fallen!</div>` : ''}
    </div>
    <div class="modal-actions"><button class="primary" data-modal="close">Continue</button></div>
  `);
}

function showGameOver() {
  const r = game.result;
  const me = game.player;
  const won = r.winner === me && r.loser !== me;
  const reasons = {
    hegemony: `${FACTIONS[r.winner].short} reached ${RULES.hegemonyToWin} Hegemony.`,
    conquest: `${FACTIONS[r.winner].short} captured every rival capital.`,
    'capital-lost': 'Your capital has fallen.',
    time: `After ${RULES.maxTurns} turns, ${FACTIONS[r.winner].short} lead in Hegemony.`,
  };
  const rows = game.order
    .map((id) => game.factions[id])
    .sort((a, b) => b.hegemony - a.hegemony)
    .map((f) => `<tr><td style="color:${FACTIONS[f.id].ink}">${FACTIONS[f.id].short}${f.id === me ? ' (you)' : ''}</td><td>${n(f.hegemony)} Hegemony</td><td>${f.alive ? '' : 'Fallen'}</td></tr>`)
    .join('');
  clearSave();
  openModal(`
    <div class="big-result" style="color:${won ? 'var(--gold)' : 'var(--bad)'}">${won ? 'Victory' : 'Defeat'}</div>
    <p style="text-align:center">${reasons[r.reason] || ''} Turn ${game.turn}.</p>
    <table class="standings">${rows}</table>
    <div class="modal-actions"><button data-modal="close">View map</button><button class="primary" data-modal="new">New game</button></div>
  `, won ? 'victory' : 'title');
  render();
}

function showMenu() {
  if (!game) return;
  openModal(`
    <h2>Menu</h2>
    <div class="actions" style="display:flex;flex-direction:column;gap:8px">
      <button data-modal="close">Back to the game</button>
      <button data-modal="log">Event log</button>
      <button data-modal="howto">How to play</button>
      <button data-modal="title">Save and return to title</button>
      <button data-modal="quit" class="danger">Abandon game</button>
    </div>
    <p class="note" style="margin-top:10px">Your game saves automatically.</p>
  `);
}

// In-page confirmation (browser confirm() pop-ups are not available everywhere).
let pendingConfirm = null;
function askConfirm(text, yesLabel, onYes) {
  pendingConfirm = onYes;
  openModal(`<h2>Are you sure?</h2><p>${escapeHtml(text)}</p>
    <div class="modal-actions"><button data-modal="close">Cancel</button><button class="danger" data-modal="confirm-yes">${escapeHtml(yesLabel)}</button></div>`);
}

// The guide; when `then` is given (first game) it ends with a Start button.
let pendingStart = null;
function showHowTo(then = null) {
  pendingStart = then;
  if (then) markGuideSeen();
  openModal(`${howToPlayHtml()}
    <div class="modal-actions" style="margin-top:10px">
      ${then ? '<button class="primary" data-modal="begin">Start the game</button>' : '<button class="primary" data-modal="close">Close</button>'}
    </div>`);
}

function showLog() {
  const me = game.player;
  const lines = game.log
    .filter((e) => (e.factions || []).includes(me) || (e.region && ui.visible.has(e.region)) || e.type === 'eliminated')
    .slice(-40)
    .reverse()
    .map((e) => `<div class="note" style="padding:3px 0;border-bottom:1px solid var(--line)"><b>T${e.turn}</b> ${escapeHtml(e.text)}</div>`)
    .join('');
  openModal(`<h2>Event log</h2><div style="max-height:55vh;overflow-y:auto">${lines || '<p class="note">Nothing yet.</p>'}</div><div class="modal-actions" style="margin-top:10px"><button class="primary" data-modal="close">Close</button></div>`);
}

const n = (v) => Math.floor(v);
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

// ---------- Boot ----------
preloadAssets(() => {
  paintBackdrops();
  if (game) render();
  else showStart();
});
showStart();
