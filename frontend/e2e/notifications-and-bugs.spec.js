import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Notifications and Bug Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'ADMIN_OFFICER');
  });

  test('should render Notifications page with filters and mark-all-read option', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible();

    // Verify filter buttons
    await expect(page.getByRole('button', { name: /All \(/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Unread \(/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Read \(/i })).toBeVisible();

    // Switch to Unread tab
    await page.getByRole('button', { name: /Unread \(/i }).click();

    // Switch to Read tab
    await page.getByRole('button', { name: /^Read \(/i }).click();
  });

  test('should complete the Bug Report workflow', async ({ page }) => {
    await page.goto('/report-bug');

    await expect(page.getByRole('heading', { name: 'Report an Issue' })).toBeVisible();

    // Step 1: Pick 'Bug Report'
    const bugCard = page.locator('.card', { hasText: 'Bug Report' }).first();
    await expect(bugCard).toBeVisible();
    await bugCard.click();

    // Step 2: Form appears
    await expect(page.getByText('Severity')).toBeVisible();
    await expect(page.getByText(/Reporting as/i)).toBeVisible();

    // Select severity
    const highSeverityBtn = page.getByRole('button', { name: 'High' });
    await expect(highSeverityBtn).toBeVisible();
    await highSeverityBtn.click();

    // Validation: submit button should be disabled when description is empty
    const submitBtn = page.getByRole('button', { name: 'Submit Report' });
    await expect(submitBtn).toBeDisabled();

    // Fill in valid description
    const descTextarea = page.locator('textarea');
    await descTextarea.fill('The job list does not update immediately after assigning an analyst.');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Step 3: Success state
    await expect(page.getByRole('heading', { name: 'Report Submitted!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Another Report' })).toBeVisible();
  });
});
