import { test as base, expect } from '@playwright/test';
import { PageManager } from './page-manager';
import { ApiManager } from './api-manager';

type Fixtures = { pom: PageManager; api: ApiManager };

export const test = base.extend<Fixtures>({
  pom: async ({ page }, use) => {
    await use(new PageManager(page));
  },
  api: async ({ request }, use) => {
    await use(new ApiManager(request));
  },
});

export { expect };
