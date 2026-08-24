import { type Page, expect } from '@playwright/test';

export class HeaderComponent {
  constructor(private page: Page) {}

  async openNewArticleEditor() {
    await this.page.getByRole('link', { name: 'New Article' }).click();
    await expect(this.page).toHaveURL('/editor');
  }
}
