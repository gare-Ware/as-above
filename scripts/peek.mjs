// Frame-capture harness: drives the live dev app and saves stills at the
// beats that matter — idle float, the engraving (exit sweep, bare stone,
// writing-light, settle), TRIGGER mash, the sky swap (including a mid-swap
// reversal), the console drawer, and a desktop frame. For a dense
// frame-by-frame look at one engrave cycle, see peek-engrave.mjs.
// Usage: node scripts/peek.mjs [outdir] (default: shots)
// Requires the dev server on http://localhost:3000.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
// Never race the mount: wait for the app's own ready signal.
await page.waitForSelector('main[data-ready="true"]', { timeout: 20_000 });

// ── Idle: the levitation and the idle script ──
await page.waitForTimeout(2600);
await shot('01-idle-sun');
await page.waitForTimeout(2800);
await shot('02-idle-sun-drift'); // compare against 01: the tablet must have moved

// ── The engraving: press the key, catch each beat. A first press writes
//    onto bare stone (no erase), so settle one fact first, then capture a
//    FULL pass: one downward sweep (~1.1s) where the erase edge lifts the
//    old fact away just ahead of the write edge landing the new one — a
//    thin wake of bare stone traveling between, never a blank tablet.
//    Screenshot latency skews nominal times late — treat these as "no
//    earlier than" beats. ──
const key = page.getByRole('button', { name: /trigger/i });
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
await page.waitForSelector('main[data-decode="settled"]', { timeout: 5_000 });
await page.waitForTimeout(400);
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
await page.waitForTimeout(220);
await shot('03-engrave-strike'); // the light strikes the top: new igniting over old
await page.waitForTimeout(320);
await shot('04-engrave-wake'); // mid-pass: new above, old below, the wake between
await page.waitForTimeout(330);
await shot('04b-engrave-landing'); // the write edge landing at the reality tag
await page.waitForTimeout(700);
await shot('05-engrave-settled');

// ── The pulse: catch the press ring mid-field ──
await key.dispatchEvent('pointerdown');
await key.dispatchEvent('pointerup');
await page.waitForTimeout(500);
await shot('05b-pulse-mid');

// ── Mash: repeated presses mid-decode must stay liquid ──
for (let i = 0; i < 3; i += 1) {
  await key.dispatchEvent('pointerdown');
  await page.waitForTimeout(60);
  await key.dispatchEvent('pointerup');
  await page.waitForTimeout(120);
}
await shot('06-mash-mid');
await page.waitForTimeout(1000);
await shot('07-mash-settled');

// ── The sky swap: S flips; catch the eclipse mid-flight ──
await page.keyboard.press('s');
await page.waitForTimeout(280);
await shot('08-swap-mid');
await page.waitForTimeout(420);
await shot('09-swap-late');
await page.waitForTimeout(1400);
await shot('10-moon-idle');

// ── Mid-swap reversal: sun, then back to moon before it lands ──
await page.keyboard.press('s'); // → sun
await page.waitForTimeout(340);
await page.keyboard.press('s'); // reverse → moon, mid-flight
await page.waitForTimeout(300);
await shot('11-swap-reversal');
await page.waitForTimeout(1500);
await shot('12-moon-recovered');

// ── Moon engrave ──
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
await shot('13-moon-writing'); // the gold writing-light under the moon
await page.waitForTimeout(800);
await shot('13b-moon-fact');

// ── The drawer: the whole stage lifts on mobile ──
await page.getByRole('button', { name: /console/i }).click();
await page.waitForTimeout(750);
await shot('14-console-open');
await page.getByRole('radio', { name: 'still' }).click();
await page.waitForTimeout(400);
await shot('15-motion-still');
await page.getByRole('radio', { name: 'live' }).click();
await page.getByRole('button', { name: /done/i }).click();
await page.waitForTimeout(700);

// ── Overflow guard at 375px ──
await page.setViewportSize({ width: 375, height: 720 });
await page.waitForTimeout(600);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
await shot('16-375px');
if (overflow > 0) console.error(`✗ horizontal overflow at 375px: +${overflow}px`);

// ── Desktop frame ──
await page.setViewportSize({ width: 1280, height: 840 });
await page.waitForTimeout(700);
await shot('17-desktop');
await page.getByRole('button', { name: /console/i }).click();
await page.waitForTimeout(700);
await shot('18-desktop-console');

await browser.close();
console.log('done:', out, overflow > 0 ? `(OVERFLOW +${overflow}px)` : '(no overflow)');
