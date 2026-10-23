import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Admin Officer Experience', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'ADMIN_OFFICER');
  });

  test('should render Officer Dashboard with stats and recent activity', async ({ page }) => {
    await page.goto('/admin-officer');

    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText('Ongoing Jobs')).toBeVisible();
    await expect(page.getByText('Completed Jobs')).toBeVisible();
    await expect(page.getByText('Active Analysts')).toBeVisible();
  });

  test('should render Jobs Page and open sample job creation form', async ({ page }) => {
    await page.goto('/admin-officer/jobs');

    await expect(page.getByRole('heading', { name: /Job Management|Job Distributor/i })).toBeVisible();

    const newJobBtn = page.getByRole('button', { name: '+ New Client Sample Job' });
    await expect(newJobBtn).toBeVisible();
    await newJobBtn.click();

    // Verify form opened
    await expect(page.getByText(/Log New Sample & Distribute/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();

    // Click close to collapse the form
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/Log New Sample & Distribute/i)).not.toBeVisible();
  });

  test('should render User Management and open Create User form', async ({ page }) => {
    await page.goto('/admin-officer/users');

    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

    const createUserBtn = page.getByRole('button', { name: '+ Create User' });
    await expect(createUserBtn).toBeVisible();
    await createUserBtn.click();

    // Verify Create User form fields appear
    await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();
    await expect(page.locator('form input').first()).toBeVisible();

    // Close form
    await page.getByRole('button', { name: 'Close Form' }).click();
    await expect(page.getByRole('heading', { name: 'Create User' })).not.toBeVisible();
  });

  test('should render Data Settings with tabs for Groups, Serial, and Backup', async ({ page }) => {
    await page.goto('/admin-officer/data-settings');

    await expect(page.getByRole('heading', { name: 'Data Settings' }).first()).toBeVisible();

    // Tabs
    const groupsTab = page.getByRole('button', { name: /Parameter Groups/i });
    const serialTab = page.getByRole('button', { name: /Sample Serial/i });
    const backupTab = page.getByRole('button', { name: /Backup/i });

    await expect(groupsTab).toBeVisible();
    await expect(serialTab).toBeVisible();
    await expect(backupTab).toBeVisible();

    // Switch to Serial tab
    await serialTab.click();
    await expect(page.getByText(/Current Serial Number/i)).toBeVisible();

    // Switch to Backup tab
    await backupTab.click();
    await expect(page.getByText(/Database Backup/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backup Data' })).toBeVisible();
  });

  test('should render Activity Logs for Admin Officer', async ({ page }) => {
    await page.goto('/admin-officer/audit');

    await expect(page.getByRole('heading', { name: /Global Job Logs/i })).toBeVisible();
    await expect(page.getByPlaceholder('Search Client or Code...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
