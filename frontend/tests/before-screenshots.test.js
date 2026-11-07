import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'facts', path: '/facts' },
  { name: 'content', path: '/content' },
  { name: 'releases', path: '/releases' },
  { name: 'evidence', path: '/evidence' },
];

test('BRANDCORE before-screenshots all viewports', async ({ page }) => {
  test.setTimeout(120000);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('Console: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('Page: ' + err.message));

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const theme of ['light', 'dark']) {
      // Set theme via localStorage before navigation
      await page.goto('http://localhost:5173/', {
        waitUntil: 'networkidle',
      });
      await page.evaluate((t) => {
        localStorage.setItem('brandcore-theme', t);
        document.documentElement.classList.toggle('dark', t === 'dark');
      }, theme);
      await page.reload({ waitUntil: 'networkidle' });

      for (const pg of PAGES) {
        try {
          await page.goto(`http://localhost:5173${pg.path}`, {
            waitUntil: 'networkidle',
          });
          await page.waitForTimeout(500);
          const safeName = `before-${vp.name}-${theme}-${pg.name}`;
          await page.screenshot({
            path: `C:\\BRANDCORE\\screenshots-before\\${safeName}.png`,
            fullPage: true,
          });
          console.log(`PASS: ${safeName}`);
        } catch (e) {
          console.log(`FAIL: ${vp.name}-${theme}-${pg.name}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n=== BEFORE SCREENSHOTS COMPLETE ===');
  console.log('Errors:', errors.length);
  if (errors.length > 0) errors.forEach(e => console.log('  -', e));
});
