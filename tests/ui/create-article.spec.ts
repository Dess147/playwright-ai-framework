import { test, expect } from '@playwright/test';

test('user can publish an article with title, description, body and two tags, and see it in the Global Feed', async ({ page }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  const articleTitle = `Playwright Coverage Test Article ${Date.now()}`;
  const articleBody = 'Body content written by the Playwright coverage test.';

  await page.goto('/');

  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByPlaceholder('Email').fill(email!);
  await page.getByPlaceholder('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('link', { name: 'New Article' }).click();
  await page.getByPlaceholder('Article Title').fill(articleTitle);
  await page.getByPlaceholder("What's this article about?").fill('A description written by the Playwright coverage test');
  await page.getByPlaceholder('Write your article (in markdown)').fill(articleBody);

  const tagInput = page.getByPlaceholder('Enter tags');
  await tagInput.fill('playwright');
  await tagInput.press('Enter');
  await tagInput.fill('automation');
  await tagInput.press('Enter');

  await page.getByRole('button', { name: 'Publish Article' }).click();

  await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();
  await expect(page.locator('p', { hasText: articleBody })).toHaveText(articleBody);
  await expect(page.getByText('playwright', { exact: true })).toBeVisible();
  await expect(page.getByText('automation', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByText('Global Feed', { exact: true }).click();

  await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();
});
