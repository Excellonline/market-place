import type { Locator, Page } from 'playwright';

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Sleep a uniform-random duration. Default 800–2400ms — meant for "between meaningful actions". */
export function humanDelay(min = 800, max = 2400): Promise<void> {
  return new Promise((r) => setTimeout(r, rand(min, max)));
}

/** Short delay for sub-action steps (between hover and click, etc.). */
export function microDelay(min = 80, max = 240): Promise<void> {
  return new Promise((r) => setTimeout(r, rand(min, max)));
}

/** Type text with per-character variable delay; occasional short pause. */
export async function humanType(locator: Locator, text: string): Promise<void> {
  await locator.click();
  await microDelay(120, 280);
  for (const ch of text) {
    await locator.page().keyboard.type(ch, { delay: rand(35, 110) });
    if (Math.random() < 0.04) await microDelay(160, 320);
  }
}

/** Multi-step scroll using wheel deltas — never `evaluate` to jump-to-y. */
export async function humanScroll(page: Page, totalDistance: number, steps = 6): Promise<void> {
  const step = totalDistance / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await microDelay(70, 180);
  }
}

/**
 * The canonical click sequence: scrollIntoView → hover → small delay → click.
 * Mirrors a human reaching for an element. Never use page.evaluate(el => el.click()) anywhere else.
 */
export async function humanClick(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
  await locator.hover({ timeout: 5000 });
  await microDelay();
  await locator.click({ timeout: 10_000 });
}

export function todayLocalMidnightMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
