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

  test('should render Job Monitor with in-flight jobs, ticks, and controls', async ({ page }) => {
    await page.goto('/head/monitor');

    await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible();
    await expect(page.getByPlaceholder('Search...')).toBeVisible();

    // Verify card header elements
    await expect(page.getByText('2604230001')).toBeVisible();
    await expect(page.getByText(/1 \/ 2 saved/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Withdraw Dispatch/i })).toBeVisible();

    // Expand card by clicking header
    await page.getByText('2604230001').click();

    // Verify parameter table
    await expect(page.getByText('Select All Parameters in Job (2)')).toBeVisible();
    await expect(page.getByText('Total Plate Count')).toBeVisible();
    await expect(page.getByText('Yeast & Mould')).toBeVisible();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();

    // Select all parameters in job via checkbox
    await page.getByText('Select All Parameters in Job (2)').click();

    // Verify sticky Move footer appears
    await expect(page.getByText('2 parameter(s) selected')).toBeVisible();
    await expect(page.getByRole('button', { name: /Move to Analyst/i })).toBeVisible();
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

    // Water ISO is locked national standard, select Food Pesticides to see editable controls
    await page.getByText('Food Pesticides Residues').first().click();

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

  test('should render uniform revamped analyst dropdowns and assign analyst', async ({ page }) => {
    await loginAs(page, 'HEAD', { department: 'Chemical' });
    await page.goto('/head/dispatcher');

    // Click job card to expand
    await page.getByText(/2604230001/).first().click();

    // Verify uniform select dropdowns on parameter rows
    const dropdowns = page.locator('.analyst-select-dropdown');
    await expect(dropdowns.first()).toBeVisible();

    // Verify unassigned class on initial load
    await expect(dropdowns.first()).toHaveClass(/is-unassigned/);

    // Select an analyst in first row
    await dropdowns.first().selectOption({ label: 'Analyst Bob' });

    // Verify dropdown updates to assigned class
    await expect(dropdowns.first()).toHaveClass(/is-assigned/);
    await expect(dropdowns.first()).toHaveValue('u-asst-2');

    // Test bulk assign dropdown
    const bulkSelect = page.locator('select[aria-label="Bulk assign all parameters"]');
    await expect(bulkSelect).toBeVisible();
    await bulkSelect.selectOption({ label: 'Analyst Bob' });

    // All parameter dropdowns should now have Analyst Bob assigned
    const paramDropdowns = page.locator('select[aria-label^="Select analyst for"]');
    const count = await paramDropdowns.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(paramDropdowns.nth(i)).toHaveValue('u-asst-2');
      await expect(paramDropdowns.nth(i)).toHaveClass(/is-assigned/);
    }
  });

  test('should render uniform dropdowns without out-of-bounds overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page, 'HEAD', { department: 'Chemical' });
    await page.goto('/head/dispatcher');

    // Expand job card
    await page.getByText(/2604230001/).first().click();

    // Verify dropdown is visible and does not overflow viewport width
    const firstDropdown = page.locator('.analyst-select-dropdown').first();
    await expect(firstDropdown).toBeVisible();

    const box = await firstDropdown.boundingBox();
    expect(box).not.toBeNull();
    // Dropdown right boundary must be strictly within 375px mobile screen width
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });

  test('should lay out parameters in a responsive grid and display special panels', async ({ page }) => {
    await loginAs(page, 'HEAD', { department: 'Chemical' });
    await page.goto('/head/dispatcher');

    // Expand job card
    await page.getByText(/2604230001/).first().click();

    // Verify grid container exists
    const grid = page.locator('.dispatcher-params-grid');
    await expect(grid).toBeVisible();

    // Verify parameter cards inside grid
    const cards = grid.locator('.dispatcher-param-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(1);

    // Verify pesticide special panels have the special panel class and badge
    const specialPanels = grid.locator('.dispatcher-param-card.is-special-panel');
    await expect(specialPanels.first()).toBeVisible();
    await expect(specialPanels.first().getByText('Special Panel')).toBeVisible();
    await expect(specialPanels.first().getByText(/Food Pesticides/)).toBeVisible();
  });
});
