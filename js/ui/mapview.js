// SVG map: draws regions, ownership, fog, icons and unit stacks, and handles
// tap, drag-to-pan and pinch-to-zoom.
import { BOARD, REGIONS } from '../data/map.js';
import { FACTIONS } from '../data/factions.js';
import { UNITS } from '../data/units.js';
import { CAPITALS } from '../data/map.js';
import { unitsIn } from '../engine/index.js';
import { imageFor, colourFor, svgIcon, unitSlot } from './assets.js';

const full = {
  x: -BOARD.padding,
  y: -BOARD.padding,
  w: BOARD.width + BOARD.padding * 2,
  h: BOARD.height + BOARD.padding * 2,
};

export class MapView {
  constructor(svg, { onTap }) {
    this.svg = svg;
    this.onTap = onTap;
    this.vb = { ...full };
    this.pointers = new Map();
    this.gesture = null;
    this.applyViewBox();
    this.bindInput();
  }

  applyViewBox() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  // Board units per screen pixel (SVG uses "meet" scaling)
  scale() {
    const r = this.svg.getBoundingClientRect();
    return Math.max(this.vb.w / r.width, this.vb.h / r.height);
  }

  clamp() {
    if (this.vb.w > full.w) {
      this.vb.w = full.w;
      this.vb.h = full.h;
    }
    this.vb.x = Math.min(Math.max(this.vb.x, full.x), full.x + full.w - this.vb.w);
    this.vb.y = Math.min(Math.max(this.vb.y, full.y), full.y + full.h - this.vb.h);
  }

  zoomAt(factor, clientX, clientY) {
    const r = this.svg.getBoundingClientRect();
    const s = this.scale();
    // board point under the finger
    const bx = this.vb.x + (clientX - r.left - (r.width - this.vb.w / s) / 2) * s;
    const by = this.vb.y + (clientY - r.top - (r.height - this.vb.h / s) / 2) * s;
    const nw = Math.min(full.w, Math.max(full.w / 3.5, this.vb.w / factor));
    const f = nw / this.vb.w;
    this.vb.x = bx - (bx - this.vb.x) * f;
    this.vb.y = by - (by - this.vb.y) * f;
    this.vb.w = nw;
    this.vb.h *= f;
    this.clamp();
    this.applyViewBox();
  }

  bindInput() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.gesture = { type: 'pan', start: { x: e.clientX, y: e.clientY }, vb: { ...this.vb }, moved: false };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.gesture = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), moved: true };
      }
    });
    svg.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId) || !this.gesture) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.gesture.type === 'pan' && this.pointers.size === 1) {
        const dx = e.clientX - this.gesture.start.x;
        const dy = e.clientY - this.gesture.start.y;
        if (Math.hypot(dx, dy) > 8) this.gesture.moved = true;
        if (!this.gesture.moved) return;
        const s = this.scale();
        this.vb.x = this.gesture.vb.x - dx * s;
        this.vb.y = this.gesture.vb.y - dy * s;
        this.clamp();
        this.applyViewBox();
      } else if (this.gesture.type === 'pinch' && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.gesture.dist > 0) this.zoomAt(dist / this.gesture.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        this.gesture.dist = dist;
      }
    });
    const end = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      const g = this.gesture;
      if (this.pointers.size === 0) {
        this.gesture = null;
        if (g && g.type === 'pan' && !g.moved && e.type === 'pointerup') {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const hit = el && el.closest('[data-region]');
          if (hit) this.onTap(hit.getAttribute('data-region'));
        }
      } else if (this.pointers.size === 1) {
        // pinch ended with one finger still down: carry on panning from here, no tap
        const [p] = [...this.pointers.values()];
        this.gesture = { type: 'pan', start: { ...p }, vb: { ...this.vb }, moved: true };
      }
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });
  }

  render(state, ui) {
    const me = state.player;
    const visible = ui.visible;
    const board = imageFor('board');
    const out = [];
    out.push('<defs>');
    for (const t of ['rock', 'sand', 'deep']) {
      const src = imageFor('terrain.' + t);
      if (src) {
        out.push(`<pattern id="tex-${t}" patternUnits="userSpaceOnUse" width="180" height="180"><image href="${src}" width="180" height="180"/></pattern>`);
      }
    }
    out.push('</defs>');
    out.push(`<rect x="${full.x}" y="${full.y}" width="${full.w}" height="${full.h}" fill="${colourFor('board')}"/>`);
    if (board) out.push(`<image href="${board}" x="0" y="0" width="${BOARD.width}" height="${BOARD.height}" preserveAspectRatio="none"/>`);

    const fill = (t) => (board ? 'transparent' : imageFor('terrain.' + t) ? `url(#tex-${t})` : colourFor('terrain.' + t));
    for (const r of REGIONS) {
      out.push(`<polygon class="region-shape" data-region="${r.id}" points="${r.points}" fill="${fill(r.terrain)}"/>`);
    }
    for (const r of REGIONS) {
      const owner = state.regions[r.id].owner;
      if (owner && (visible.has(r.id) || owner === me)) {
        const c = FACTIONS[owner].colour;
        out.push(`<polygon class="region-owner" points="${r.points}" fill="${c}" stroke="${c}" transform="${shrink(r)}"/>`);
      }
    }
    for (const r of REGIONS) {
      if (!visible.has(r.id)) out.push(`<polygon class="region-fog" points="${r.points}"/>`);
    }
    if (ui.mode === 'orders' && ui.targets) {
      for (const id of ui.targets.move) out.push(`<polygon class="target-move" points="${regionPoints(id)}"/>`);
      for (const id of ui.targets.attack) out.push(`<polygon class="target-attack" points="${regionPoints(id)}"/>`);
    }
    if (ui.selected) out.push(`<polygon class="region-sel" points="${regionPoints(ui.selected)}"/>`);

    for (const r of REGIONS) {
      const [cx, cy] = r.label;
      const seen = visible.has(r.id);
      out.push(`<text class="region-name" x="${cx}" y="${cy - 28}">${escape(r.name)}</text>`);
      if (r.village) {
        const isCap = Object.values(CAPITALS).includes(r.id);
        out.push(svgIcon(isCap ? 'capital' : 'village', cx, cy - 10, isCap ? 30 : 24));
      }
      if (r.spice > 0) {
        const y = r.village ? cy + 5 : cy - 12;
        const startX = cx - (r.spice - 1) * 6;
        for (let i = 0; i < r.spice; i++) {
          out.push(imageFor('spice') ? svgIcon('spice', startX + i * 12, y, 12) : `<circle class="spice-dot" cx="${startX + i * 12}" cy="${y}" r="3.2"/>`);
        }
      }
      if (!seen) continue;
      const units = unitsIn(state, r.id);
      const harvester = units.find((u) => u.type === 'harvester');
      if (harvester) out.push(svgIcon('unit.harvester', cx - 24, cy + 8, 15));
      const army = units.filter((u) => u.type !== 'harvester');
      if (army.length) out.push(stackBadge(army, cx, cy + 24));
    }
    this.svg.innerHTML = out.join('');
  }
}

function regionPoints(id) {
  return REGIONS.find((r) => r.id === id).points;
}

// Draw the owner outline slightly inside the hex so neighbouring borders do not overlap.
function shrink(r) {
  const [cx, cy] = r.label;
  const k = 0.93;
  return `matrix(${k} 0 0 ${k} ${cx * (1 - k)} ${cy * (1 - k)})`;
}

// A stack shows its strongest unit's art with a count, like a board-game token.
function stackBadge(units, x, y) {
  const faction = units[0].faction;
  const colour = FACTIONS[faction].colour;
  const best = [...units].sort((a, b) => UNITS[b.type].strength - UNITS[a.type].strength)[0];
  const ready = units.some((u) => u.movesLeft > 0 || !u.attacked);
  const slot = unitSlot(best.type, faction);
  const src = imageFor(slot);
  const op = ready ? 1 : 0.7;
  if (src && best.type === 'trooper') {
    // the faction token has an empty centre: the count sits inside it
    return `<g class="stack-badge" opacity="${op}">
      <image href="${src}" x="${x - 13}" y="${y - 13}" width="26" height="26"/>
      <text class="stack-count" x="${x}" y="${y + 0.5}">${units.length}</text>
    </g>`;
  }
  if (src) {
    const round = UNITS[best.type].elite;
    return `<g class="stack-badge" opacity="${op}">
      ${round ? `<circle cx="${x}" cy="${y}" r="13.5" fill="${colour}"/>` : ''}
      <image href="${src}" x="${x - 13}" y="${y - 13}" width="26" height="26"/>
      <circle cx="${x + 11}" cy="${y + 9}" r="6.5" fill="${colour}" stroke="#f3dfb2" stroke-width="1"/>
      <text class="stack-count" x="${x + 11}" y="${y + 9.5}" style="font-size:8.5px">${units.length}</text>
    </g>`;
  }
  const w = 34;
  return `<g class="stack-badge" opacity="${op}">
    <rect x="${x - w / 2}" y="${y - 8}" width="${w}" height="16" rx="8" fill="${colour}"/>
    ${svgIcon(slot, x - 8, y, 12)}
    <text class="stack-count" x="${x + 8}" y="${y + 0.5}">${units.length}</text>
  </g>`;
}

function escape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
