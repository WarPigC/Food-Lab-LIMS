import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Authentication and Layout Shell', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should display error toast on invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid email or password' }),
      });
    });

    await page.goto('/login');

    await page.getByPlaceholder('name@acropolis.com').fill('wrong@acropolis.com');
    await page.getByPlaceholder('••••••••').fill('badpassword');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // Verify error notification appears
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should display correct sidebar navigation links for ADMIN', async ({ page }) => {
    await loginAs(page, 'ADMIN');
    await page.goto('/admin');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Staff Directory' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Activity Logs' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Report Issue|Bug/i })).toBeVisible();
  });

  test('should display correct sidebar navigation links for ADMIN_OFFICER', async ({ page }) => {
    await loginAs(page, 'ADMIN_OFFICER');
    await page.goto('/admin-officer');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Job Distributor' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'User Management' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Data Settings' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Activity Logs' })).toBeVisible();
  });

  test('should display correct sidebar navigation links for HEAD', async ({ page }) => {
    await loginAs(page, 'HEAD');
    await page.goto('/head');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Review Queue' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Assistants' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Job Dispatcher' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Data Settings' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Activity Logs' })).toBeVisible();
  });

  test('should display correct sidebar navigation links for ASSISTANT', async ({ page }) => {
    await loginAs(page, 'ASSISTANT');
    await page.goto('/assistant');

    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    await expect(sidebar.getByRole('link', { name: 'Task Queue' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /Report Issue|Bug/i })).toBeVisible();
  });

  test('should open header user dropdown and allow logout', async ({ page }) => {
    const user = await loginAs(page, 'ADMIN_OFFICER');
    await page.goto('/admin-officer');

    // Verify user name in header
    const userSection = page.locator('.header-user-section');
    await expect(userSection).toBeVisible();
    await expect(userSection).toContainText(user.name);

    // Click profile dropdown
    await userSection.click();
    await expect(page.getByRole('button', { name: 'Change Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change Password' })).toBeVisible();

    // Click logout
    const logoutBtn = page.locator('header button[title="Logout"]');
    await logoutBtn.click();

    // Verify redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should open Profile Update modal for email change', async ({ page }) => {
    await loginAs(page, 'HEAD');
    await page.goto('/head');

    await page.locator('.header-user-section').click();
    await page.getByRole('button', { name: 'Change Email' }).click();

    await expect(page.getByRole('heading', { name: 'Change Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Change Email' })).not.toBeVisible();
  });
});
