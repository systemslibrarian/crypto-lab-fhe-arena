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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(250);
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

async function checkGradientContrast(page: Page): Promise<void> {
  const contrast = await page.evaluate(() => {
    function getLum(r: number, g: number, b: number) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function parseRGB(str: string) {
      const m = str.match(/\d+/g);
      return m ? [parseInt(m[0], 10), parseInt(m[1], 10), parseInt(m[2], 10)] : [0,0,0];
    }
    const el = document.querySelector('.cl-hero-desc');
    if (!el) return 0;
    const color = getComputedStyle(el).color;
    const bgStr = getComputedStyle(document.body).backgroundColor;
    const textLum = getLum(...(parseRGB(color) as [number, number, number]));
    const bgLum = getLum(...(parseRGB(bgStr) as [number, number, number]));
    return (Math.max(textLum, bgLum) + 0.05) / (Math.min(textLum, bgLum) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
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
  await page.locator('.cl-hero-title').waitFor();
  await checkGradientContrast(page);
  await revealAll(page);
  await neutralizeMotion(page);
  await scan(page);
}

/**
 * WCAG 1.4.11 regression: text-entry control boundaries (input/textarea/select
 * borders) must hit >= 3:1 against at least one adjacent surface, after
 * compositing translucent colors over the real ancestor backgrounds.
 */
async function measureControlBorders(
  page: Page,
): Promise<Array<{ sel: string; best: number }>> {
  return page.evaluate(() => {
    const parse = (c: string): number[] => {
      const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
      return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 0];
    };
    const comp = (fg: number[], bg: number[]): number[] =>
      [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat([1]);
    const lum = ([r, g, b]: number[]): number => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a: number[], b: number[]): number => {
      const l1 = lum(a);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const effBg = (start: Element | null): number[] => {
      const stack: number[][] = [];
      let node: Element | null = start;
      while (node) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c[3] > 0) stack.push(c);
        if (c[3] >= 1) break;
        node = node.parentElement;
      }
      let bg = [255, 255, 255, 1];
      for (let i = stack.length - 1; i >= 0; i--) bg = comp(stack[i], bg);
      return bg;
    };
    const TEXTY = ['', 'text', 'number', 'password', 'email', 'search', 'url', 'tel'];
    const out: Array<{ sel: string; best: number }> = [];
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el.tagName === 'INPUT' && !TEXTY.includes((el.getAttribute('type') || '').toLowerCase())) return;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return;
      if ((parseFloat(cs.borderTopWidth) || 0) === 0) return;
      const outer = effBg(el.parentElement);
      const ownBg = parse(cs.backgroundColor);
      const inner = ownBg[3] >= 1 ? ownBg : comp(ownBg, outer);
      const borderRaw = parse(cs.borderTopColor);
      const best = Math.max(ratio(comp(borderRaw, outer), outer), ratio(comp(borderRaw, inner), inner));
      out.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
        best: Math.round(best * 100) / 100,
      });
    });
    return out;
  });
}

for (const theme of ['dark', 'light'] as const) {
  test(`text control borders >= 3:1 in ${theme} theme`, async ({ page }) => {
    await page.goto('.');
    if (theme === 'light') {
      await page.locator('#cl-theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    }
    await revealAll(page);
    const rows = await measureControlBorders(page);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.best < 3)).toEqual([]);
  });
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
