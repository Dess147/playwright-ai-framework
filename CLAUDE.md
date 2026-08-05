# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

This repository is a Playwright + TypeScript test automation portfolio project.

The Application Under Test is the Bondar Academy Conduit RealWorld application:

* Frontend: `https://conduit.bondaracademy.com`
* API: to be confirmed by inspecting the application's network requests

The Conduit application source code is not part of this repository. This repository must contain only the Playwright test automation framework, tests, configuration, and related documentation.

The project is being implemented incrementally. Each change should be small, focused, manually reviewable, and suitable for an independent Git commit.

## Current Project Status

The framework has grown beyond the initial scaffold into a working UI and API test suite for the Conduit application.

Completed work includes:

* Homepage UI smoke test (`tests/ui/homepage.spec.ts`)
* Login UI scenarios — successful and invalid credentials (`tests/ui/login.spec.ts`)
* Article UI scenarios — create, edit, and delete (`tests/ui/create-article.spec.ts`, `tests/ui/edit-article.spec.ts`, `tests/ui/delete-article.spec.ts`)
* API tests for authentication and the tags endpoint (`tests/api/auth.spec.ts`, `tests/api/tags.spec.ts`)
* A Page Object Model under `playwright-utils/pages/` (`LoginPage`, `ArticleEditorPage`, `ArticlePage`, `HeaderComponent`), exposed through `PageManager` and the custom `pom` fixture
* API clients under `playwright-utils/api/` (`AuthApi`, `UserApi`, `TagsApi`), exposed through `ApiManager` and the custom `api` fixture
* Environment-based credentials (`CONDUIT_USER_EMAIL`, `CONDUIT_USER_PASSWORD`) for authenticated tests
* GitHub Actions CI running the full suite on push/PR to `main`

See `.claude/rules/playwright-architecture.md` for the current Page Object and fixture conventions — the "first UI tests" constraints under Architecture Rules below applied only before real duplication justified introducing a POM.

Planned next steps:

* Migrate `homepage.spec.ts` and `create-article.spec.ts` onto the `pom` fixture for consistency with the newer article tests
* Authentication state reuse with `storageState`
* Additional article negative and edge-case scenarios

## Commands

```bash
# Install dependencies
npm ci

# Install Playwright browsers and required system dependencies
npm run install:browsers

# Run all tests
npm test

# Run tests in Playwright UI mode
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run tests in Chromium only
npm run test:chromium

# View the latest Playwright HTML report
npm run report

# List detected tests without running them
npx playwright test --list

# Run a specific test file
npx playwright test tests/ui/homepage.spec.ts

# Run tests in headed mode
npx playwright test --headed
```

Always use the existing npm scripts when an appropriate script is available.

## Project Structure

* `playwright.config.ts` — Playwright configuration, including the test directory, browser projects, reporter, retry behavior, trace settings, and the Conduit `baseURL`.
* `tsconfig.json` — TypeScript configuration for the Playwright test project.
* `tests/` — automated Playwright tests (spec files only).
* `tests/ui/` — UI tests.
* `tests/api/` — API tests.
* `playwright-utils/` — support code for tests: `pages/` (Page Objects), `api/` (API clients), `fixtures/` (`PageManager`, `ApiManager`, and the custom `pom`/`api` fixtures). See `.claude/rules/playwright-architecture.md` for conventions.
* `.github/workflows/playwright.yml` — GitHub Actions workflow for automated test execution.
* `playwright-report/` — generated HTML report output.
* `test-results/` — generated test artifacts and failure output.

Generated directories such as `playwright-report/` and `test-results/` must not be manually edited or committed.

## Implementation Principles

Follow these principles throughout the project:

* Make small and focused changes.
* Do not modify unrelated files.
* Keep every completed step in a working state.
* Prefer readable and explicit Playwright tests.
* Prefer accessible locators such as `getByRole`, `getByLabel`, and `getByText`.
* Avoid brittle CSS selectors and XPath unless there is no stable alternative.
* Use the configured `baseURL` and relative navigation such as `page.goto('/')`.
* Use Playwright's built-in capabilities before adding external libraries.
* Do not add dependencies unless they solve a demonstrated project need.
* Do not add artificial waits such as `page.waitForTimeout()`.
* Do not commit changes unless explicitly requested.

## Architecture Rules

Do not introduce abstractions prematurely.

These constraints applied to the first UI tests, before a Page Object Model existed. A POM and custom fixtures have since been introduced — for current conventions when adding to or extending them, follow `.claude/rules/playwright-architecture.md` instead. The principle below (introduce shared functionality only after real duplication) still applies to any new area of the framework starting from scratch.

For the first UI tests:

* use flat spec files;
* use inline Playwright locators;
* do not introduce a Page Object Model;
* do not create custom fixtures;
* do not create helper functions for one-time interactions;
* do not introduce authentication state reuse;
* do not create test data factories.

A Page Object, fixture, helper, or shared configuration should only be introduced after real duplication appears in multiple tests.

Before creating shared functionality, confirm that at least two existing tests require the same setup or interaction.

## Verification

Before considering a change complete, run the checks that are relevant to the modified files.

Typical verification commands:

```bash
git diff
git diff --check
npx playwright test --list
npm test
git status
```

For a specific new test, run it separately before running the complete suite:

```bash
npx playwright test tests/ui/homepage.spec.ts
```

When appropriate, also verify the test in a visible browser:

```bash
npx playwright test tests/ui/homepage.spec.ts --headed
```

Do not fix a failing test by immediately adding retries, longer timeouts, or hardcoded waits. First inspect the page behavior, locator stability, navigation, and assertion.
