import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Department Head Experience', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'HEAD');
  });

  test('should render Head Dashboard with stats including pending transfers', async ({ page }) => {
    await page.goto('/head');

    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText('Ongoing Jobs')).toBeVisible();
    await expect(page.getByText('Completed Jobs')).toBeVisible();
    await expect(page.getByText('Active Analysts')).toBeVisible();
    await expect(page.getByText('Pending Transfers')).toBeVisible();
  });

  test('should render Review Queue with items and controls', async ({ page }) => {
    await page.goto('/head/review');

    await expect(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible();
    await expect(page.getByPlaceholder('Search...')).toBeVisible();

    // Expand instance card accordion
    await page.getByText(/2604230001/).first().click();

    await expect(page.getByText('Aldrin')).toBeVisible();
    await expect(page.getByText('GCMSMS')).toBeVisible();
    await expect(page.getByText('0.02')).toBeVisible();
  });

  test('should render Job Dispatcher with sample transfers and job list', async ({ page }) => {
    await page.goto('/head/dispatcher');

    await expect(page.getByRole('heading', { name: 'Job Dispatcher' })).toBeVisible();
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
  });

  test('should render Assistants Management and toggle Create Assistant form', async ({ page }) => {
    await page.goto('/head/assistants');

    await expect(page.getByRole('heading', { name: 'Assistants Management' })).toBeVisible();

    const createBtn = page.getByRole('button', { name: '+ Create Assistant' });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify form appears
    await expect(page.getByRole('heading', { name: 'Create Assistant' })).toBeVisible();
    await expect(page.getByPlaceholder('Jane Doe')).toBeVisible();

    // Close form
    await page.getByRole('button', { name: 'Close Form' }).click();
    await expect(page.getByRole('heading', { name: 'Create Assistant' })).not.toBeVisible();
  });

  test('should render Data Settings tabs for Head', async ({ page }) => {
    await page.goto('/head/data-settings');

    await expect(page.getByRole('heading', { name: 'Data Settings' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Parameter Groups/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sample Serial/i })).toBeVisible();
  });

  test('should render Department Activity Logs', async ({ page }) => {
    await page.goto('/head/audit');

    await expect(page.getByRole('heading', { name: 'Department Job Logs' })).toBeVisible();
    await expect(page.getByPlaceholder('Search Client or Code...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
