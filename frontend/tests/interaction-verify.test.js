import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('BRANDCORE frontend recovery verification', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test('loads without console errors and shows correct layout', async ({ page }) => {
        test.setTimeout(120000);

        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push('Console: ' + msg.text());
        });
        page.on('pageerror', err => consoleErrors.push('Page: ' + err.message));

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // No horizontal overflow
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(vp.width);

        // Console errors
        expect(consoleErrors).toEqual([]);

        // Hamburger button visible at all sizes
        const hamburger = page.locator('button[aria-label="Open navigation"], button[aria-label="Close navigation"]');
        await expect(hamburger).toBeVisible();

        // Sidebar visible only at desktop/laptop
        const sidebar = page.locator('#brandcore-sidebar');
        const isDesktop = vp.name === 'desktop' || vp.name === 'laptop';
        if (isDesktop) {
          await expect(sidebar).toBeVisible();
        } else {
          await expect(sidebar).not.toBeVisible();
        }
      });

      test('theme toggle works', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Toggle theme
        const themeToggle = page.locator('button[aria-label="Switch to light mode"], button[aria-label="Switch to dark mode"]');
        await expect(themeToggle).toBeVisible();
        await themeToggle.click();
        await page.waitForTimeout(1000);

        // Dark class should be applied
        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDark).toBe(true);

        // Toggle back
        await themeToggle.click();
        await page.waitForTimeout(1000);
        const isDark2 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDark2).toBe(false);
      });

      test('hamburger click toggles sidebar/drawer', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const hamburger = page.locator('button[aria-label="Open navigation"], button[aria-label="Close navigation"]');
        const sidebar = page.locator('#brandcore-sidebar');
        const mobileDrawer = page.locator('#brandcore-sidebar-mobile');
        const isDesktop = vp.name === 'desktop' || vp.name === 'laptop';

        // Get initial aria-label
        const initialLabel = await hamburger.getAttribute('aria-label');
        const expectedAfterFirstClick = initialLabel === 'Open navigation' ? 'Close navigation' : 'Open navigation';

        // Click hamburger
        await hamburger.click();
        await page.waitForTimeout(1000);

        if (isDesktop) {
          // Desktop: sidebar should still be visible (collapsed state changes width)
          await expect(sidebar).toBeVisible();
          await expect(hamburger).toHaveAttribute('aria-label', expectedAfterFirstClick);
        } else {
          // Mobile/tablet: drawer should open
          await expect(mobileDrawer).toBeVisible();
          await expect(hamburger).toHaveAttribute('aria-label', expectedAfterFirstClick);
        }

        // Click hamburger again to close
        await hamburger.click();
        await page.waitForTimeout(1000);

        if (isDesktop) {
          await expect(sidebar).toBeVisible();
          await expect(hamburger).toHaveAttribute('aria-label', initialLabel);
        } else {
          await expect(mobileDrawer).not.toBeVisible();
          await expect(hamburger).toHaveAttribute('aria-label', initialLabel);
        }
      });

      test('no invisible overlay blocks clicks', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Check elementFromPoint at center of screen - should not be a backdrop/overlay
        const centerX = vp.width / 2;
        const centerY = vp.height / 2;

        // Click at center - should not trigger any overlay close
        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(500);

        // Verify no modal/backdrop appeared
        const backdrop = page.locator('.fixed.inset-0.z-50.bg-black\\/50');
        const backdropCount = await backdrop.count();
        if (backdropCount > 0) {
          const isVisible = await backdrop.first().isVisible();
          expect(isVisible).toBe(false);
        }
      });
    });
  }
});

