import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Admin Experience', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'ADMIN');
  });

  test('should render Admin Dashboard with stat cards and recent activity', async ({ page }) => {
    await page.goto('/admin');

    // Heading
    await expect(page.getByRole('heading', { name: /Admin Dashboard|Dashboard/i })).toBeVisible();

    // Verify stat cards
    await expect(page.getByText('Ongoing Jobs')).toBeVisible();
    await expect(page.getByText('Completed Jobs')).toBeVisible();
    await expect(page.getByText('Active Analysts')).toBeVisible();

    // Verify recent activity section
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  });

  test('should render Staff Directory with collapsible sections', async ({ page }) => {
    await page.goto('/admin/users');

    // Page title
    await expect(page.getByRole('heading', { name: 'Staff Directory' })).toBeVisible();

    // Check staff sections
    await expect(page.getByRole('heading', { name: 'Management' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Department Heads' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lab Assistants' })).toBeVisible();

    // Create user button
    await expect(page.getByRole('button', { name: '+ Create User' })).toBeVisible();
  });

  test('should render Activity Logs with filters and job logs table', async ({ page }) => {
    await page.goto('/admin/audit');

    // Page title
    await expect(page.getByRole('heading', { name: 'Activity Logs' })).toBeVisible();

    // Search bar for jobs
    const searchInput = page.getByPlaceholder('Search Client or Code...');
    await expect(searchInput).toBeVisible();

    // Status filter combobox
    await expect(page.getByRole('combobox')).toBeVisible();

    // Table presence
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Job Code' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Client Name' })).toBeVisible();
  });
});
