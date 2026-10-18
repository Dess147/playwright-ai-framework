// import { type Page, expect } from '@playwright/test';

// export class HeaderComponent {
//   constructor(private page: Page) {}

//   async openNewArticleEditor() {
//     await this.page.getByRole('link', { name: 'New Article' }).click();
//     await expect(this.page).toHaveURL('/editor');
//   }
// }

import { type Page, expect } from '@playwright/test';

export class HeaderComponent {
  constructor(private page: Page) {}

  async openNewArticleEditor() {
    await this.page.getByRole('link', { name: 'New Article' }).click();
    await expect(this.page).toHaveURL('/editor');
  }

  async openHome() {
    await this.page.getByRole('link', { name: 'Home' }).click();
    await expect(this.page).toHaveURL('/');
  }
}