import { test } from '../../playwright-utils/fixtures';
import { getConduitCredentials } from '../../playwright-utils/helpers/credentials';

test('logged-in user can fetch their own profile using the issued token', async ({ api }) => {
  const { email, password } = getConduitCredentials();

  await api.authApi.loginWithCredentials(email, password);
  const token = await api.authApi.expectLoginSucceededAndReturnToken();

  await api.userApi.fetchProfileWithToken(token);
  await api.userApi.expectProfileEmail(email);
});

test('invalid credentials are rejected without issuing a token', async ({ api }) => {
  await api.authApi.loginWithCredentials('nonexistent.user@example.com', 'WrongPassword123!');
  await api.authApi.expectLoginRejected();
});
