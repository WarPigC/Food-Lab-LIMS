import { test, expect } from '@playwright/test';
import { loginAs, setupApiMocks } from './helpers/auth.js';

test.describe('Assistant Analyst Experience', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'ASSISTANT');
  });

  test('should render Task Queue with assigned tasks', async ({ page }) => {
    await page.goto('/assistant');

    await expect(page.getByRole('heading', { name: /Task Queue/i })).toBeVisible();

    // Verify task cards
    const runAnalysisBtn = page.getByRole('button', { name: /Run Analysis|Revise & Resubmit/i }).first();
    await expect(runAnalysisBtn).toBeVisible();
  });

  test('should open task analysis form, allow entering results, and cancel back to queue', async ({ page }) => {
    await page.goto('/assistant');

    // Click Run Analysis on first task
    const runAnalysisBtn = page.getByRole('button', { name: /Run Analysis/i }).first();
    await runAnalysisBtn.click();

    // Verify active task view is displayed
    await expect(page.getByText('Sample Description')).toBeVisible();
    await expect(page.getByText(/Test Parameters/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit for Review' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();

    // Fill sample description
    const sampleDescInput = page.getByPlaceholder(/Describe the sample/i);
    await expect(sampleDescInput).toBeVisible();
    await sampleDescInput.fill('Light yellow clear liquid, free from foreign matter.');

    // Click Cancel to return to queue
    const cancelBtn = page.getByRole('button', { name: 'Cancel' });
    await cancelBtn.click();

    // Verify queue is back
    await expect(page.getByRole('heading', { name: /Task Queue/i })).toBeVisible();
  });
});
