# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend/e2e/admin-officer.spec.js >> Admin Officer Experience >> should render Jobs Page and open sample job creation form
- Location: frontend/e2e/admin-officer.spec.js:19:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/admin-officer/jobs", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { loginAs, setupApiMocks } from './helpers/auth.js';
  3   | 
  4   | test.describe('Admin Officer Experience', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await setupApiMocks(page);
  7   |     await loginAs(page, 'ADMIN_OFFICER');
  8   |   });
  9   | 
  10  |   test('should render Officer Dashboard with stats and recent activity', async ({ page }) => {
  11  |     await page.goto('/admin-officer');
  12  | 
  13  |     await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  14  |     await expect(page.getByText('Ongoing Jobs')).toBeVisible();
  15  |     await expect(page.getByText('Completed Jobs')).toBeVisible();
  16  |     await expect(page.getByText('Active Analysts')).toBeVisible();
  17  |   });
  18  | 
  19  |   test('should render Jobs Page and open sample job creation form', async ({ page }) => {
> 20  |     await page.goto('/admin-officer/jobs');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  21  | 
  22  |     await expect(page.getByRole('heading', { name: /Job Management|Job Distributor/i })).toBeVisible();
  23  | 
  24  |     const newJobBtn = page.getByRole('button', { name: '+ New Client Sample Job' });
  25  |     await expect(newJobBtn).toBeVisible();
  26  |     await newJobBtn.click();
  27  | 
  28  |     // Verify form opened
  29  |     await expect(page.getByText(/Log New Sample & Distribute/i)).toBeVisible();
  30  |     await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  31  | 
  32  |     // Click close to collapse the form
  33  |     await page.getByRole('button', { name: 'Close' }).click();
  34  |     await expect(page.getByText(/Log New Sample & Distribute/i)).not.toBeVisible();
  35  |   });
  36  | 
  37  |   test('should render User Management and open Create User form', async ({ page }) => {
  38  |     await page.goto('/admin-officer/users');
  39  | 
  40  |     await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  41  | 
  42  |     const createUserBtn = page.getByRole('button', { name: '+ Create User' });
  43  |     await expect(createUserBtn).toBeVisible();
  44  |     await createUserBtn.click();
  45  | 
  46  |     // Verify Create User form fields appear
  47  |     await expect(page.getByRole('heading', { name: 'Create User' })).toBeVisible();
  48  |     await expect(page.locator('form input').first()).toBeVisible();
  49  | 
  50  |     // Close form
  51  |     await page.getByRole('button', { name: 'Close Form' }).click();
  52  |     await expect(page.getByRole('heading', { name: 'Create User' })).not.toBeVisible();
  53  |   });
  54  | 
  55  |   test('should render Data Settings with tabs for Groups, Serial, and Backup', async ({ page }) => {
  56  |     await page.goto('/admin-officer/data-settings');
  57  | 
  58  |     await expect(page.getByRole('heading', { name: 'Data Settings' }).first()).toBeVisible();
  59  | 
  60  |     // Tabs
  61  |     const groupsTab = page.getByRole('button', { name: /Parameter Groups/i });
  62  |     const profilesTab = page.getByRole('button', { name: /Special Profiles/i });
  63  |     const serialTab = page.getByRole('button', { name: /Sample Serial/i });
  64  |     const backupTab = page.getByRole('button', { name: /Backup/i });
  65  | 
  66  |     await expect(groupsTab).toBeVisible();
  67  |     await expect(profilesTab).toBeVisible();
  68  |     await expect(serialTab).toBeVisible();
  69  |     await expect(backupTab).toBeVisible();
  70  | 
  71  |     // Switch to Special Profiles tab
  72  |     await profilesTab.click();
  73  |     await expect(page.getByText('Water ISO 10500:2012').first()).toBeVisible();
  74  | 
  75  |     // Switch to Serial tab
  76  |     await serialTab.click();
  77  |     await expect(page.getByText(/Current Serial Number/i)).toBeVisible();
  78  | 
  79  |     // Switch to Backup tab
  80  |     await backupTab.click();
  81  |     await expect(page.getByText(/Database Backup/i)).toBeVisible();
  82  |     await expect(page.getByRole('button', { name: 'Backup Data' })).toBeVisible();
  83  |   });
  84  | 
  85  |   test('should render Special Profiles in Job Creation form and handle exclusivity and variants', async ({ page }) => {
  86  |     await page.goto('/admin-officer/jobs');
  87  | 
  88  |     const newJobBtn = page.getByRole('button', { name: '+ New Client Sample Job' });
  89  |     await expect(newJobBtn).toBeVisible();
  90  |     await newJobBtn.click();
  91  | 
  92  |     // Expand Sample Information accordion
  93  |     await page.getByText('Sample Information').click();
  94  | 
  95  |     // Verify Special Profiles section is visible
  96  |     await expect(page.getByText('Special Profiles & Panels')).toBeVisible();
  97  | 
  98  |     const waterCheckbox = page.locator('#special-profile-water-single, #special-profile-water');
  99  |     const pesticidesCheckbox = page.locator('#special-profile-pesticides-single, #special-profile-pesticides');
  100 |     const fattyAcidsCheckbox = page.locator('#special-profile-fatty-acids-single, #special-profile-fatty-acids');
  101 | 
  102 |     await expect(waterCheckbox).toBeVisible();
  103 |     await expect(pesticidesCheckbox).toBeVisible();
  104 |     await expect(fattyAcidsCheckbox).toBeVisible();
  105 | 
  106 |     // Activate Water ISO 10500 (Exclusive)
  107 |     await waterCheckbox.check();
  108 |     await expect(waterCheckbox).toBeChecked();
  109 |     await expect(page.getByText(/Water ISO 10500:2012 Standard Profile is active/i)).toBeVisible();
  110 |     await expect(pesticidesCheckbox).toBeDisabled();
  111 |     await expect(fattyAcidsCheckbox).toBeDisabled();
  112 | 
  113 |     // Deactivate Water ISO 10500
  114 |     await waterCheckbox.uncheck();
  115 |     await expect(waterCheckbox).not.toBeChecked();
  116 |     await expect(page.getByText(/Water ISO 10500:2012 Standard Profile is active/i)).not.toBeVisible();
  117 |     await expect(pesticidesCheckbox).toBeEnabled();
  118 |     await expect(fattyAcidsCheckbox).toBeEnabled();
  119 | 
  120 |     // Activate Fatty Acid Profile and verify variants
```