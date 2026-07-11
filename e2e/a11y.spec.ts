import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * WCAG regression gate. Deploys are gated on the toy-BFV correctness the same
 * way this gates them on accessibility. Scans the whole page in both themes
 * with every collapsible / [hidden] / display:none region revealed.
 *
 * This lab has no <details>. The six exhibits reveal panels by clearing the
 * `hidden` attribute or an inline `display:none` on button click (e.g. the
 * exhibit-2 decryption reveal). We reveal all of them up front so their
 * contents are scanned, and neutralize animations/transitions so nothing is
 * scanned mid-flight.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function neutralizeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation: none !important; transition: none !important; }',
  });
}

async function revealAll(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const details of document.querySelectorAll('details')) {
      (details as HTMLDetailsElement).open = true;
    }
    // Reveal every [hidden] region (e.g. the exhibit-2 decryption reveal).
    for (const el of document.querySelectorAll<HTMLElement>('[hidden]')) {
      el.hidden = false;
    }
    // Reveal every inline display:none region.
    for (const el of document.querySelectorAll<HTMLElement>('[style*="display"]')) {
      if (el.style && el.style.display === 'none') el.style.display = '';
    }
    // Reveal class-toggled panels/accordions/tabs/modals.
    for (const el of document.querySelectorAll<HTMLElement>(
      '.panel, .accordion, .tab, .tab-panel, .modal, .drawer',
    )) {
      el.classList.add('open', 'active');
      el.removeAttribute('hidden');
    }
  });
}

async function scan(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
  expect(summary).toEqual([]);
}

async function runSuite(page: Page): Promise<void> {
  await revealAll(page);
  await neutralizeMotion(page);
  await scan(page);
}

test('no WCAG A/AA violations in dark theme', async ({ page }) => {
  await page.goto('.');
  await runSuite(page);
});

test('no WCAG A/AA violations in light theme', async ({ page }) => {
  await page.goto('.');
  await page.locator('#cl-theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await runSuite(page);
});
