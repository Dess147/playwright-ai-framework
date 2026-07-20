import { test, expect } from '@playwright/test';

test('homepage loads and shows the Global Feed tab', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'conduit' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Global Feed' })).toBeVisible();
});