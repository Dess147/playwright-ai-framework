---
name: pw-init
description: Initialize a Playwright E2E framework in a brand-new project. Installs Playwright, then scaffolds config, directory structure, multi-environment env files, auth setup, fixtures skeleton, sample smoke tests, npm scripts, and tooling.
---

Initialize a Playwright E2E framework from scratch in the current project. Follow the steps below in order.

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## Conventions to enforce

The generated framework follows this structure:

```
tests/
  auth.setup.ts                   # Auth state persistence (only if roles requested)
  <role>/                         # One subfolder per auth role (e.g. guest, admin)
    smoke.spec.ts                 # Generated sample smoke test
playwright-utils/
  .auth/                          # storageState files — gitignored
  fixtures/
    index.ts                      # Extended test + expect re-export (skeleton)
  helpers/                        # Stateless utilities
  pages/                          # Page objects (empty — created on demand)
  types/
    env.d.ts                      # process.env typing
.env.test.<env>                   # Per-environment vars — gitignored
playwright.config.ts              # Single Chromium browser, one project per role
```

Key conventions:
- **Single browser** (Desktop Chrome). No Firefox/WebKit projects.
- **Env files** named `.env.test.<env>` (e.g. `.env.test.local`, `.env.test.qa`), loaded via `dotenv` based on `TEST_ENV`. Default is `local`.
- **Per-role projects** in `playwright.config.ts`, each with its own `testDir: ./tests/<role>` and (for authenticated roles) `storageState` + `dependencies: ['auth-setup']`.
- **Storage state** lives in `playwright-utils/.auth/<role>.json` (NOT `playwright/.auth/`).

## 1. Gather requirements

Use `AskUserQuestion` and free-form chat to collect inputs. Ask in this order:

### 1.1 Environments
Use `AskUserQuestion` so the prompt is visually highlighted, but expect the answer to come through "Other" as free-form text in most cases. Configure the question as follows:

- **header**: `Environments`
- **question**: `How many test environments do you need, and what should they be called? Provide a baseURL for each. Example: local: http://localhost:3000, qa: https://qa.example.com`
- **multiSelect**: `false`
- **options** (presets cover common cases; "Other" is appended automatically and lets the user type a custom list):
  1. `Just local` — `Single env, BASE_URL=http://localhost:3000`
  2. `local + qa` — `Two envs; I'll ask for the qa baseURL next`
  3. `local + qa + production` — `Three envs; I'll ask for qa and production baseURLs next`

If the user picks a preset that needs additional baseURLs (qa/production), follow up via plain chat to collect each URL. If the user picks "Other", parse their free-form list.

The first env listed becomes the default (used when `TEST_ENV` is not set).

### 1.2 Auth roles
Use `AskUserQuestion`. Configure:

- **header**: `Auth roles`
- **question**: `What auth roles do you need? Each authenticated role gets an entry in auth.setup.ts plus its own project with storageState. "guest" is unauthenticated — no setup needed for it.`
- **multiSelect**: `false`
- **options** (presets cover common cases; "Other" is appended automatically for a custom list):
  1. `guest only` — `Unauthenticated tests only; skip auth.setup.ts and the auth-setup project`
  2. `guest + user` — `One unauthenticated project plus one authenticated role`
  3. `user + admin` — `Two authenticated roles, no guest project`
  4. `guest + user + admin` — `One unauthenticated project plus two authenticated roles`

If the user picks "Other", parse their free-form list. If only `guest` is in the final list, skip generating `auth.setup.ts` and the `auth-setup` project.

### 1.3 Login flow details (only if any authenticated roles)
Use `AskUserQuestion`. Configure:

- **header**: `Login flow`
- **question**: `How should I figure out the login flow for auth.setup.ts? I need: link text to the login page from /, form field labels for email and password, and the URL each role lands on after login.`
- **multiSelect**: `false`
- **options**:
  1. `Explore the source code` — `I'll search the codebase for the login page, form fields, and post-login URL, then write the setup`
  2. `Generate placeholders` — `I'll use generic <LOGIN_LINK_TEXT>/<EMAIL_LABEL>/<PASSWORD_LABEL>/<POST_LOGIN_PATH> placeholders with a // TODO marker; the user fills them in later`
  3. `I'll provide the details` — `User types the link text, field labels, and post-login URL via "Other"`

If the user picks **Explore the source code**: search for the login page (look in `src/app/login`, `app/login`, `src/pages/login`, components matching `Login*`, or routes referenced by a "Log In"/"Sign In" link). Identify the email/password input labels and the post-login redirect target. Use those exact values when generating `auth.setup.ts`. If the search yields nothing reliable, fall back to the `Generate placeholders` path.

If the user picks **Generate placeholders**: use placeholder values and add a single `// TODO: confirm selectors` comment above each setup block.

If the user picks **I'll provide the details** (or types their answer in "Other"): parse their input as the (a) link text, (b) email label, (c) password label, (d) post-login path.

Do not block on this step — pick a path and continue.

### 1.4 Optional extras
Use `AskUserQuestion` to ask about each (separate questions, two options each — yes/no):

- **CI webServer block** — *"Should I include a `webServer` config in `playwright.config.ts` to auto-start your dev server in CI?"* If yes, ask the start command (e.g. `npm run dev`) and the URL it serves on.
- **Copy Claude rules** — *"Should I copy `playwright-architecture.md` and `playwright-scripting.md` into `.claude/rules/` so future AI work follows the conventions?"* Yes/no only — do **not** ask for a source path. The canonical source is the user-level installer skills: `~/.claude/skills/init-playwright-architecture/SKILL.md` and `~/.claude/skills/init-playwright-scripting/SKILL.md`. The rule content is embedded between `<!-- RULES_START -->` and `<!-- RULES_END -->` markers. If those files don't exist, tell the user clearly and skip — don't fabricate the content.

## 2. Run the Playwright installer

Run the installer non-interactively using `create-playwright` flags. This skips the prompts wizard so the whole step can run autonomously:

```bash
npm init playwright@latest -- --quiet --browser=chromium --install-deps
```

Flags:
- `--quiet` — skip the wizard, use defaults
- `--browser=chromium` — install only Chromium (matches the single-browser convention)
- `--install-deps` — auto-install browsers and system deps
- TypeScript, `tests/` folder, and "no GitHub Actions workflow" are the quiet-mode defaults — no flags needed

If the install fails or stalls, fall back to asking the user to run the command in their terminal interactively.

## 3. Clean up defaults

Delete the files the installer creates that don't fit our conventions:

```bash
rm -r tests-examples 2>/dev/null
rm tests/example.spec.ts 2>/dev/null
```

## 4. Install supporting dependencies

Ask the user to run:

```bash
npm install -D dotenv
```

## 5. Generate `playwright.config.ts`

Overwrite the default config. Use the gathered envs and roles. Template:

```typescript
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

const testEnv = process.env.TEST_ENV ?? '<DEFAULT_ENV>'
process.env.TEST_ENV = testEnv
dotenv.config({ path: `.env.test.${testEnv}`, quiet: true })

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'never' }]],
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry'
  },
  projects: [
    // Include only if any authenticated roles exist:
    {
      name: 'auth-setup',
      testMatch: 'auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Per-role projects — one entry per role.
    // Unauthenticated roles (e.g. guest) omit storageState + dependencies:
    {
      name: '<role>',
      testDir: './tests/<role>',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright-utils/.auth/<role>.json', // omit for guest
      },
      dependencies: ['auth-setup'], // omit for guest
    },
  ],
  // Include only if user opted into webServer block:
  // webServer: {
  //   command: '<USER_DEV_COMMAND>',
  //   url: '<USER_DEV_URL>',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
})
```

Replace `<DEFAULT_ENV>` with the first env name the user listed. Generate one project entry per role.

## 6. Update `.gitignore`

Append (create the file if missing):

```
# Playwright
playwright-utils/.auth/
test-results/
playwright-report/
playwright/.cache/

# Local env files (keep .env.test.example committed)
.env
.env.local
.env.test.*
!.env.test.example
```

## 7. Create directory structure

```bash
mkdir -p playwright-utils/{fixtures,helpers,pages,types,.auth}
mkdir -p tests/<role>  # one per role from step 1.2
```

## 8. Generate `tests/auth.setup.ts`

Skip if no authenticated roles. Otherwise generate one `setup(...)` block per authenticated role using the login flow details from step 1.3:

```typescript
import { test as setup } from '@playwright/test'

const <role>File = 'playwright-utils/.auth/<role>.json'

setup('authenticate as <role>', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '<LOGIN_LINK_TEXT>' }).click()
  await page.getByRole('textbox', { name: '<EMAIL_LABEL>' }).fill(process.env.<ROLE>_EMAIL!)
  await page.getByLabel('<PASSWORD_LABEL>').fill(process.env.<ROLE>_PASSWORD!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL('**<POST_LOGIN_PATH>')
  await page.context().storageState({ path: <role>File })
})
```

If the user gave only partial details, leave reasonable placeholders and add a single-line `// TODO: confirm selectors` comment above each setup block — the user will tighten the selectors when they run it. (Allowed comment: marks user-action-required, not narration.)

## 9. Generate `playwright-utils/types/env.d.ts`

```typescript
export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_ENV?: '<env1>' | '<env2>' | ...
      BASE_URL?: string
      CI?: string
      // One pair per authenticated role:
      <ROLE>_EMAIL?: string
      <ROLE>_PASSWORD?: string
    }
  }
}
```

Wrap the `namespace NodeJS` declaration in `declare global { ... }`. Because of `export {}`, this file is a module — augmenting the global `NodeJS.ProcessEnv` interface from inside a module requires `declare global`, otherwise TypeScript treats it as a local declaration and `process.env.<ROLE>_EMAIL` won't be typed.

Confirm `tsconfig.json` includes this file. The default Playwright-generated `tsconfig.json` covers `**/*.ts`, so it's picked up automatically.

## 10. Generate `playwright-utils/fixtures/index.ts`

Skeleton that re-exports the extended test — ready for future page objects to plug in:

```typescript
import { test as base, expect } from '@playwright/test'

type Fixtures = {
  // Add fixtures here as page objects and helpers are built.
}

export const test = base.extend<Fixtures>({})

export { expect }
```

## 11. Generate sample smoke tests

For each role, create `tests/<role>/smoke.spec.ts`. The smoke test verifies the framework is wired up correctly — it should pass on a brand-new install once env vars are filled in.

**Guest smoke template:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Guest smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Home page loads', async ({ page }) => {
    await expect(page).toHaveURL('/')
  })
})
```

**Authenticated role smoke template:**

```typescript
import { test, expect } from '@playwright/test'

test.describe('<Role> smoke', () => {
  test('Authenticated session is active', async ({ page }) => {
    await page.goto('/')
    // TODO: replace with a real authenticated-only assertion
    // (e.g. expect(page.getByRole('button', { name: '<user menu>' })).toBeVisible())
  })
})
```

## 12. Update `package.json` scripts

Add these scripts (merge with existing `scripts`, don't overwrite):

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

If the user defined more than one environment, also add a per-env alias for each (besides the default):

```json
"test:e2e:<env>": "TEST_ENV=<env> playwright test"
```

## 13. Copy Claude rules (only if user opted in)

If the user opted in during step 1.4, extract the rule content from the user-level installer skills and write it into the new project's `.claude/rules/` directory. Do **not** prompt the user for a path — the source is fixed.

For each rule (`architecture` and `scripting`):

1. Source: `~/.claude/skills/init-playwright-<name>/SKILL.md`. If the file doesn't exist, tell the user clearly and skip that rule — don't fabricate.
2. Extract the content between the `<!-- RULES_START -->` and `<!-- RULES_END -->` markers (markers excluded). Trim leading/trailing blank lines.
3. Write the extracted content to `.claude/rules/playwright-<name>.md` in the current project.

```bash
mkdir -p .claude/rules

# Architecture rule
awk '/^<!-- RULES_START -->$/{flag=1; next} /^<!-- RULES_END -->$/{flag=0} flag' \
  ~/.claude/skills/init-playwright-architecture/SKILL.md \
  > .claude/rules/playwright-architecture.md

# Scripting rule
awk '/^<!-- RULES_START -->$/{flag=1; next} /^<!-- RULES_END -->$/{flag=0} flag' \
  ~/.claude/skills/init-playwright-scripting/SKILL.md \
  > .claude/rules/playwright-scripting.md
```

If a target file already exists in the new project, ask the user **Overwrite / Skip** before overwriting.

## 14. Final summary and env files (last manual step)

Skill ends here. Don't pause for confirmation, don't verify the files, don't run the smoke tests.

Print one block per env from step 1.1 (gitignored) plus `.env.test.example` (committed). Each block contains `BASE_URL=<env baseURL>` and one blank `<ROLE>_EMAIL` / `<ROLE>_PASSWORD` pair per authenticated role from step 1.2. The `.env.test.example` block uses the first env's BASE_URL as a placeholder.

Render the blocks concretely with the user's real env names and role names. Example for envs `local` + `qa`, roles `user` + `admin`:

> **Framework ready** — last step, create the env files below.
>
> `.env.test.local` (gitignored):
> ```
> BASE_URL=http://localhost:3000
> USER_EMAIL=
> USER_PASSWORD=
> ADMIN_EMAIL=
> ADMIN_PASSWORD=
> ```
>
> `.env.test.qa` (gitignored):
> ```
> BASE_URL=https://qa.example.com
> USER_EMAIL=
> USER_PASSWORD=
> ADMIN_EMAIL=
> ADMIN_PASSWORD=
> ```
>
> `.env.test.example` (commit):
> ```
> BASE_URL=http://localhost:3000
> USER_EMAIL=
> USER_PASSWORD=
> ADMIN_EMAIL=
> ADMIN_PASSWORD=
> ```