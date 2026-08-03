import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * FUNCTIONAL claim gate — the counterpart to a11y.spec.ts.
 *
 * a11y.spec.ts proves the page is accessible; this file proves the page is
 * TELLING THE TRUTH. Every assertion below is checked against a number the page
 * itself computed and rendered, not against a string baked into the test:
 *
 *   - headline verdicts are re-derived from the inputs the test typed, so a
 *     hardcoded "7" or a canned "matches plaintext" badge cannot pass;
 *   - every failure / not-ready path each exhibit offers is exercised, and each
 *     is required to say WHY it failed, not merely to change text;
 *   - counters and measured statistics are cross-checked for internal
 *     consistency (equation parts summing to the recovered value, the noise
 *     column agreeing with the bits column, chart tooltips agreeing with the
 *     table, chip counts agreeing with the decrypted tally).
 *
 * Motion is reduced so the "multiply until it breaks" animation resolves
 * immediately: deterministic timing, no weakened assertions.
 */

test.use({ contextOptions: { reducedMotion: 'reduce' } });

// ── helpers ────────────────────────────────────────────────────────────────

/** Collapse &nbsp; and runs of whitespace so text assertions are stable. */
function norm(s: string | null | undefined): string {
  return (s ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

async function textOf(page: Page, selector: string): Promise<string> {
  return norm(await page.locator(selector).textContent());
}

/** Raw text (newlines preserved) — for the <pre> equation block. */
async function preOf(page: Page, selector: string): Promise<string> {
  return ((await page.locator(selector).textContent()) ?? '').replace(/\u00a0/g, ' ');
}

function centerLift(x: number, q: number): number {
  const r = ((x % q) + q) % q;
  return r > q / 2 ? r - q : r;
}

type Budget = { bits: number; pct: number; health: string };

/** Parse a meter label: "Noise budget: 9.9 bits (91%) — healthy". */
function parseBudget(label: string): Budget {
  const m = label.match(/Noise budget: ([\d.]+) bits \((\d+)%\) — (healthy|warning|critical)/);
  expect(m, `budget label did not render in the documented shape: "${label}"`).not.toBeNull();
  return { bits: Number(m![1]), pct: Number(m![2]), health: m![3] };
}

/** The health band the page documents in its legend, re-derived from the bits. */
function expectedHealth(bits: number): string {
  if (bits >= 6) return 'healthy';
  if (bits >= 1.5) return 'warning';
  return 'critical';
}

async function readBudget(page: Page, labelSel: string, barSel: string): Promise<Budget> {
  const budget = parseBudget(await textOf(page, labelSel));
  const bar = page.locator(barSel);
  // The ARIA progressbar must report the same percentage the label prints.
  await expect(bar).toHaveAttribute('aria-valuenow', String(budget.pct));
  await expect(bar).toHaveAttribute('data-health', budget.health);
  // ...and the colour band must match the bits, not be set independently.
  expect(budget.health).toBe(expectedHealth(budget.bits));
  return budget;
}

type NoiseRow = { step: number; op: string; noise: number; bits: number; guaranteed: boolean };

async function readNoiseTable(page: Page): Promise<NoiseRow[]> {
  return page.locator('[data-e3-table] tr').evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from((row as HTMLTableRowElement).cells).map((c) => (c.textContent ?? '').trim());
      return {
        step: Number(cells[0]),
        op: cells[1],
        noise: Number(cells[2]),
        bits: Number(cells[3]),
        guaranteed: cells[4].includes('✓'),
      };
    }),
  );
}

/** Every <title> the budget chart renders: "step 2: × Multiply by 2 — 1.2 bits". */
async function readChartTips(page: Page): Promise<string[]> {
  return page.locator('[data-e3-chart] circle title').allTextContents();
}

async function runE2Decrypt(page: Page, a: number, b: number): Promise<void> {
  await page.fill('#a2', String(a));
  await page.fill('#b2', String(b));
  await page.click('[data-e2-enc-a]');
  await page.click('[data-e2-enc-b]');
  await page.click('[data-e2-add]');
  await page.click('[data-e2-dec]');
}

function badgeOk(scope: Locator): Locator {
  return scope.locator('.badge-ok');
}

test.beforeEach(async ({ page }) => {
  // Toy BFV over a 64-degree ring is cheap but not free; give heavy runs room
  // rather than relaxing what they assert.
  test.setTimeout(90_000);
  await page.goto('.');
});

// ── Exhibit 2: encrypt → add → decrypt ─────────────────────────────────────

test('exhibit 2 headline verdict is computed from the typed inputs, not canned', async ({ page }) => {
  const result = page.locator('[data-e2-result]');
  // The pristine page ships the string "= 7" for its default 3 + 4. Driving
  // other pairs proves the verdict is recomputed rather than pre-baked.
  for (const [a, b] of [
    [9, 13],
    [16, 16],
    [0, 7],
  ] as const) {
    await runE2Decrypt(page, a, b);
    const text = await textOf(page, '[data-e2-result]');
    const shown = text.match(/Decrypted: (\d+)/);
    const verify = text.match(/verify \((\d+) \+ (\d+)\) mod (\d+) = (\d+)/);
    expect(shown, `no decrypted value in "${text}"`).not.toBeNull();
    expect(verify, `no verification arithmetic in "${text}"`).not.toBeNull();

    const t = Number(verify![3]);
    const expected = (a + b) % t;
    expect(Number(verify![1])).toBe(a);
    expect(Number(verify![2])).toBe(b);
    // The page's own "expected" and its own decrypted value must both equal the
    // arithmetic this test did independently.
    expect(Number(verify![4])).toBe(expected);
    expect(Number(shown![1])).toBe(expected);
    await expect(badgeOk(result)).toHaveText(/matches plaintext/);
  }
});

test('exhibit 2 reveals a Δ·m + e equation whose parts sum to the recovered value', async ({ page }) => {
  const a = 9;
  const b = 13;
  await expect(page.locator('[data-e2-reveal]')).toBeHidden();
  await runE2Decrypt(page, a, b);
  await expect(page.locator('[data-e2-reveal]')).toBeVisible();

  const eq = await preOf(page, '[data-e2-eq]');
  const deltaLine = eq.match(/⌊(\d+) \/ (\d+)⌋ = (\d+)/);
  const mLine = eq.match(/m\s+= \((\d+) \+ (\d+)\) mod (\d+) = (\d+)/);
  const signalLine = eq.match(/Δ·m\s+= (-?\d+)/);
  const recoveredLine = eq.match(/c0 \+ c1·s\s+= (-?\d+)/);
  const noiseLine = eq.match(/noise e\s+= ([+-]?\d+)\s+\(fails only if \|e\| > Δ\/2 = (\d+)\)/);
  const roundLine = eq.match(/round\((-?\d+) \/ (\d+)\) mod (\d+) = (\d+)/);
  for (const [name, m] of Object.entries({ deltaLine, mLine, signalLine, recoveredLine, noiseLine, roundLine })) {
    expect(m, `${name} missing from the reveal:\n${eq}`).not.toBeNull();
  }

  const q = Number(deltaLine![1]);
  const t = Number(deltaLine![2]);
  const delta = Number(deltaLine![3]);
  const m = Number(mLine![4]);
  const signal = Number(signalLine![1]);
  const recovered = Number(recoveredLine![1]);
  const noise = Number(noiseLine![1]);
  const threshold = Number(noiseLine![2]);
  const decoded = Number(roundLine![4]);

  // Δ = ⌊q/t⌋, exactly as the line claims.
  expect(delta).toBe(Math.floor(q / t));
  expect(threshold).toBe(Math.floor(delta / 2));
  // m is the plaintext sum the test asked for.
  expect(m).toBe((a + b) % t);
  // The clean signal really is Δ·m (center-lifted into (-q/2, q/2]).
  expect(signal).toBe(centerLift(m * delta, q));
  // The whole point of the exhibit: signal + noise === what the key recovers.
  expect(centerLift(recovered - signal - noise, q)).toBe(0);
  // A successful decryption must sit inside the failure threshold it prints.
  expect(Math.abs(noise)).toBeLessThanOrEqual(threshold);
  // The final rounding line must operate on the same recovered value and Δ...
  expect(Number(roundLine![1])).toBe(recovered);
  expect(Number(roundLine![2])).toBe(delta);
  expect(Number(roundLine![3])).toBe(t);
  // ...and the decoded answer must be what rounding that recovered value
  // actually yields — i.e. it comes out of the ciphertext, not out of the two
  // numbers typed into the form.
  expect(decoded).toBe((((Math.round(recovered / delta) % t) + t) % t));
  // ...which is m, which is what the headline reported.
  expect(decoded).toBe(m);
  expect(eq).toContain('✓');
  expect(await textOf(page, '[data-e2-result]')).toContain(`Decrypted: ${decoded}`);
});

test('exhibit 2 add is measured as cheap: the meter loses under 3 bits', async ({ page }) => {
  await page.fill('#a2', '5');
  await page.fill('#b2', '6');
  await page.click('[data-e2-enc-a]');
  const fresh = await readBudget(page, '[data-e2-budget-label]', '[data-e2-budget-bar]');
  expect(fresh.pct).toBe(100);
  expect(fresh.health).toBe('healthy');

  await page.click('[data-e2-enc-b]');
  await page.click('[data-e2-add]');
  const summed = await readBudget(page, '[data-e2-budget-label]', '[data-e2-budget-bar]');
  expect(fresh.bits - summed.bits).toBeLessThan(3);
  expect(summed.bits).toBeGreaterThan(0);
  expect(summed.health).toBe('healthy');
  // The percentage must be the bits expressed against the fresh maximum.
  expect(Math.abs(summed.pct - Math.round((summed.bits / fresh.bits) * 100))).toBeLessThanOrEqual(1);
});

test('exhibit 2 refuses out-of-order steps and says which step is missing', async ({ page }) => {
  await page.click('[data-e2-add]');
  expect(await textOf(page, '[data-e2-result]')).toBe('Encrypt both A and B first.');
  await expect(page.locator('[data-e2-sum]')).toHaveText('awaiting…');

  await page.click('[data-e2-dec]');
  expect(await textOf(page, '[data-e2-result]')).toBe('Add the ciphertexts first.');
  await expect(page.locator('[data-e2-reveal]')).toBeHidden();

  // Half-primed state: A alone is still not enough to add.
  await page.click('[data-e2-enc-a]');
  await page.click('[data-e2-add]');
  expect(await textOf(page, '[data-e2-result]')).toBe('Encrypt both A and B first.');
  await expect(page.locator('[data-e2-reveal]')).toBeHidden();
});

test('semantic security demo: two encryptions of one value differ yet both decrypt to it', async ({ page }) => {
  await page.fill('#a2', '11');
  await page.click('[data-e2-sem]');

  const first = await textOf(page, '[data-e2-sem1]');
  const second = await textOf(page, '[data-e2-sem2]');
  expect(first).toMatch(/^c0:/);
  expect(second).toMatch(/^c0:/);
  expect(first).not.toBe(second);

  const note = await textOf(page, '[data-e2-sem-note]');
  expect(note).toContain('Both encrypt A = 11');
  expect(note).toContain('differ completely');
  // Both decryptions are printed; both must be the value that was encrypted.
  const decrypted = [...note.matchAll(/decrypt to (\d+) and (\d+)/g)].flatMap((mm) => [mm[1], mm[2]]);
  expect(decrypted.map(Number)).toEqual([11, 11]);
  await expect(badgeOk(page.locator('[data-e2-sem-note]'))).toHaveText(/matches plaintext/);
});

// ── Exhibit 3: the noise budget ────────────────────────────────────────────

test('exhibit 3 measures add as cheap and multiply as expensive', async ({ page }) => {
  await page.click('[data-e3-reset]');
  const fresh = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(fresh.pct).toBe(100);

  await page.click('[data-e3-add]');
  const added = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  const addCost = fresh.bits - added.bits;

  await page.click('[data-e3-mul]');
  const multiplied = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  const mulCost = added.bits - multiplied.bits;

  // The exhibit's entire thesis, asserted against measurements the page made.
  expect(addCost).toBeLessThan(2);
  expect(mulCost).toBeGreaterThan(4);
  expect(mulCost).toBeGreaterThan(addCost * 2);
  expect(await textOf(page, '[data-e3-ops]')).toBe('Sequence: add → mul');
});

test('exhibit 3 table, meter and chart all report the same measurements', async ({ page }) => {
  await page.click('[data-e3-reset]');
  await page.click('[data-e3-add]');
  await page.click('[data-e3-add]');
  await page.click('[data-e3-mul]');

  const rows = await readNoiseTable(page);
  // One row for the fresh ciphertext plus one per operation performed.
  const ops = (await textOf(page, '[data-e3-ops]')).replace('Sequence: ', '').split(' → ');
  expect(ops).toEqual(['add', 'add', 'mul']);
  expect(rows).toHaveLength(ops.length + 1);
  rows.forEach((row, i) => expect(row.step).toBe(i));
  expect(rows[0].op).toContain('Fresh ct(3)');

  // The "max noise coeff" column and the "budget (bits)" column are rendered
  // independently; they must be two views of one measurement. Recover the
  // failure threshold (Δ/2) from the fresh row and re-derive every other row.
  const threshold = 2 ** rows[0].bits * Math.max(1, rows[0].noise);
  for (const row of rows) {
    const derived = Math.max(0, Math.log2(threshold / Math.max(1, row.noise)));
    expect(Math.abs(derived - row.bits), `row ${row.step} bits disagree with its noise column`).toBeLessThan(0.15);
    // The "Guaranteed?" verdict is exactly "is there budget left?".
    expect(row.guaranteed).toBe(row.bits > 0);
  }

  // Noise only ever grows; budget only ever shrinks, under add and multiply.
  for (let i = 1; i < rows.length; i += 1) {
    expect(rows[i].noise).toBeGreaterThanOrEqual(rows[i - 1].noise);
    expect(rows[i].bits).toBeLessThanOrEqual(rows[i - 1].bits);
  }

  // The meter shows the last row.
  const meter = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(meter.bits).toBeCloseTo(rows[rows.length - 1].bits, 1);

  // The chart plots one dot per row, with tooltips that quote the same numbers.
  const tips = await readChartTips(page);
  expect(tips).toHaveLength(rows.length);
  rows.forEach((row, i) => {
    expect(tips[i]).toContain(`step ${row.step}:`);
    expect(tips[i]).toContain(row.op);
    expect(tips[i]).toContain(`${row.bits.toFixed(1)} bits`);
  });
  const chartLabel = norm(await page.locator('[data-e3-chart]').getAttribute('aria-label'));
  expect(chartLabel).toContain(`${rows.length} steps`);
  expect(chartLabel).toContain(`${rows[rows.length - 1].bits.toFixed(1)} bits`);
  // The dashed decryption-failure floor the caption promises is really drawn.
  await expect(page.locator('[data-e3-chart] .chart-fail')).toHaveCount(1);
  await expect(page.locator('[data-e3-chart] .chart-line')).toHaveCount(1);
});

test('"multiply until it breaks" reaches 0 bits and explains the failure', async ({ page }) => {
  await page.click('[data-e3-auto]');
  // Wait for the collapse to actually land on the failure floor, then for the
  // run to hand its controls back (which is when it attempts the decryption).
  await expect(page.locator('[data-e3-budget-label]')).toHaveText(/Noise budget: 0\.0 bits/, { timeout: 60_000 });
  await expect(page.locator('[data-e3-auto]')).toBeEnabled({ timeout: 60_000 });

  const meter = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(meter.bits).toBe(0);
  expect(meter.pct).toBe(0);
  expect(meter.health).toBe('critical');

  const rows = await readNoiseTable(page);
  expect(rows.length).toBeGreaterThan(1);
  // Every step after the reset was a multiply, and the last one broke it.
  rows.slice(1).forEach((row) => expect(row.op).toContain('Multiply by 2'));
  expect(rows[rows.length - 1].bits).toBe(0);
  expect(rows[rows.length - 1].guaranteed).toBe(false);
  // Earlier steps were still guaranteed — the failure is the end of a slide,
  // not a state the page was sitting in all along.
  expect(rows[0].guaranteed).toBe(true);
  expect(rows[rows.length - 1].noise).toBeGreaterThan(rows[0].noise);

  const decrypt = await textOf(page, '[data-e3-decrypt]');
  expect(decrypt).toMatch(/^Decrypt output: \d+ \(expected \d+\)/);
  expect(decrypt).toContain('✗');
  expect(decrypt).toContain('budget exhausted');
  // It must say WHY, in one of the two honest forms the source offers: either
  // the value is garbage, or this slot survived by luck and is not guaranteed.
  expect(decrypt).toMatch(/the noise overflowed and the result is garbage|correctness is no longer guaranteed/);
});

test('bootstrap restores an exhausted budget to full and decryption works again', async ({ page }) => {
  await page.click('[data-e3-auto]');
  await expect(page.locator('[data-e3-auto]')).toBeEnabled({ timeout: 60_000 });
  const broken = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(broken.bits).toBe(0);
  const rowsBefore = await readNoiseTable(page);

  await page.click('[data-e3-boot]');
  const refreshed = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(refreshed.pct).toBe(100);
  expect(refreshed.health).toBe('healthy');
  expect(refreshed.bits).toBeGreaterThan(broken.bits);

  const rowsAfter = await readNoiseTable(page);
  expect(rowsAfter).toHaveLength(rowsBefore.length + 1);
  expect(rowsAfter[rowsAfter.length - 1].op).toContain('Bootstrap');
  expect(rowsAfter[rowsAfter.length - 1].guaranteed).toBe(true);
  expect(await textOf(page, '[data-e3-ops]')).toMatch(/→ bootstrap$/);

  await page.click('[data-e3-dec]');
  const decrypt = await textOf(page, '[data-e3-decrypt]');
  expect(decrypt).toContain('✓ correct, budget intact');
  const values = decrypt.match(/Decrypt output: (\d+) \(expected (\d+)\)/);
  expect(values).not.toBeNull();
  expect(values![1]).toBe(values![2]);
});

test('reset returns exhibit 3 to a single fresh, correct ciphertext', async ({ page }) => {
  await page.click('[data-e3-mul]');
  await page.click('[data-e3-mul]');
  await page.click('[data-e3-reset]');

  expect(await textOf(page, '[data-e3-ops]')).toBe('Sequence: fresh');
  const rows = await readNoiseTable(page);
  expect(rows).toHaveLength(1);
  expect(rows[0].step).toBe(0);
  expect(rows[0].guaranteed).toBe(true);
  const meter = await readBudget(page, '[data-e3-budget-label]', '[data-e3-budget-bar]');
  expect(meter.pct).toBe(100);
  // The reset verdict is a real decryption of the fresh ciphertext, not a stamp.
  expect(await textOf(page, '[data-e3-decrypt]')).toBe('Decrypt output: 3 (expected 3) — ✓ correct, budget intact.');
  expect(await readChartTips(page)).toHaveLength(1);
});

// ── Exhibit 4: multiply, relinearize, pack ─────────────────────────────────

test('exhibit 4 walks the ciphertext from 2 to 3 to 2 components and verifies the product', async ({ page }) => {
  const a = 7;
  const b = 3;
  await page.fill('#a4', String(a));
  await page.fill('#b4', String(b));

  await page.click('[data-e4-enc]');
  expect(await textOf(page, '[data-e4-info]')).toContain('Ciphertext components: 2');
  expect((await preOf(page, '[data-e4-ct]')).trim().split('\n')).toHaveLength(2);
  const fresh = await readBudget(page, '[data-e4-budget-label]', '[data-e4-budget-bar]');
  expect(fresh.pct).toBe(100);

  await page.click('[data-e4-mul]');
  expect(await textOf(page, '[data-e4-info]')).toContain('Ciphertext components: 3');
  const mulLines = (await preOf(page, '[data-e4-ct]')).trim().split('\n');
  expect(mulLines).toHaveLength(3);
  expect(mulLines[2]).toMatch(/^c2:/);
  const afterMul = await readBudget(page, '[data-e4-budget-label]', '[data-e4-budget-bar]');
  expect(fresh.bits - afterMul.bits).toBeGreaterThan(4);

  await page.click('[data-e4-relin]');
  expect(await textOf(page, '[data-e4-info]')).toContain('Ciphertext components: 2');
  expect((await preOf(page, '[data-e4-ct]')).trim().split('\n')).toHaveLength(2);
  // Relinearization shrinks the ciphertext without spending the budget again.
  const afterRelin = await readBudget(page, '[data-e4-budget-label]', '[data-e4-budget-bar]');
  expect(Math.abs(afterRelin.bits - afterMul.bits)).toBeLessThan(1);

  await page.click('[data-e4-dec]');
  const out = await textOf(page, '[data-e4-info]');
  const shown = out.match(/decrypted (\d+)/);
  const verify = out.match(/verify \((\d+) × (\d+)\) mod (\d+) = (\d+)/);
  expect(shown, out).not.toBeNull();
  expect(verify, out).not.toBeNull();
  const t = Number(verify![3]);
  expect(Number(verify![1])).toBe(a);
  expect(Number(verify![2])).toBe(b);
  expect(Number(verify![4])).toBe((a * b) % t);
  expect(Number(shown![1])).toBe((a * b) % t);
  expect(out).toContain('Components: 2');
  await expect(badgeOk(page.locator('[data-e4-info]'))).toHaveText(/matches plaintext/);
});

test('exhibit 4 refuses every out-of-order step with the step that is missing', async ({ page }) => {
  await page.click('[data-e4-mul]');
  expect(await textOf(page, '[data-e4-info]')).toBe('Encrypt A and B first.');
  await page.click('[data-e4-relin]');
  expect(await textOf(page, '[data-e4-info]')).toBe('Run multiply first.');
  await page.click('[data-e4-dec]');
  expect(await textOf(page, '[data-e4-info]')).toBe(
    'No multiplication ciphertext to decrypt. Encrypt and multiply first.',
  );
  await expect(page.locator('[data-e4-ct]')).toHaveText('awaiting…');

  // Relinearizing an already-2-component ciphertext is refused too.
  await page.click('[data-e4-enc]');
  await page.click('[data-e4-mul]');
  await page.click('[data-e4-relin]');
  await page.click('[data-e4-relin]');
  expect(await textOf(page, '[data-e4-info]')).toBe('Already relinearized — 2 components. Decrypt to check the result.');

  // Re-encrypting clears the stale product rather than leaving it decryptable.
  await page.click('[data-e4-enc]');
  await page.click('[data-e4-dec]');
  expect(await textOf(page, '[data-e4-info]')).toBe(
    'No multiplication ciphertext to decrypt. Encrypt and multiply first.',
  );
});

test('batched add is slot-wise and the slot count matches the values printed', async ({ page }) => {
  for (const [va, vb] of [
    [
      [2, 3, 4, 5],
      [10, 11, 12, 13],
    ],
    [[16], [16]],
  ] as const) {
    await page.fill('#batch-a', va.join(','));
    await page.fill('#batch-b', vb.join(','));
    await page.click('[data-e4-batch-enc]');
    expect(await textOf(page, '[data-e4-batch-out]')).toBe(
      `Encrypted A = [${va.join(', ')}] and B = [${vb.join(', ')}] into two packed ciphertexts. Now add them.`,
    );

    await page.click('[data-e4-batch-add]');
    expect(await textOf(page, '[data-e4-batch-out]')).toContain('processed all slots in parallel');

    await page.click('[data-e4-batch-dec]');
    const out = await textOf(page, '[data-e4-batch-out]');
    const slots = out.match(/\[([^\]]*)\]/);
    expect(slots, out).not.toBeNull();
    const values = slots![1].split(',').map((s) => Number(s.trim()));
    // Each slot is its own independent addition mod t (t = 17 in this toy).
    expect(values).toEqual(va.map((x, i) => (x + vb[i]) % 17));
    // The stated count must equal the number of slots actually printed.
    const counted = out.match(/(\d+) slot-wise addition/);
    expect(Number(counted![1])).toBe(values.length);
    expect(out).toContain(values.length === 1 ? 'addition from' : 'additions from');
  }
});

test('batching refuses empty input and out-of-order steps', async ({ page }) => {
  await page.click('[data-e4-batch-add]');
  expect(await textOf(page, '[data-e4-batch-out]')).toBe('Encrypt both batches first.');
  await page.click('[data-e4-batch-dec]');
  expect(await textOf(page, '[data-e4-batch-out]')).toBe('Add the batches first.');

  await page.fill('#batch-a', '   ');
  await page.click('[data-e4-batch-enc]');
  expect(await textOf(page, '[data-e4-batch-out]')).toBe('Enter at least one integer (0–16) in each batch first.');

  // Non-numeric junk is filtered out, so it is treated as an empty batch too.
  await page.fill('#batch-a', 'abc, ,xyz');
  await page.click('[data-e4-batch-enc]');
  expect(await textOf(page, '[data-e4-batch-out]')).toBe('Enter at least one integer (0–16) in each batch first.');

  // Re-encrypting invalidates the previous sum instead of decrypting stale data.
  await page.fill('#batch-a', '1,2');
  await page.fill('#batch-b', '3,4');
  await page.click('[data-e4-batch-enc]');
  await page.click('[data-e4-batch-add]');
  await page.click('[data-e4-batch-enc]');
  await page.click('[data-e4-batch-dec]');
  expect(await textOf(page, '[data-e4-batch-out]')).toBe('Add the batches first.');
});

// ── Exhibit 5: timing and the parameter explorer ───────────────────────────

test('the timing statistic is a real measurement of a correct operation', async ({ page }) => {
  await page.click('[data-e5-run]');
  const out = await textOf(page, '[data-e5-time]');
  const m = out.match(/Toy BFV add\+decrypt: ([\d.]+) ms\/op over (\d+) runs \(last result = (\d+)\)/);
  expect(m, out).not.toBeNull();
  expect(Number(m![1])).toBeGreaterThan(0);
  expect(Number(m![1])).toBeLessThan(1000);
  expect(Number(m![2])).toBe(100);
  // The timed loop decrypts ct(9) + ct(7); a wrong answer would mean the
  // "timing" was measuring something that does not actually work.
  expect(Number(m![3])).toBe((9 + 7) % 17);
});

test('parameter explorer: every stop is internally consistent and monotone', async ({ page }) => {
  const slider = page.locator('[data-param-n]');
  const max = Number(await slider.getAttribute('max'));
  expect(max).toBe(5);

  let prevN = 0;
  let prevLogQ = 0;
  let prevDepth = 0;
  for (let i = 0; i <= max; i += 1) {
    await slider.fill(String(i));
    await slider.dispatchEvent('input');

    const n = Number((await textOf(page, '[data-param-n-label]')).replace(/,/g, ''));
    const card = await textOf(page, '[data-param-out]');
    const logQ = Number(card.match(/security\s*(\d+) bits/)![1]);
    const depth = Number(card.match(/depth\s*≈ (\d+) level/)![1]);
    const speed = card.match(/Speed\s*(very fast|fast|moderate|slow|very slow)$/)![1];

    // Depth is the page's own stated rule: ~25 bits of modulus per level, above
    // a ~30-bit floor. Assert the number obeys the rule it is derived from.
    expect(depth).toBe(Math.max(0, Math.floor((logQ - 30) / 25)));
    expect(card).toContain(depth === 1 ? '1 level' : `${depth} levels`);
    // The screen-reader value must quote the same three numbers as the card.
    const valueText = norm(await slider.getAttribute('aria-valuetext'));
    expect(valueText).toBe(`n = ${n}, max log2 q = ${logQ} bits, about ${depth} multiplication levels, ${speed}`);

    // Larger degree ⇒ larger modulus ⇒ more depth. That is the whole tradeoff.
    expect(n).toBeGreaterThan(prevN);
    expect(logQ).toBeGreaterThan(prevLogQ);
    expect(depth).toBeGreaterThanOrEqual(prevDepth);
    if (prevN > 0) expect(n).toBe(prevN * 2);
    prevN = n;
    prevLogQ = logQ;
    prevDepth = depth;
  }
});

// ── Exhibit 6: the encrypted vote tally ────────────────────────────────────

/** Ballot state straight off the chips: {yes, no, total} plus the aria mirror. */
async function readBallots(page: Page): Promise<{ yes: number; no: number; total: number }> {
  return page.locator('.vote-chip').evaluateAll((chips) => {
    let yes = 0;
    let no = 0;
    for (const chip of chips) {
      const label = (chip.textContent ?? '').trim();
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      if (label.endsWith('Yes')) {
        yes += 1;
        if (!pressed) throw new Error(`chip "${label}" says Yes but aria-pressed is ${chip.getAttribute('aria-pressed')}`);
      } else {
        no += 1;
        if (pressed) throw new Error(`chip "${label}" says No but aria-pressed is true`);
      }
    }
    return { yes, no, total: chips.length };
  });
}

test('the encrypted tally equals the ballots on screen, before and after edits', async ({ page }) => {
  const before = await readBallots(page);
  // The counter must account for every ballot: parts sum to the whole.
  expect(before.total).toBe(10);
  expect(before.yes + before.no).toBe(before.total);

  await page.click('[data-vote-enc]');
  expect(await textOf(page, '[data-vote-out]')).toBe(
    `Encrypted ${before.total} ballots into ${before.total} independent ciphertexts. The server cannot read any single vote.`,
  );

  await page.click('[data-vote-tally]');
  const tallyMsg = await textOf(page, '[data-vote-out]');
  expect(tallyMsg).toContain(`Summed all ${before.total} ciphertexts`);
  const measured = tallyMsg.match(/Measured budget: ([\d.]+) bits — (healthy|warning|critical)/);
  expect(measured, tallyMsg).not.toBeNull();
  // Ten additions are cheap, so the budget must still be genuinely healthy —
  // and the word must match the number next to it.
  expect(Number(measured![1])).toBeGreaterThan(0);
  expect(measured![2]).toBe(expectedHealth(Number(measured![1])));
  expect(measured![2]).toBe('healthy');

  await page.click('[data-vote-dec]');
  const decrypted = await textOf(page, '[data-vote-out]');
  const shown = decrypted.match(/Decrypted tally: (\d+) Yes out of (\d+)/);
  const verify = decrypted.match(/verify plaintext sum = (\d+)/);
  expect(shown, decrypted).not.toBeNull();
  expect(Number(shown![1])).toBe(before.yes);
  expect(Number(shown![2])).toBe(before.total);
  expect(Number(verify![1])).toBe(before.yes);
  expect(decrypted).toContain('No individual ballot was ever decrypted');
  await expect(badgeOk(page.locator('[data-vote-out]'))).toHaveText(/matches plaintext/);

  // Flip three ballots and re-run: the tally must track the new ballots, which
  // proves it is a decryption and not a memorised number.
  for (const i of [0, 4, 6]) await page.locator('.vote-chip').nth(i).click();
  const after = await readBallots(page);
  expect(after.yes + after.no).toBe(after.total);
  expect(after.yes).not.toBe(before.yes);

  await page.click('[data-vote-enc]');
  await page.click('[data-vote-tally]');
  await page.click('[data-vote-dec]');
  const redone = await textOf(page, '[data-vote-out]');
  expect(Number(redone.match(/Decrypted tally: (\d+) Yes/)![1])).toBe(after.yes);
  expect(Number(redone.match(/verify plaintext sum = (\d+)/)![1])).toBe(after.yes);
  await expect(badgeOk(page.locator('[data-vote-out]'))).toHaveText(/matches plaintext/);
});

test('editing a ballot invalidates the encrypted state instead of tallying stale ciphertexts', async ({ page }) => {
  await page.click('[data-vote-tally]');
  expect(await textOf(page, '[data-vote-out]')).toBe('Encrypt the ballots first.');
  await page.click('[data-vote-dec]');
  expect(await textOf(page, '[data-vote-out]')).toBe('Tally the ciphertexts first.');

  await page.click('[data-vote-enc]');
  await page.click('[data-vote-tally]');
  // Tamper: change a ballot after the ciphertexts were summed.
  await page.locator('.vote-chip').nth(3).click();
  expect(await textOf(page, '[data-vote-out]')).toBe('Ballots changed — encrypt again to tally.');
  await page.click('[data-vote-dec]');
  expect(await textOf(page, '[data-vote-out]')).toBe('Tally the ciphertexts first.');
  await page.click('[data-vote-tally]');
  expect(await textOf(page, '[data-vote-out]')).toBe('Encrypt the ballots first.');

  // Encrypting again, without tallying, still cannot decrypt a tally.
  await page.click('[data-vote-enc]');
  await page.click('[data-vote-dec]');
  expect(await textOf(page, '[data-vote-out]')).toBe('Tally the ciphertexts first.');
});
