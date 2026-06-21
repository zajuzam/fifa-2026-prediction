/**
 * FIFA 2026 Prediction — Test Runner
 * Runs tests.html via jsdom (Node.js).
 *
 * Usage:
 *   npm test            → run once
 *   npm run test:watch  → re-run automatically on file changes
 */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'tests.html');

const html = readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  url: 'file://' + htmlPath,
});

// Give scripts time to execute
await new Promise(r => setTimeout(r, 800));

const doc = dom.window.document;
let pass = 0, fail = 0;
const failures = [];

doc.querySelectorAll('.test').forEach(el => {
  const badge = el.querySelector('.badge');
  if (!badge) return;
  if (badge.textContent.trim() === 'PASS') {
    pass++;
  } else {
    fail++;
    const nameNode = el.querySelector('.test-name');
    const name = nameNode ? nameNode.childNodes[0].textContent.trim() : '?';
    const errEl = el.querySelector('.test-err');
    failures.push({ name, err: errEl ? errEl.textContent.trim() : '' });
  }
});

// ── Print results ──────────────────────────────────────────
const total = pass + fail;
const timestamp = new Date().toLocaleTimeString();

console.log('');
console.log(`⚽ FIFA 2026 Tests  [${timestamp}]`);
console.log('─'.repeat(50));

if (failures.length) {
  failures.forEach(f => {
    console.log(`  ✗  ${f.name}`);
    if (f.err) console.log(`     → ${f.err}`);
  });
  console.log('─'.repeat(50));
}

if (fail === 0) {
  console.log(`✅  All ${total} tests passed\n`);
} else {
  console.log(`❌  ${fail} failed  /  ${pass} passed  (${total} total)\n`);
}

process.exit(fail > 0 ? 1 : 0);
