import { test, expect } from '@playwright/test';

test('user can sign in with valid credentials', async ({ page }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(email!);
  await page.getByPlaceholder('Password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
});

test('invalid credentials show an error message', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill('nonexistent.user@example.com');
  await page.getByPlaceholder('Password').fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('email or password is invalid')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
