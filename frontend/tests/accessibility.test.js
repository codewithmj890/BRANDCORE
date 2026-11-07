import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('application shell has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const results = await new AxeBuilder({ page }).analyze()
  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(seriousOrCritical).toEqual([])
})
