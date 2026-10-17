// Writes the art slot list into README.md (between the ASSET-LIST markers).
// Run: npm run assets   (a test checks the README stays in sync)
import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ASSET_SLOTS } from '../js/data/assets.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const START = '<!-- ASSET-LIST:START -->';
const END = '<!-- ASSET-LIST:END -->';

export function assetTable(rootDir = root) {
  const rows = Object.entries(ASSET_SLOTS).map(([name, slot]) => {
    const status = !slot.file ? 'uses fallback by design' : existsSync(rootDir + slot.file) ? 'done' : slot.optional ? 'optional' : '**needed**';
    const fallback = [slot.fallback.emoji, slot.fallback.colour].filter(Boolean).join(' ');
    return `| \`${name}\` | ${slot.file ? `\`${slot.file}\`` : '(none)'} | ${slot.size || ''} | ${fallback} | ${status} |`;
  });
  return [
    '| Slot | File | Size | Fallback | Status |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export function withAssetTable(readme, table) {
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < 0) throw new Error('README is missing the ASSET-LIST markers');
  return readme.slice(0, a + START.length) + '\n' + table + '\n' + readme.slice(b);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = root + 'README.md';
  writeFileSync(path, withAssetTable(readFileSync(path, 'utf8'), assetTable()));
  console.log('README asset list updated.');
}
