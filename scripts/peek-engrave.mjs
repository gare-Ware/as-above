// Dense frame burst over one full engrave pass — the erase edge lifting
// the old fact away just ahead of the write edge landing the new one —
// so the writing-light can be judged frame by frame. Usage:
// node scripts/peek-engrave.mjs [outdir] (default: shots-engrave).
// Requires the dev server on http://localhost:3000.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots-engrave';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('main[data-ready="true"]', { timeout: 20_000 });
await page.waitForSelector('main[data-intro="done"]', { timeout: 20_000 });

const key = page.getByRole('button', { name: /trigger/i });

// First press settles a fact so the second press runs a FULL pass
// (a real outgoing fact under the incoming write).
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
await page.waitForSelector('main[data-decode="settled"]', { timeout: 5_000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/00-before.png` });

// The full cycle, sampled tightly. CDP screenshots cost ~60-120ms each, so
// timestamps drift — stamp each frame with the app clock instead of nominal.
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
const t0 = Date.now();
let i = 0;
while (Date.now() - t0 < 1900) {
  const t = Date.now() - t0;
  await page.screenshot({
    path: `${out}/${String(i).padStart(2, '0')}-t${String(t).padStart(4, '0')}.png`,
  });
  i += 1;
}

await browser.close();
console.log(`done: ${out} (${i} frames)`);
