// Dense frame burst across THE INTRO — the world born from the sun (ring
// birth + flare), the poster inking thin→black, the stone's birth fire,
// and the ripple landing where the key materializes — captured from the
// first ready frame. Two passes: the phone stage and a desktop stage (the
// poster composition differs by aspect). CDP screenshots cost ~60-120ms
// each, so timestamps drift — every frame is stamped with the app clock,
// not a nominal beat. Usage: node scripts/peek-intro.mjs [outdir]
// (default: shots-intro). Requires the dev server on http://localhost:3000.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots-intro';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();

for (const [tag, viewport] of [
  ['phone', { width: 430, height: 900 }],
  ['desktop', { width: 1280, height: 800 }],
]) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main[data-ready="true"]', { timeout: 20_000 });
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 4600) {
    const t = Date.now() - t0;
    await page.screenshot({
      path: `${out}/${tag}-${String(i).padStart(2, '0')}-t${String(t).padStart(4, '0')}.png`,
    });
    i += 1;
  }
  await page.close();
  console.log(`${tag}: ${i} frames`);
}

await browser.close();
console.log(`done: ${out}`);
