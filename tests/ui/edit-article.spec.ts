import { test, expect } from '../../playwright-utils/fixtures';

test('signed-in user can edit their own article', async ({ pom }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  const description = 'A description written by the Playwright edit test';
  const originalTitle = `Playwright Edit Test Article ${Date.now()}`;
  const originalBody = 'Original body content written by the Playwright edit test.';
  const updatedTitle = `Playwright Edit Test Article Updated ${Date.now()}`;
  const updatedBody = 'Updated body content written by the Playwright edit test.';

  await pom.loginPage.signInWithCredentials(email!, password!);
  await pom.loginPage.expectSignedInSuccessfully();

  await pom.headerComponent.openNewArticleEditor();
  await pom.articleEditorPage.fillAndPublish(originalTitle, description, originalBody);

  await pom.articlePage.openEditor();
  await pom.articleEditorPage.fillAndPublish(updatedTitle, description, updatedBody);

  await pom.articlePage.expectArticleVisible(updatedTitle, updatedBody);

  await pom.articlePage.deleteArticle();
});
