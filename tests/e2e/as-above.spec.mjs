// Smoke suite for the whole devotional loop. Every spec waits on the app's
// own ready signal ([data-ready="true"] on <main>) — never race the mount.
// There is no readiness clock in AS ABOVE (every press answers instantly),
// so no ?fast hook exists or is needed.
import { expect, test } from '@playwright/test';

const ready = (page) => page.waitForSelector('main[data-ready="true"]', { timeout: 20_000 });

/** Fire the on-stage TRIGGER via pointer events (its press path). */
async function pressTrigger(page) {
  const key = page.getByRole('button', { name: /trigger/i });
  await key.dispatchEvent('pointerdown');
  await key.dispatchEvent('pointerup');
}

const settled = (page) =>
  page.waitForSelector('main[data-decode="settled"]', { timeout: 5_000 });

test('WebKit glass fallback never paints the duplicated live SVG', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('/?lens=flat');
  await ready(page);

  const key = page.getByRole('button', { name: /trigger/i });
  await expect(key).toHaveAttribute('data-lens', 'flat');
  await expect(key.locator('.key-scene')).toHaveCount(0);
  await expect(key.locator('.key-bleed')).toHaveCount(0);
  await expect(key.locator('.key-grade')).toHaveCSS('opacity', '1');

  // The fallback must be correct before the interaction that historically
  // forced WebKit to repaint the corrupt half-tile.
  await expect(key).toHaveAttribute('data-pressed', 'false');
});

test('TRIGGER reveals a fact; repeated presses cycle new ones with zero cooldown', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);

  // The hint speaks first…
  await expect(page.locator('.tablet-hint')).toHaveAttribute('data-visible', 'true');

  await pressTrigger(page);
  await settled(page);
  const first = (await page.locator('.fact-claim').textContent())?.trim();
  expect(first?.length).toBeGreaterThan(0);
  // …and retires after the first press.
  await expect(page.locator('.tablet-hint')).toHaveAttribute('data-visible', 'false');
  // The reality tag is always rendered.
  await expect(page.locator('.fact-filed')).toContainText(/filed under/i);
  await expect(page.locator('.fact-filed')).toContainText(/Status:/);

  // Mash: three rapid presses mid-decode must land legibly on a NEW fact.
  await pressTrigger(page);
  await page.waitForTimeout(120);
  await pressTrigger(page);
  await page.waitForTimeout(90);
  await pressTrigger(page);
  await page.waitForFunction(
    (prev) =>
      document.querySelector('main')?.dataset.decode === 'settled' &&
      document.querySelector('.fact-claim')?.textContent?.trim() !== prev,
    first,
    { timeout: 5_000 },
  );
});

test('console opens as the thumb-first drawer and SKY swaps mode, palette, corpus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto('/');
  await ready(page);

  const bodyBg = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const sunBg = await bodyBg();

  await page.getByRole('button', { name: /console/i }).click();
  await expect(page.locator('main')).toHaveAttribute('data-console', 'open');
  // On narrow viewports the WHOLE stage slides up to reveal the console.
  await page.waitForFunction(() => {
    const t = getComputedStyle(document.querySelector('.stage-slide')).transform;
    return t !== 'none' && new DOMMatrix(t).m42 < -100;
  });

  await page.getByRole('radio', { name: 'moon' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'moon');
  // The palette glides — body paint leaves the sun reading.
  await page.waitForFunction(
    (prev) => getComputedStyle(document.body).backgroundColor !== prev,
    sunBg,
    { timeout: 4_000 },
  );

  // The moon corpus answers now (moon-only fact ids are asserted by unit
  // tests; here we assert the loop stays alive after the swap).
  await page.getByRole('button', { name: /done/i }).click();
  await pressTrigger(page);
  await settled(page);
  expect((await page.locator('.fact-claim').textContent())?.trim().length).toBeGreaterThan(0);

  // Swap back: the sun keeps its own memory (pure swap, no re-deal).
  await page.keyboard.press('s');
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'sun');
});

test('keyboard-only path: Enter triggers from anywhere, S flips the sky', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.keyboard.press('Enter');
  await settled(page);
  const sunClaim = (await page.locator('.fact-claim').textContent())?.trim();
  expect(sunClaim?.length).toBeGreaterThan(0);

  await page.keyboard.press('s');
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'moon');

  await page.keyboard.press(' ');
  await page.waitForFunction(
    (prev) =>
      document.querySelector('main')?.dataset.decode === 'settled' &&
      document.querySelector('.fact-claim')?.textContent?.trim() !== prev,
    sunClaim,
    { timeout: 5_000 },
  );
});

test('no horizontal overflow at 375px through every state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.goto('/');
  await ready(page);

  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  expect(await overflow()).toBeLessThanOrEqual(0);
  await pressTrigger(page);
  await settled(page);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: /console/i }).click();
  await page.waitForTimeout(700);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.getByRole('radio', { name: 'moon' }).click();
  await page.waitForTimeout(1300);
  expect(await overflow()).toBeLessThanOrEqual(0);
});

test('MOTION — STILL keeps the whole loop functional (scene inert)', async ({ page }) => {
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', { name: /console/i }).click();
  await page.getByRole('radio', { name: 'still' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'still');
  await page.getByRole('button', { name: /done/i }).click();

  await pressTrigger(page);
  await settled(page);
  expect((await page.locator('.fact-claim').textContent())?.trim().length).toBeGreaterThan(0);
});

test.describe('reduced motion', () => {
  test('the full loop completes with fades instead of physics', async ({ page }) => {
    // Emulate at the page level: the context-option route is not honored by
    // every headless profile, and this suite must never silently test the
    // full-motion path.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await ready(page);
    await expect(page.locator('main')).toHaveAttribute('data-motion', 'still');

    // Decode becomes a crossfade — function fully preserved.
    await page.keyboard.press('Enter');
    await settled(page);
    const claim = (await page.locator('.fact-claim').textContent())?.trim();
    expect(claim?.length).toBeGreaterThan(0);
    await expect(page.locator('.fact-filed')).toContainText(/Status:/);

    // The sky swap becomes a fade; mode + palette still turn.
    await page.keyboard.press('s');
    await expect(page.locator('main')).toHaveAttribute('data-mode', 'moon');

    // The console still tunes.
    await page.getByRole('button', { name: /console/i }).click();
    await page.getByRole('radio', { name: 'sun' }).click();
    await expect(page.locator('main')).toHaveAttribute('data-mode', 'sun');
  });
});
