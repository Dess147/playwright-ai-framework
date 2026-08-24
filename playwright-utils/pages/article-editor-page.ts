import { type Page, expect } from '@playwright/test';

export class ArticleEditorPage {
  constructor(private page: Page) {}

  async fillAndPublish(title: string, description: string, body: string, tags: string[] = []) {
    await this.page.getByPlaceholder("What's this article about?").fill(description);
    await this.page.getByPlaceholder('Write your article (in markdown)').fill(body);

    const tagInput = this.page.getByPlaceholder('Enter tags');
    for (const tag of tags) {
      await tagInput.fill(tag);
      await tagInput.press('Enter');
    }

    await this.page.getByPlaceholder('Article Title').fill(title);
    await expect(this.page.getByPlaceholder('Article Title')).toHaveValue(title);

    await this.page.getByRole('button', { name: 'Publish Article' }).click();
    await expect(this.page).toHaveURL(/\/article\//);
  }
}
