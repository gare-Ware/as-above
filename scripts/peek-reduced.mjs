// Reduced-motion frame captures: the scene must be still (no float, no
// boil), decodes must crossfade, and the sky swap must fade — with the whole
// loop functionally intact. Usage: node scripts/peek-reduced.mjs [outdir]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots-reduced';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 900 },
  reducedMotion: 'reduce',
});
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('main[data-ready="true"]', { timeout: 20_000 });
await page.waitForTimeout(1200);
await shot('r1-idle');

// The float must be OFF: two samples of the drift transform must match.
const t1 = await page.evaluate(
  () => document.querySelector('.tablet-drift')?.style.transform,
);
await page.waitForTimeout(900);
const t2 = await page.evaluate(
  () => document.querySelector('.tablet-drift')?.style.transform,
);
if (t1 !== t2) console.error(`✗ reduced motion: the tablet still floats (${t1} → ${t2})`);

const key = page.getByRole('button', { name: /trigger/i });
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
await page.waitForSelector('main[data-decode="settled"]');
await page.waitForTimeout(400);
await shot('r2-fact-crossfaded');

await page.keyboard.press('s');
await page.waitForTimeout(700);
await shot('r3-moon-faded');

await browser.close();
console.log('done:', out, t1 === t2 ? '(float correctly still)' : '(FLOAT LEAK)');
