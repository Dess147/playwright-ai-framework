import { test } from '../../playwright-utils/fixtures';

test('logged-in user can fetch their own profile using the issued token', async ({ api }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  await api.authApi.loginWithCredentials(email!, password!);
  const token = await api.authApi.expectLoginSucceededAndReturnToken();

  await api.userApi.fetchProfileWithToken(token);
  await api.userApi.expectProfileEmail(email!);
});

test('invalid credentials are rejected without issuing a token', async ({ api }) => {
  await api.authApi.loginWithCredentials('nonexistent.user@example.com', 'WrongPassword123!');
  await api.authApi.expectLoginRejected();
});
