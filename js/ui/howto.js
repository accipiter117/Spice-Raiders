// How to play. Numbers come straight from the data files, so the guide stays
// right when the game is retuned.
import { RULES } from '../data/rules.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { icon, unitSlot } from './assets.js';

const pct = (x) => Math.round(x * 100);

export function howToPlayHtml() {
  const tax = RULES.tax;
  const a = FACTIONS.atreides;
  const h = FACTIONS.harkonnen;
  const f = FACTIONS.fremen;
  const section = (title, slot, body) => `
    <details class="guide"${title === 'The goal' ? ' open' : ''}>
      <summary>${slot ? icon(slot) : ''}<span>${title}</span></summary>
      <div class="guide-body">${body}</div>
    </details>`;
  return `
    <h2>How to play</h2>
    <p class="note">Three powers fight over Arrakis. You lead one; the computer runs the other two. Tap a heading to open it.</p>
    ${section('The goal', 'res.hegemony', `
      <ul>
        <li>First to <b>${RULES.hegemonyToWin} Hegemony</b> wins. You also win by taking both rival capitals.</li>
        <li>You lose if your capital falls.</li>
        <li>Hegemony comes from paying the Emperor's spice tax (+${tax.hegemonyPaid}), holding villages (+1 a turn for every ${Math.round(1 / RULES.income.hegemonyPerVillage)}), winning battles (+${RULES.combat.hegemonyPerWin}) and taking a capital (+${RULES.combat.hegemonyForCapital}).</li>
        <li>If nobody has won by turn ${RULES.maxTurns}, the leader wins.</li>
      </ul>`)}
    ${section('Your turn', 'ui.endTurn', `
      <ul>
        <li>Tap a region to see it. Tap your units to choose them, then <b>Give orders</b>: green regions are moves, red ones are attacks.</li>
        <li>Each unit moves one region and can attack once a turn.</li>
        <li>In your villages you can recruit. On your spice fields you can build harvesters.</li>
        <li>Press <b>End Turn</b> when you are done. The other powers then move, and every turn starts with income.</li>
      </ul>`)}
    ${section('Land and villages', 'village', `
      <ul>
        <li>Villages pay Solari and Manpower each turn. Your capital pays extra.</li>
        <li>Take a neighbouring village peacefully with <b>Authority</b>, or by beating its militia in battle.</li>
        <li>Spice fields and passes can be annexed cheaply. Everything you own keeps a garrison, so rivals must fight for it.</li>
        <li><b>Deep desert</b> (the dark middle) belongs to nobody. Troops there waste away quickly, unless they are Fremen.</li>
        <li>Your units heal inside your land and lose health outside it.</li>
      </ul>`)}
    ${section('Spice, worms and the tax', 'res.spice', `
      <ul>
        <li>Harvesters on spice fields produce spice each turn. You can also send one onto deep desert spice next to your land.</li>
        <li>Sandworms may swallow harvesters on sand or deep desert (${pct(RULES.worms.sand)}% and ${pct(RULES.worms.deep)}% a turn).</li>
        <li>Every ${tax.interval} turns the Emperor demands spice: ${tax.firstAmount} at first, then ${tax.increase} more each time. Paying earns Hegemony; missing it costs Hegemony and Authority.</li>
        <li>Sell spice you do not need for ${RULES.market.solariPerSpice} Solari each, but keep enough for the tax.</li>
      </ul>`)}
    ${section('Battles', 'event.combat', `
      <ul>
        <li>Battles resolve instantly: your total strength against theirs plus any militia, with a small random swing (±${pct(RULES.combat.randomSpread)}%).</li>
        <li>The attack screen shows the odds before you commit. Wounded units fight weaker.</li>
        <li>Rock gives defenders +${pct(RULES.combat.terrainDefence.rock - 1)}%. Capitals are very hard to crack.</li>
        <li>Units cost Solari every turn. If you cannot pay, your whole army loses health.</li>
      </ul>`)}
    ${section('The factions', 'faction.atreides', `
      <ul>
        <li>${icon('faction.atreides')} <b style="color:${a.ink}">Atreides</b>: ${a.blurb}</li>
        <li>${icon('faction.harkonnen')} <b style="color:${h.ink}">Harkonnen</b>: ${h.blurb}</li>
        <li>${icon('faction.fremen')} <b style="color:${f.ink}">Fremen</b>: ${f.blurb}</li>
        <li>Each has an elite unit: ${['swordmasters', 'shockTroops', 'fedaykin'].map((u, i) => `${icon(unitSlot(u, ['atreides', 'harkonnen', 'fremen'][i]))} ${UNITS[u].name}`).join(', ')}.</li>
      </ul>`)}
    ${section('Tips', null, `
      <ul>
        <li>Grab the villages next to you early: they pay for everything else.</li>
        <li>Keep a harvester or two running and watch the tax countdown in the top bar.</li>
        <li>Do not leave your spice fields empty when an enemy army is nearby.</li>
        <li>Your game saves itself after every move.</li>
      </ul>`)}
  `;
}
