import { test, expect } from '@playwright/test';

test('loads the playground and previews payload', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Dynamic Icon Notification Studio' }),
  ).toBeVisible();

  await expect(page.getByRole('button', { name: /send test push/i })).toBeVisible();

  const preview = page.locator('pre').first();
  await expect(preview).toContainText('"title"');
});
