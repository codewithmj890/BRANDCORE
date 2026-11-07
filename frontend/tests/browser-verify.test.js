import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test('BRANDCORE browser verification - all viewports, both themes', async ({ page }) => {
  test.setTimeout(120000);

  const errors = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push('Console: ' + msg.text());
  });
  page.on('pageerror', err => errors.push('Page: ' + err.message));

  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    if (bodyWidth > vp.width) {
      errors.push(`${vp.name}-light: body scrollWidth ${bodyWidth} > viewport ${vp.width}`);
    }

    for (const theme of ['light', 'dark']) {
      // Set theme without reload - just toggle dark class and localStorage
      await page.evaluate((t) => {
        localStorage.setItem('brandcore-theme', t);
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);
      await page.waitForTimeout(500);

      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (theme === 'dark' && !isDark) {
        errors.push(`${vp.name}-dark: dark class not applied`);
      }
      if (theme === 'light' && isDark) {
        errors.push(`${vp.name}-light: dark class incorrectly applied`);
      }

      // Check layout elements
      const sidebarVisible = await page.locator('#brandcore-sidebar').isVisible().catch(() => false);
      const hamburgerVisible = await page.locator('button[aria-label="Open navigation"], button[aria-label="Close navigation"]').isVisible().catch(() => false);
      const mobileDrawerVisible = await page.locator('#brandcore-sidebar-mobile').isVisible().catch(() => false);

      if (vp.name === 'desktop' || vp.name === 'laptop') {
        if (!sidebarVisible) {
          errors.push(`${vp.name}-${theme}: sidebar not visible on desktop`);
        }
        if (hamburgerVisible) {
          errors.push(`${vp.name}-${theme}: hamburger visible on desktop`);
        }
      } else {
        if (sidebarVisible) {
          errors.push(`${vp.name}-${theme}: sidebar visible on mobile`);
        }
        if (!hamburgerVisible) {
          errors.push(`${vp.name}-${theme}: hamburger not visible on mobile`);
        }
      }

      // Check dark mode on key surfaces
      const topBarBg = await page.locator('header').evaluate(el => getComputedStyle(el).backgroundColor);
      const sidebarBg = await page.locator('#brandcore-sidebar').evaluate(el => getComputedStyle(el).backgroundColor).catch(() => '');

      if (theme === 'dark') {
        // TopBar should not be white in dark mode
        if (topBarBg.includes('255, 255, 255')) {
          errors.push(`${vp.name}-dark: topbar background is white`);
        }
        if (sidebarBg.includes('255, 255, 255')) {
          errors.push(`${vp.name}-dark: sidebar background is white`);
        }
      }

      // Take screenshot
      const safeName = `verify-${vp.name}-${theme}`;
      await page.screenshot({
        path: `C:\\BRANDCORE\\verify-${safeName}.png`,
        fullPage: true,
      });

      results.push({
        viewport: vp.name,
        theme,
        sidebarVisible,
        mobileDrawerVisible,
        hamburgerVisible,
        themeApplied: isDark === (theme === 'dark'),
      });
    }
  }

  console.log('\n=== BROWSER VERIFICATION RESULTS ===');
  results.forEach(r => {
    console.log(`${r.viewport.padEnd(10)} ${r.theme.padEnd(6)} sidebar:${String(r.sidebarVisible).padEnd(5)} hamburger:${String(r.hamburgerVisible).padEnd(8)} theme:${r.themeApplied}`);
  });

  console.log('\n=== ERRORS ===');
  if (errors.length > 0) {
    errors.forEach(e => console.log('  -', e));
  } else {
    console.log('  None');
  }

  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(e => console.log('  -', e));
  } else {
    console.log('  None');
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
});
