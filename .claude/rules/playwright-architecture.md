---
description: Playwright Page Objects, PageManager, fixtures, auth setup, and test organization patterns
paths: [tests/**,playwright-utils/**,playwright.config.ts]
---

# Playwright Architecture

## When to Use What

| Pattern | When | Location |
|---------|------|----------|
| **Page Object** | A page or major component with multi-step user flows | `playwright-utils/pages/` |
| **PageManager** | Single class that constructs every page object — exposed via the `pom` fixture | `playwright-utils/fixtures/page-manager.ts` |
| **Custom Fixture** | Resources needing setup/teardown (auth, DB, API) | `playwright-utils/fixtures/` |
| **Helper Function** | Stateless utility, no cleanup needed | `playwright-utils/helpers/` |

## Page Object Conventions

- One TypeScript class per page or major component
- File name: kebab-case (`login-page.ts`, `course-detail-page.ts`)
- Class name: PascalCase + `Page` (or component-appropriate) suffix (`LoginPage`, `HeaderComponent`)
- Constructor takes `Page` only — **no locator properties, no eager locator construction**
- **Locators inline in methods** — locators are self-descriptive and lazy; duplicating across methods is fine
- **No tiny methods** — a method covers a meaningful user task with multiple steps; never a single click or fill
- **Strict page boundaries** — a method only interacts with its own page; navigation marks the end of one method and the start of another on the next page
- **Validation at the start** — if the first step auto-waits (`click`, `fill`, locator assertion), the auto-wait is the start guard. Otherwise gate with an explicit `await expect(...)` or `waitFor(...)` before non-auto-waiting code (`textContent`, `count`, `all`, `inputValue`, `allTextContents`)
- **Validation at the end** — when the last step is an action without a trailing assertion, add a confirmation. For navigation use `expect(page).toHaveURL(...)` (page-agnostic). For in-page changes use `toBeVisible`/`toHaveText`/`toContainText` on the affected element. This is a stabilizing check, not the test's goal assertion
- **Action vs validation methods** — action methods may include lightweight stabilizing assertions; the test's **goal** assertions live in dedicated `expect*`-prefixed methods that are parametrized for reuse
- **Naming** — camelCase, descriptive verb phrases, no abbreviations or acronyms
- **Reuse first** — before adding a new method, scan the relevant class. Reuse if a method covers the flow; parametrize an existing method if it nearly does. Never write two methods that differ only in a hardcoded value

```typescript
// playwright-utils/pages/login-page.ts
import { type Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async loginWithCredentials(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Email' }).fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(this.page).toHaveURL(/\/dashboard$/)
  }

  // Validation method — owns the test's goal assertion, parametrized for reuse
  async expectErrorMessage(message: string) {
    await expect(this.page.getByRole('alert')).toHaveText(message)
  }
}
```

Test body reads as action → action → validation:

```typescript
test('User sees error for invalid password', async ({ pom }) => {
  await pom.homePage.openLogin()
  await pom.loginPage.loginWithCredentials('user@example.com', 'wrong-password')
  await pom.loginPage.expectErrorMessage('Invalid email or password')
})
```

### Component-Level Page Objects

For widgets reused across pages (header, cart drawer, modals), create a separate class. Components follow the same rules as pages.

```typescript
export class HeaderComponent {
  constructor(private page: Page) {}

  async openLogin() {
    await this.page.getByRole('link', { name: 'Log In' }).click()
    await expect(this.page).toHaveURL(/\/login$/)
  }
}
```

## PageManager and the `pom` Fixture

Every page object is instantiated **eagerly** inside `PageManager` and exposed as a camelCase property. A single `pom` fixture is the only test entry point — tests never construct page objects directly.

```typescript
// playwright-utils/fixtures/page-manager.ts
import type { Page } from '@playwright/test'
import { LoginPage } from '../pages/login-page'
import { DashboardPage } from '../pages/dashboard-page'
import { HomePage } from '../pages/home-page'

export class PageManager {
  readonly homePage: HomePage
  readonly loginPage: LoginPage
  readonly dashboardPage: DashboardPage

  constructor(page: Page) {
    this.homePage = new HomePage(page)
    this.loginPage = new LoginPage(page)
    this.dashboardPage = new DashboardPage(page)
  }
}
```

```typescript
// playwright-utils/fixtures/index.ts
import { test as base, expect } from '@playwright/test'
import { PageManager } from './page-manager'

type Fixtures = { pom: PageManager }

export const test = base.extend<Fixtures>({
  pom: async ({ page }, use) => {
    await use(new PageManager(page))
  },
})

export { expect }
```

Usage in tests:

```typescript
import { test, expect } from '../../playwright-utils/fixtures'

test('User can log in', async ({ pom }) => {
  await pom.homePage.openLogin()
  await pom.loginPage.loginWithCredentials('user@example.com', 'Password123!')
})
```

When adding a new page class:
1. Create `playwright-utils/pages/<page-name>.ts`
2. In `PageManager`: add the import, the `readonly` property, and the constructor instantiation
3. Property name = camelCase of the class name (`LoginPage` → `loginPage`)

## Auth Setup with storageState

Save authenticated sessions to avoid logging in every test:

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test'

const studentFile = 'playwright-utils/.auth/student.json'
const adminFile = 'playwright-utils/.auth/admin.json'

setup('authenticate as student', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Log In' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.STUDENT_EMAIL!)
  await page.getByLabel('Password').fill(process.env.STUDENT_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/dashboard')
  await page.context().storageState({ path: studentFile })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Log In' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**/admin')
  await page.context().storageState({ path: adminFile })
})
```

Auth setup intentionally bypasses the POM — `setup()` blocks run before any test and don't import the `pom` fixture.

### Config with Auth Projects

```typescript
// playwright.config.ts pattern
projects: [
  { name: 'auth-setup', testMatch: 'auth.setup.ts' },
  {
    name: 'student-tests',
    testMatch: 'student/**/*.spec.ts',
    use: { storageState: 'playwright-utils/.auth/student.json' },
    dependencies: ['auth-setup'],
  },
  {
    name: 'admin-tests',
    testMatch: 'admin/**/*.spec.ts',
    use: { storageState: 'playwright-utils/.auth/admin.json' },
    dependencies: ['auth-setup'],
  },
  {
    name: 'guest-tests',
    testMatch: 'guest/**/*.spec.ts',
    // No storageState — unauthenticated
  },
]
```

## Directory Structure

`tests/` is for spec files and setup files only — everything executable by the test runner. All support code lives in `playwright-utils/`.

```
tests/
  auth.setup.ts              # Auth state persistence (setup project)
  student/                   # Authenticated student tests
    login.spec.ts
    courses.spec.ts
    dashboard.spec.ts
  admin/                     # Authenticated admin tests
    courses.spec.ts
    users.spec.ts
  guest/                     # Unauthenticated tests
    catalog.spec.ts
    blog.spec.ts

playwright-utils/
  fixtures/
    index.ts                 # `pom` fixture + extended `test` and `expect`
    page-manager.ts          # PageManager — constructs every page object
  pages/
    home-page.ts
    login-page.ts
    dashboard-page.ts
    course-detail-page.ts
  helpers/
    test-data.ts             # Data factories, utilities
```

## Configuration Best Practices

```typescript
// playwright.config.ts
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',          // Trace for debugging failures
  screenshot: 'only-on-failure',    // Screenshot on failure
  video: 'retain-on-failure',       // Video for CI debugging
}
```

### CI webServer Config

```typescript
// Auto-start dev server in CI
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```

## Test Suite Hooks

When all tests in a `test.describe` block share the same setup steps (e.g., starting at the home page), extract them into `test.beforeEach`.

```typescript
// GOOD: shared setup in beforeEach
test.describe('Guest Smoke', () => {
  test.beforeEach(async ({ pom }) => {
    await pom.homePage.open()
  })

  test('Home page displays key sections', async ({ pom }) => {
    await pom.homePage.expectHeroVisible()
  })

  test('User can navigate to blog', async ({ pom }) => {
    await pom.homePage.openBlog()
    await pom.blogPage.expectArticlesListVisible()
  })
})
```

## Anti-Patterns

- **Locator constants on the class** (constructor or properties) — keep locators inline in methods
- **Single-action methods** (`clickLoginButton`, `fillEmail`) — fold them into a multi-step flow
- **Methods spanning two pages** — every navigation marks a method boundary on a different page object
- **Action methods owning goal assertions** — the test's goal lives in a separate `expect*` validation method
- **Duplicate methods differing only in a hardcoded value** — parametrize the existing method instead
- **Fat page objects** with every possible method — only add what tests actually use
- **Shared mutable state** between tests — each test must be independent
- **Global variables** for test data — use fixtures with proper setup/teardown
- **Skipping cleanup** — fixtures guarantee teardown even on failure
