import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';

export class TagsApi {
  private response!: APIResponse;

  constructor(private request: APIRequestContext) {}

  async fetchTags() {
    this.response = await this.request.get('https://conduit-api.bondaracademy.com/api/tags');
  }

  async expectTagsListReturned() {
    expect(this.response.status()).toBe(200);
    expect(this.response.headers()['content-type']).toContain('application/json');

    const body = await this.response.json();

    expect(Array.isArray(body.tags)).toBe(true);
    expect(body.tags.length).toBeGreaterThan(0);

    for (const tag of body.tags) {
      expect(typeof tag).toBe('string');
    }
  }
}
