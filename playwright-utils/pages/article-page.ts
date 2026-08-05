import { type Page, expect } from '@playwright/test';

export class ArticlePage {
  constructor(private page: Page) {}

  async openEditor() {
    await this.page.getByRole('link', { name: 'Edit Article' }).first().click();
    await expect(this.page).toHaveURL(/\/editor\//);
  }

  async deleteArticle() {
    await this.page.getByRole('button', { name: 'Delete Article' }).first().click();
    await expect(this.page).toHaveURL('/');
  }

  async expectArticleVisible(title: string, body: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
    await expect(this.page.locator('p', { hasText: body })).toHaveText(body);
  }
}
