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

  test('should render pesticide panel cards for Chemical Head in Job Dispatcher', async ({ page }) => {
    await loginAs(page, 'HEAD', { department: 'Chemical' });
    await page.goto('/head/dispatcher');

    await expect(page.getByRole('heading', { name: 'Job Dispatcher' })).toBeVisible();

    // Click job card to expand
    await page.getByText(/2604230001/).first().click();

    // Verify pesticide panel cards and special panel badges
    await expect(page.getByText('Food Pesticides GC-MS/MS Panel (55 parameters)')).toBeVisible();
    await expect(page.getByText('Food Pesticides LC-MS/MS Panel (164 parameters)')).toBeVisible();
    await expect(page.getByText('Special Panel').first()).toBeVisible();
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

  test('should render Data Settings tabs and Special Profiles for Head', async ({ page }) => {
    await page.goto('/head/data-settings');

    await expect(page.getByRole('heading', { name: 'Data Settings' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Parameter Groups/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Special Profiles/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sample Serial/i })).toBeVisible();

    // Click Special Profiles tab
    await page.getByRole('button', { name: /Special Profiles/i }).click();

    // Verify profile selector cards
    await expect(page.getByText('Water ISO 10500:2012').first()).toBeVisible();
    await expect(page.getByText('Food Pesticides Residues').first()).toBeVisible();
    await expect(page.getByText('Fatty Acid Profile').first()).toBeVisible();

    // Verify parameter table
    await expect(page.getByRole('button', { name: /Add Parameter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Changes/i }).first()).toBeVisible();
  });

  test('should render Department Activity Logs', async ({ page }) => {
    await page.goto('/head/audit');

    await expect(page.getByRole('heading', { name: 'Department Job Logs' })).toBeVisible();
    await expect(page.getByPlaceholder('Search Client or Code...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
