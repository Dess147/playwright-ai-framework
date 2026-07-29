import { test as base, expect } from '@playwright/test';
import { PageManager } from './page-manager';

type Fixtures = { pom: PageManager };

export const test = base.extend<Fixtures>({
  pom: async ({ page }, use) => {
    await use(new PageManager(page));
  },
});

export { expect };
