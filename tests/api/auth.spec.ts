import { test, expect } from '@playwright/test';

test('logged-in user can fetch their own profile using the issued token', async ({ request }) => {
  const email = process.env.CONDUIT_USER_EMAIL;
  const password = process.env.CONDUIT_USER_PASSWORD;

  test.skip(
    !email || !password,
    'CONDUIT_USER_EMAIL and CONDUIT_USER_PASSWORD must be set to run this test'
  );

  const loginResponse = await request.post('https://conduit-api.bondaracademy.com/api/users/login', {
    data: { user: { email, password } },
  });

  expect(loginResponse.status()).toBe(200);

  const loginBody = await loginResponse.json();
  const token = loginBody.user.token;

  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(0);

  const profileResponse = await request.get('https://conduit-api.bondaracademy.com/api/user', {
    headers: { Authorization: `Token ${token}` },
  });

  expect(profileResponse.status()).toBe(200);

  const profileBody = await profileResponse.json();

  expect(profileBody.user.email).toBe(email);
});
