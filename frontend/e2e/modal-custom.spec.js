import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Dynamic Modal Engine (modal.custom)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'ADMIN');
    await page.goto('/admin');
    await page.waitForSelector('.header-user-section');
    await page.waitForFunction(() => typeof window !== 'undefined' && !!window.__appModal);
  });

  test('should open custom Change Password modal from header and dismiss via top-right close X', async ({ page }) => {
    // Open user profile dropdown
    const profileBtn = page.locator('.header-user-section');
    await profileBtn.click();

    // Click Change Password
    const changePasswordBtn = page.getByRole('button', { name: 'Change Password' });
    await expect(changePasswordBtn).toBeVisible();
    await changePasswordBtn.click();

    // Verify custom modal card renders with title, icon, and custom password inputs
    const modalOverlay = page.locator('.modal-overlay');
    await expect(modalOverlay).toBeVisible();
    await expect(page.locator('.modal-title')).toHaveText('Change Password');
    await expect(page.getByPlaceholder('Enter new password')).toBeVisible();
    await expect(page.getByPlaceholder('Repeat new password')).toBeVisible();

    // Click top-right X close button
    const closeBtn = page.locator('.modal-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify modal dismissed cleanly
    await expect(modalOverlay).not.toBeVisible();
  });

  test('should open custom Change Email modal from header and dismiss via Escape key', async ({ page }) => {
    // Open user profile dropdown
    const profileBtn = page.locator('.header-user-section');
    await profileBtn.click();

    // Click Change Email
    const changeEmailBtn = page.getByRole('button', { name: 'Change Email' });
    await expect(changeEmailBtn).toBeVisible();
    await changeEmailBtn.click();

    // Verify custom modal renders
    const modalOverlay = page.locator('.modal-overlay');
    await expect(modalOverlay).toBeVisible();
    await expect(page.locator('.modal-title')).toHaveText('Change Email');
    await expect(page.getByPlaceholder('Enter current password')).toBeVisible();
    await expect(page.getByPlaceholder('Enter new email address')).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Verify modal dismissed cleanly
    await expect(modalOverlay).not.toBeVisible();
  });

  test('should dismiss custom modal on backdrop click when enabled', async ({ page }) => {
    // Open user profile dropdown
    const profileBtn = page.locator('.header-user-section');
    await profileBtn.click();

    const changeEmailBtn = page.getByRole('button', { name: 'Change Email' });
    await changeEmailBtn.click();

    const modalOverlay = page.locator('.modal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Click on backdrop outside modal-card (e.g. top-left corner of overlay)
    await modalOverlay.click({ position: { x: 10, y: 10 } });

    // Verify modal dismissed
    await expect(modalOverlay).not.toBeVisible();
  });

  test('should honor non-dismissible options (dismissOnBackdrop: false, dismissOnEsc: false, showClose: false)', async ({ page }) => {
    // Open a non-dismissible custom modal programmatically
    await page.evaluate(() => {
      window.__appModal.custom({
        title: 'Non-Dismissible Action',
        content: 'Critical operation in progress',
        dismissOnBackdrop: false,
        dismissOnEsc: false,
        showClose: false,
      });
    });

    const modalOverlay = page.locator('.modal-overlay');
    await expect(modalOverlay).toBeVisible();
    await expect(page.locator('.modal-title')).toHaveText('Non-Dismissible Action');
    await expect(page.getByText('Critical operation in progress')).toBeVisible();

    // Verify close X button is NOT rendered
    await expect(page.locator('.modal-close-btn')).not.toBeVisible();

    // Attempt Escape key dismissal; modal must remain visible
    await page.keyboard.press('Escape');
    await expect(modalOverlay).toBeVisible();

    // Attempt backdrop click; modal must remain visible
    await modalOverlay.click({ position: { x: 10, y: 10 } });
    await expect(modalOverlay).toBeVisible();

    // Close explicitly via API
    await page.evaluate(() => {
      window.__appModal.close();
    });
    await expect(modalOverlay).not.toBeVisible();
  });

  test('should sequentially queue multiple modals without stacking backdrops', async ({ page }) => {
    // Dispatch two custom modals in sequence
    await page.evaluate(() => {
      window.__appModal.custom({
        title: 'First Modal in Queue',
        content: 'Content for first step',
      });
      window.__appModal.custom({
        title: 'Second Modal in Queue',
        content: 'Content for second step',
      });
    });

    const modalOverlay = page.locator('.modal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Only first modal should be visible initially
    await expect(page.locator('.modal-title')).toHaveText('First Modal in Queue');
    await expect(page.getByText('Content for first step')).toBeVisible();
    await expect(page.getByText('Content for second step')).not.toBeVisible();

    // Dismiss first modal via Escape
    await page.keyboard.press('Escape');

    // Second modal should transition and become visible
    await expect(page.locator('.modal-title')).toHaveText('Second Modal in Queue');
    await expect(page.getByText('Content for second step')).toBeVisible();

    // Dismiss second modal
    await page.keyboard.press('Escape');
    await expect(modalOverlay).not.toBeVisible();
  });
});
