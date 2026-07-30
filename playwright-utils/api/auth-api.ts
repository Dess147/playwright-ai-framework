import { type APIRequestContext, type APIResponse, expect } from '@playwright/test';

export class AuthApi {
  private response!: APIResponse;

  constructor(private request: APIRequestContext) {}

  async loginWithCredentials(email: string, password: string) {
    this.response = await this.request.post('https://conduit-api.bondaracademy.com/api/users/login', {
      data: { user: { email, password } },
    });
  }

  async expectLoginSucceededAndReturnToken(): Promise<string> {
    expect(this.response.status()).toBe(200);

    const body = await this.response.json();
    const token = body.user.token;

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    return token;
  }

  async expectLoginRejected() {
    expect(this.response.status()).toBe(403);

    const body = await this.response.json();

    expect(body.user).toBeUndefined();
    expect(body.errors['email or password']).toContain('is invalid');
  }
}
