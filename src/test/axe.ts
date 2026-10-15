import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import axe from 'axe-core';

export interface BlockingViolation {
  id: string;
  impact: string;
  help: string;
}

/**
 * Runs axe-core against a rendered React tree in jsdom and returns any
 * critical/serious violations. jsdom can't compute real styles/layout, so
 * `color-contrast` (needs computed styles) and the full-page `region`
 * best-practice are disabled — they're better covered by Playwright/axe on a
 * live page. Structural + ARIA rules (button/link names, required ARIA,
 * ARIA validity, aria-hidden-focus, etc.) run here.
 */
export async function getBlockingA11yViolations(
  ui: ReactElement,
): Promise<BlockingViolation[]> {
  const { container, unmount }: RenderResult = render(ui);
  try {
    const results = await axe.run(container as HTMLElement, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    return results.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => ({ id: v.id, impact: String(v.impact), help: v.help }));
  } finally {
    unmount();
  }
}
