import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

export class PageManager {
  readonly loginPage: LoginPage;

  constructor(page: Page) {
    this.loginPage = new LoginPage(page);
  }
}
