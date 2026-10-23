/* global process */
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for AIPER Frontend.
 * Run tests with: npx playwright test --reporter=line
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',

  use: {
    /* Dev server address */
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /*
   * If you prefer Playwright to automatically start Vite when not already running,
   * uncomment the block below:
   *
   * webServer: {
   *   command: 'npm run dev',
   *   url: 'http://localhost:5173',
   *   reuseExistingServer: true,
   * },
   */
});
