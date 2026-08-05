import { test, expect } from '../../playwright-utils/fixtures';

test('signed-in user can delete their own article', async ({ page, pom }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  const description = 'A description written by the Playwright delete test';
  const articleTitle = `Playwright Delete Test Article ${Date.now()}`;
  const articleBody = 'Body content written by the Playwright delete test.';

  await pom.loginPage.signInWithCredentials(email!, password!);
  await pom.loginPage.expectSignedInSuccessfully();

  await pom.headerComponent.openNewArticleEditor();
  await pom.articleEditorPage.fillAndPublish(articleTitle, description, articleBody);

  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByText('Global Feed', { exact: true }).click();
  await page.getByRole('link', { name: articleTitle }).click();

  await pom.articlePage.expectArticleVisible(articleTitle, articleBody);

  await pom.articlePage.deleteArticle();

  const articlesResponsePromise = page.waitForResponse(resp => resp.url().includes('/api/articles') && resp.status() === 200);
  await page.getByText('Global Feed', { exact: true }).click();
  await articlesResponsePromise;
  await expect(page.getByRole('heading', { name: articleTitle })).not.toBeVisible();
});
