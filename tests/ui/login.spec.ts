import { test } from '../../playwright-utils/fixtures';
import { getConduitCredentials } from '../../playwright-utils/helpers/credentials';

test('user can sign in with valid credentials', async ({ pom }) => {
  const { email, password } = getConduitCredentials();
  await pom.loginPage.signInWithCredentials(email, password);
  await pom.loginPage.expectSignedInSuccessfully();
});

test('invalid credentials show an error message', async ({ pom }) => {
  await pom.loginPage.signInWithCredentials('nonexistent.user@example.com', 'WrongPassword123!');
  await pom.loginPage.expectInvalidCredentialsError();
});
