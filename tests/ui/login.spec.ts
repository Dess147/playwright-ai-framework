import { test } from '../../playwright-utils/fixtures';

test('user can sign in with valid credentials', async ({ pom }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;
  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );
  await pom.loginPage.signInWithCredentials(email!, password!);
  await pom.loginPage.expectSignedInSuccessfully();
});

test('invalid credentials show an error message', async ({ pom }) => {
  await pom.loginPage.signInWithCredentials('nonexistent.user@example.com', 'WrongPassword123!');
  await pom.loginPage.expectInvalidCredentialsError();
});
