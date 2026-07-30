import type { APIRequestContext } from '@playwright/test';
import { AuthApi } from '../api/auth-api';
import { UserApi } from '../api/user-api';
import { TagsApi } from '../api/tags-api';

export class ApiManager {
  readonly authApi: AuthApi;
  readonly userApi: UserApi;
  readonly tagsApi: TagsApi;

  constructor(request: APIRequestContext) {
    this.authApi = new AuthApi(request);
    this.userApi = new UserApi(request);
    this.tagsApi = new TagsApi(request);
  }
}
