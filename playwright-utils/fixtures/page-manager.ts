import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/login-page';
import { ArticleEditorPage } from '../pages/article-editor-page';
import { ArticlePage } from '../pages/article-page';
import { HeaderComponent } from '../pages/header-component';

export class PageManager {
  readonly loginPage: LoginPage;
  readonly articleEditorPage: ArticleEditorPage;
  readonly articlePage: ArticlePage;
  readonly headerComponent: HeaderComponent;

  constructor(page: Page) {
    this.loginPage = new LoginPage(page);
    this.articleEditorPage = new ArticleEditorPage(page);
    this.articlePage = new ArticlePage(page);
    this.headerComponent = new HeaderComponent(page);
  }
}
