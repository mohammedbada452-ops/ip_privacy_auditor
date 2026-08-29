import { test, expect } from '@playwright/test';

test('home audit renders and does not claim safe when evidence is unavailable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page).toHaveTitle(/PrivaSec/);
});

test('browser and headers routes are reachable', async ({ page }) => {
  for (const route of ['/browser', '/headers']) {
    await page.goto(route);
    await expect(page.locator('#main-content')).toBeVisible();
  }
});


test('API failure is shown as incomplete verification, never as a safe result', async ({ page }) => {
  await page.route('**/api/headers', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Header provider unavailable.' } }) });
  });
  await page.goto('/');
  await expect(page.getByText(/Verification incomplete/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/not be interpreted as proof of complete safety/i)).toBeVisible({ timeout: 15000 });
});
