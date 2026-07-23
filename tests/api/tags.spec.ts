import { test, expect } from '@playwright/test';

test('GET /api/tags returns a list of tags', async ({ request }) => {
  const response = await request.get('https://conduit-api.bondaracademy.com/api/tags');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();

  expect(Array.isArray(body.tags)).toBe(true);
  expect(body.tags.length).toBeGreaterThan(0);

  for (const tag of body.tags) {
    expect(typeof tag).toBe('string');
  }
});
