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
    const profilesTab = page.getByRole('button', { name: /Special Profiles/i });
    const serialTab = page.getByRole('button', { name: /Sample Serial/i });
    const backupTab = page.getByRole('button', { name: /Backup/i });

    await expect(groupsTab).toBeVisible();
    await expect(profilesTab).toBeVisible();
    await expect(serialTab).toBeVisible();
    await expect(backupTab).toBeVisible();

    // Switch to Special Profiles tab
    await profilesTab.click();
    await expect(page.getByText('Water ISO 10500:2012').first()).toBeVisible();

    // Switch to Serial tab
    await serialTab.click();
    await expect(page.getByText(/Current Serial Number/i)).toBeVisible();

    // Switch to Backup tab
    await backupTab.click();
    await expect(page.getByText(/Database Backup/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Backup Data' })).toBeVisible();
  });

  test('should render Special Profiles in Job Creation form and handle exclusivity and variants', async ({ page }) => {
    await page.goto('/admin-officer/jobs');

    const newJobBtn = page.getByRole('button', { name: '+ New Client Sample Job' });
    await expect(newJobBtn).toBeVisible();
    await newJobBtn.click();

    // Expand Sample Information accordion
    await page.getByText('Sample Information').click();

    // Verify Special Profiles section is visible
    await expect(page.getByText('Special Profiles & Panels')).toBeVisible();

    const waterCheckbox = page.locator('#special-profile-water');
    const pesticidesCheckbox = page.locator('#special-profile-pesticides');
    const fattyAcidsCheckbox = page.locator('#special-profile-fatty-acids');

    await expect(waterCheckbox).toBeVisible();
    await expect(pesticidesCheckbox).toBeVisible();
    await expect(fattyAcidsCheckbox).toBeVisible();

    // Activate Water ISO 10500 (Exclusive)
    await waterCheckbox.check();
    await expect(waterCheckbox).toBeChecked();
    await expect(page.getByText(/Water ISO 10500:2012 Standard Profile is active/i)).toBeVisible();
    await expect(pesticidesCheckbox).toBeDisabled();
    await expect(fattyAcidsCheckbox).toBeDisabled();

    // Deactivate Water ISO 10500
    await waterCheckbox.uncheck();
    await expect(waterCheckbox).not.toBeChecked();
    await expect(page.getByText(/Water ISO 10500:2012 Standard Profile is active/i)).not.toBeVisible();
    await expect(pesticidesCheckbox).toBeEnabled();
    await expect(fattyAcidsCheckbox).toBeEnabled();

    // Activate Fatty Acid Profile and verify variants
    await fattyAcidsCheckbox.check();
    await expect(fattyAcidsCheckbox).toBeChecked();
    await expect(page.getByText('Compiled', { exact: true })).toBeVisible();
    await expect(page.getByText('Full Profile', { exact: true })).toBeVisible();

    // Activate Pesticides
    await pesticidesCheckbox.check();
    await expect(pesticidesCheckbox).toBeChecked();
  });

  test('should render Activity Logs for Admin Officer', async ({ page }) => {
    await page.goto('/admin-officer/audit');

    await expect(page.getByRole('heading', { name: /Global Job Logs/i })).toBeVisible();
    await expect(page.getByPlaceholder('Search Client or Code...')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
