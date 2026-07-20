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

The initial Playwright scaffold has been configured for the Conduit application.

Completed work includes:

* Playwright with TypeScript initialized
* GitHub Actions workflow available
* `baseURL` configured as `https://conduit.bondaracademy.com`
* generated Playwright example test removed
* npm scripts added
* TypeScript configuration added

The next implementation step is the first Conduit homepage UI smoke test:

`tests/ui/homepage.spec.ts`

The smoke test should verify that:

* the Conduit homepage loads successfully;
* a stable homepage heading, banner, or other meaningful element is visible;
* the `Global Feed` tab is visible.

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
* `tests/` — automated Playwright tests.
* `tests/ui/` — UI tests.
* `tests/api/` — API tests when they are introduced.
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
