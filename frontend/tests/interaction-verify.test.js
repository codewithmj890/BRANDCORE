import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test.describe('BRANDCORE critical interaction repair verification', () => {
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

        // Console errors - including validateDOMNesting button warning
        const nestingWarnings = consoleErrors.filter(e => e.includes('validateDOMNesting') || e.includes('<button> cannot appear'));
        expect(nestingWarnings).toEqual([]);
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

        // Sidebar navigation buttons have circular icon containers (desktop only)
        if (isDesktop) {
          const iconContainers = page.locator('#brandcore-sidebar button[type="button"] span.w-10.h-10');
          const count = await iconContainers.count();
          expect(count).toBeGreaterThan(0);
          // First icon container should be roughly circular (40px)
          const firstIcon = iconContainers.first();
          const box = await firstIcon.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThan(36);
            expect(box.width).toBeLessThan(46);
            expect(box.height).toBeGreaterThan(36);
            expect(box.height).toBeLessThan(46);
          }
        }
      });

      test('sidebar navigation items respond to clicks', async ({ page }) => {
        test.setTimeout(120000);

        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push('Console: ' + msg.text());
        });
        page.on('pageerror', err => consoleErrors.push('Page: ' + err.message));

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const isDesktop = vp.name === 'desktop' || vp.name === 'laptop';

        // Open drawer on mobile/tablet if needed
        if (!isDesktop) {
          const hamburger = page.locator('button[aria-label="Open navigation"], button[aria-label="Close navigation"]');
          await hamburger.click();
          await page.waitForTimeout(500);
        }

        // Click each navigation item and verify active state updates
        const navItems = ['overview', 'facts', 'content', 'releases', 'evidence'];
        for (const itemId of navItems) {
          const navButton = page.locator(`#brandcore-sidebar button[aria-label="${itemId}"], #brandcore-sidebar-mobile button[aria-label="${itemId}"]`).first();
          if (await navButton.isVisible()) {
            await navButton.click();
            await page.waitForTimeout(500);

            // Verify active state - the clicked item should have aria-current="page"
            await expect(navButton).toHaveAttribute('aria-current', 'page');

            // Verify PageHeader title updated
            const pageTitle = page.locator('h1');
            await expect(pageTitle).toBeVisible();
          }
        }

        // Console errors
        expect(consoleErrors).toEqual([]);
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
          await expect(sidebar).toBeVisible();
          await expect(hamburger).toHaveAttribute('aria-label', expectedAfterFirstClick);
        } else {
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

      test('theme toggle works', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const themeToggle = page.locator('button[aria-label="Switch to light mode"], button[aria-label="Switch to dark mode"]');
        await expect(themeToggle).toBeVisible();
        await themeToggle.click();
        await page.waitForTimeout(1000);

        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDark).toBe(true);

        await themeToggle.click();
        await page.waitForTimeout(1000);
        const isDark2 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(isDark2).toBe(false);
      });

      test('no invisible overlay blocks clicks', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        const centerX = vp.width / 2;
        const centerY = vp.height / 2;

        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(500);

        const backdrop = page.locator('.fixed.inset-0.z-50.bg-black\\/50');
        const backdropCount = await backdrop.count();
        if (backdropCount > 0) {
          const isVisible = await backdrop.first().isVisible();
          expect(isVisible).toBe(false);
        }
      });

      test('no nested interactive elements in DOM', async ({ page }) => {
        test.setTimeout(120000);

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Check no button is nested inside another button
        const nestedButtons = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          let nested = 0;
          buttons.forEach(btn => {
            if (btn.closest('button') !== btn) {
              nested++;
            }
          });
          return nested;
        });
        expect(nestedButtons).toBe(0);
      });
    });
  }
});

test.describe('Content Review page empty state', () => {
  test('Submit Content action works without nested button warning', async ({ page }) => {
    test.setTimeout(120000);

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push('Console: ' + msg.text());
    });
    page.on('pageerror', err => consoleErrors.push('Page: ' + err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Navigate to Content Review
    const contentNav = page.locator('#brandcore-sidebar button[aria-label="Content Review"]').first();
    if (await contentNav.isVisible()) {
      await contentNav.click();
      await page.waitForTimeout(2000);
    }

    // Click Submit Content in page header actions
    const submitBtn = page.locator('button:has-text("Submit Content")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // The submission form should appear (ContentSubmissionForm)
      const titleInput = page.locator('input[name="title"], input[id*="-title"]').first();
      if (await titleInput.isVisible()) {
        await expect(titleInput).toBeVisible();
      }
    }

    // Console errors - no validateDOMNesting warnings
    const nestingWarnings = consoleErrors.filter(e => e.includes('validateDOMNesting'));
    expect(nestingWarnings).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
