import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Playwright specs run as CommonJS, so `require.resolve` is available.
const axeSource = readFileSync(require.resolve('axe-core/axe.js'), 'utf8');

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: unknown[];
}

async function analyzeViolations(page: import('@playwright/test').Page) {
  // Inject the axe-core browser build (self-defines window.axe).
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: Document,
            opts: unknown,
          ) => Promise<{ violations: AxeViolation[] }>;
        };
      }
    ).axe;
    if (!axe) throw new Error('axe-core failed to load in the page');
    const { violations } = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length }));
  });
}

const PATHS = ['/', '/login', '/docs'];

/**
 * Real-browser accessibility, gated at WCAG 2.1 level AA.
 *
 * The original gate only failed on `critical`, leaving `serious` — which
 * includes color-contrast, an explicit AA requirement — as an attachment
 * nobody had to act on. The contrast fix in f23082b landed without the gate
 * ever being tightened, so AA compliance was unenforced.
 *
 * `critical` and `serious` now both fail the build. `moderate` and `minor`
 * stay attached as report-only, since AA does not require them and gating on
 * them would block releases on non-blocking findings.
 */
for (const path of PATHS) {
  test(`axe: no critical or serious violations on ${path}`, async ({
    page,
  }, testInfo) => {
    // Collapse entrance animations before measuring. The landing page fades
    // elements in with staggered delays, and axe samples mid-animation, where
    // an element still ramping from opacity 0 reports a contrast ratio far
    // below its final one. Emulating reduced motion collapses the animations
    // to ~0ms (the app already honours the media query), so we measure the
    // settled state — and we exercise that accessibility path at the same time.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.waitForLoadState('load');

    const violations = await analyzeViolations(page);

    const blocking = violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
      `WCAG AA (critical+serious) axe violations on ${path}`,
    ).toEqual([]);

    // Report-only tiers, kept as evidence for the next pass.
    const advisory = violations.filter(
      (v) => v.impact === 'moderate' || v.impact === 'minor',
    );
    await testInfo.attach(`axe-advisory-${path}`, {
      body: JSON.stringify(advisory, null, 2),
      contentType: 'application/json',
    });
  });
}

