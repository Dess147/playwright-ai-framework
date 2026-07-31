import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';

export class UserApi {
  private response!: APIResponse;

  constructor(private request: APIRequestContext) {}

  async fetchProfileWithToken(token: string) {
    this.response = await this.request.get('https://conduit-api.bondaracademy.com/api/user', {
      headers: { Authorization: `Token ${token}` },
    });
  }

  async expectProfileEmail(email: string) {
    expect(this.response.status()).toBe(200);

    const body = await this.response.json();

    expect(body.user.email).toBe(email);
  }
}
