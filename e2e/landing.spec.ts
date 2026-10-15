import { test, expect } from '@playwright/test';

/**
 * Guards against the "loads as raw text, no styling" failure mode: the
 * landing must render with its design applied (dark computed background),
 * real headings/links, and no horizontal overflow.
 */
test('landing renders fully styled, not raw HTML', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/PromptPerfect/i);

  // Design actually applies: the dark background token is computed on <body>.
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bodyBg).toBe('rgb(5, 5, 5)');

  // Structure: a real h1 and primary actions.
  await expect(
    page.getByRole('heading', { level: 1, name: 'PromptPerfect' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /try for free/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /log in/i }).first(),
  ).toBeVisible();

  // No horizontal overflow (responsive sanity).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('login page renders its form', async ({ page }) => {
  await page.goto('/login');
  await expect(
    page.getByRole('textbox', { name: /email/i }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /sign in|log in|continue/i }).first(),
  ).toBeVisible();
});
