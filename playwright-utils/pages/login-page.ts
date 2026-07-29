import { type Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async signInWithCredentials(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.getByPlaceholder('Email').fill(email);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  async expectSignedInSuccessfully() {
    await expect(this.page).toHaveURL('/');
    await expect(this.page.getByRole('link', { name: 'Settings' })).toBeVisible();
  }

  async expectInvalidCredentialsError() {
    await expect(this.page.getByText('email or password is invalid')).toBeVisible();
    await expect(this.page).toHaveURL(/\/login$/);
  }
}
