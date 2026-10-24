import { test, expect } from '@playwright/test';

test.describe('AIPER Frontend Smoke Tests', () => {
  test('should load the login page and display core elements', async ({ page }) => {
    // Navigate to root which redirects unauthenticated users to /login
    await page.goto('/');

    // Verify redirection to /login
    await expect(page).toHaveURL(/\/login/);

    // Verify document title
    await expect(page).toHaveTitle(/Acropolis FTS/);

    // Verify Acropolis logo is displayed
    const logo = page.getByRole('img', { name: 'Acropolis Logo' });
    await expect(logo).toBeVisible();

    // Verify login form inputs and button
    const emailInput = page.getByPlaceholder('name@acropolis.com');
    const passwordInput = page.getByPlaceholder('••••••••');
    const loginButton = page.getByRole('button', { name: 'Login', exact: true });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should toggle to OTP login and back to standard login', async ({ page }) => {
    await page.goto('/login');

    // Click Login via OTP
    const otpToggleBtn = page.getByRole('button', { name: 'Login via OTP' });
    await expect(otpToggleBtn).toBeVisible();
    await otpToggleBtn.click();

    // Verify OTP view appears
    await expect(page.getByRole('heading', { name: 'Login via OTP' })).toBeVisible();
    const sendOtpBtn = page.getByRole('button', { name: 'Send OTP' });
    await expect(sendOtpBtn).toBeVisible();

    // Click Back arrow to exit OTP mode
    const backBtn = page.locator('form button').first();
    await backBtn.click();

    // Verify standard login returns
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });
});
