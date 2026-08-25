import { test, expect } from '../../playwright-utils/fixtures';
import { getConduitCredentials } from '../../playwright-utils/helpers/credentials';

test('user can publish an article with title, description, body and two tags, and see it in the Global Feed', async ({ page, pom }) => {
  const { email, password } = getConduitCredentials();

  const articleTitle = `Playwright Coverage Test Article ${Date.now()}`;
  const description = 'A description written by the Playwright coverage test';
  const articleBody = 'Body content written by the Playwright coverage test.';

  await pom.loginPage.signInWithCredentials(email, password);
  await pom.loginPage.expectSignedInSuccessfully();

  await pom.headerComponent.openNewArticleEditor();
  await pom.articleEditorPage.fillAndPublish(articleTitle, description, articleBody, ['playwright', 'automation']);

  await pom.articlePage.expectArticleVisible(articleTitle, articleBody);
  await expect(page.getByText('playwright', { exact: true })).toBeVisible();
  await expect(page.getByText('automation', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByText('Global Feed', { exact: true }).click();
  await expect(page.getByRole('heading', { name: articleTitle })).toBeVisible();

  await page.getByRole('link', { name: articleTitle }).click();
  await pom.articlePage.deleteArticle();
});
