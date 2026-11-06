import { expect, test } from '@playwright/test'

test('server substitution, input invalidation and coincidence are distinct', async ({ page }) => {
  await page.goto('.')
  const out = page.locator('#research-integrity')
  await page.locator('#research-run').click()
  await expect(out).toContainText('Expected 7; decrypted 7')
  await page.locator('#research-server').selectOption('dishonest')
  await expect(out).toContainText('Run again')
  await page.locator('#research-run').click()
  await expect(out).toContainText('Expected 7; decrypted 11')
  await expect(out).toContainText('No cryptographic proof')
  await page.locator('#research-b').fill('0')
  await expect(out).toContainText('Run again')
  await page.locator('#research-run').click()
  await expect(out).toContainText('matches on this input')
  await page.locator('#research-a').fill('9')
  await page.locator('#research-run').click()
  await expect(out).toContainText('Enter whole numbers')
})

test('occupancy changes amortized cost, not latency; all boundary labels are honest', async ({ page }) => {
  await page.goto('.')
  const cost = page.locator('#research-cost')
  await expect(cost).toContainText('Online batch latency: 840 ms')
  await expect(cost).toContainText('1840.000 ms/useful item')
  await page.locator('#research-slots').fill('1024')
  await expect(cost).toContainText('Online batch latency: 840 ms')
  await expect(cost).toContainText('1.797 ms/useful item')
  await page.locator('#research-slots').fill('0')
  await expect(cost).toContainText('bounds')
  const result = page.locator('#research-boundary-result')
  await expect(result).toContainText('Correct ring arithmetic')
  for (const [kind, text] of [['noise', 'controlled corruption'], ['precision', 'not CKKS encryption'], ['depth', 'not a BFV failure threshold']]) {
    await page.locator('#research-boundary').selectOption(kind)
    await expect(result).toContainText(text)
  }
})

test('printed sorting counterexamples and repaired traces are visible', async ({ page }) => {
  await page.goto('.')
  const result = page.locator('#research-sort-result')
  for (const [kind, before, after] of [['merge', 'Output [1,0]', 'Output [1,2]'], ['radix', 'Output [1,0]', 'Output [0,1]'], ['ranks', 'Upper ranks [1,1]', 'Stable unique destinations [0,1]']]) {
    await page.locator('#research-repair').uncheck()
    await page.locator('#research-sort').selectOption(kind)
    await expect(result).toContainText(before)
    await page.locator('#research-repair').check()
    await expect(result).toContainText(after)
  }
})

test('workbench controls and traces reflow at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('.')
  await expect(page.locator('#research-heading')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.locator('#research-repair').focus()
  await page.keyboard.press('Space')
  await expect(page.locator('#research-sort-result')).toContainText('Output [1,2]')
})
