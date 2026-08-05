# Playwright AI Framework

[![Playwright Tests](https://github.com/Dess147/playwright-ai-framework/actions/workflows/playwright.yml/badge.svg)](https://github.com/Dess147/playwright-ai-framework/actions/workflows/playwright.yml)

An AI-assisted test automation framework built with Playwright and TypeScript.

## Project Goal

This project demonstrates how Playwright and AI-assisted development tools can be combined to build, maintain, review, and troubleshoot a modern test automation framework.

The Bondar Academy Conduit RealWorld application is used as the Application Under Test.

## What This Project Demonstrates

* UI and API test automation with Playwright
* TypeScript-based test framework development
* Positive and negative test scenarios
* Authentication and article creation flows
* Page Object Model and custom Playwright fixtures
* Cross-browser test execution
* CI with GitHub Actions
* Playwright reports and debugging artifacts
* AI-assisted test planning, generation, auditing, debugging, and refactoring
* Project-specific Claude Code rules and reusable skills

## Technology Stack

* Playwright
* TypeScript
* GitHub Actions
* Git and GitHub
* Claude Code

## Current Status

The project currently includes:

* Homepage UI smoke test
* Successful login scenario
* Invalid login scenario
* Create article UI scenario
* Edit article UI scenario
* Delete article UI scenario
* API test for the Conduit tags endpoint
* API authentication flow with token reuse and profile validation
* `LoginPage`, `ArticleEditorPage`, `ArticlePage`, and `HeaderComponent` Page Objects
* `PageManager` for centralized Page Object access
* `AuthApi`, `UserApi`, and `TagsApi` API clients
* `ApiManager` for centralized API client access
* Custom `pom` and `api` Playwright fixtures
* Environment-based credentials for authenticated UI and API tests
* Cross-browser execution with Chromium, Firefox, and WebKit
* GitHub Actions CI
* Playwright HTML reporting and trace collection on retry
* Reusable Claude Code rules and Playwright skills

The framework is developed in small, reviewable iterations. New abstractions are introduced as the test suite grows and when they provide practical value.

## Current Framework Architecture

```text
playwright-utils/
├── api/
│   ├── auth-api.ts
│   ├── tags-api.ts
│   └── user-api.ts
│
├── fixtures/
│   ├── api-manager.ts
│   ├── index.ts
│   └── page-manager.ts
│
└── pages/
    ├── article-editor-page.ts
    ├── article-page.ts
    ├── header-component.ts
    └── login-page.ts
```

```text
tests/
├── api/
│   ├── auth.spec.ts
│   └── tags.spec.ts
│
└── ui/
    ├── create-article.spec.ts
    ├── delete-article.spec.ts
    ├── edit-article.spec.ts
    ├── homepage.spec.ts
    └── login.spec.ts
```

The framework uses two custom Playwright fixtures: `pom` provides a `PageManager` for reusable UI interactions, and `api` provides an `ApiManager` for reusable API clients built on Playwright's `APIRequestContext`.

```text
UI tests                          API tests

test                               test
 ↓                                  ↓
pom fixture                        api fixture
 ↓                                  ↓
PageManager                        ApiManager
 ↓                                  ↓
Page Objects                       AuthApi / UserApi / TagsApi
(Login, Article, Header)
```

The current UI abstraction covers the login flow through `LoginPage`, article authoring through `ArticleEditorPage` and `HeaderComponent`, and article viewing/deletion through `ArticlePage`. The API layer separates authentication, user, and tags operations into dedicated clients, keeping API-only tests independent from the browser `page` fixture. Additional Page Objects and API clients are introduced only when reusable interactions or duplicated setup justify further abstraction.

## Test Coverage

### UI

* Homepage smoke test
* Successful login
* Invalid credentials validation
* Create article flow
* Edit an existing article
* Delete an existing article

### API

* Retrieve Conduit tags
* Authenticate through the API
* Retrieve and reuse an authentication token
* Validate authenticated and negative authentication responses

## Authentication

UI credentials are provided through environment variables:

```text id="i8z7ge"
CONDUIT_USER_EMAIL
CONDUIT_USER_PASSWORD
```

Sensitive credentials are not stored in the repository.

## Installation

```bash id="gsgehn"
git clone https://github.com/Dess147/playwright-ai-framework.git
cd playwright-ai-framework
npm install
npx playwright install
```

Alternatively, install browsers with their required system dependencies:

```bash
npm run install:browsers
```

## Running Tests

Run all tests:

```bash id="yobmz5"
npm test
```

Run UI Mode:

```bash id="vt497w"
npm run test:ui
```

Run headed:

```bash id="3pnzzj"
npm run test:headed
```

Run in debug mode:

```bash
npm run test:debug
```

Run Chromium only:

```bash
npm run test:chromium
```

Run TypeScript validation:

```bash id="9h3vfu"
npx tsc --noEmit
```

Open the HTML report:

```bash id="pb7eaz"
npm run report
```

## AI-Assisted Development

Claude Code is used throughout the project for:

* test planning and coverage analysis
* test generation
* test auditing
* debugging
* refactoring
* code review
* reusable Playwright rules and skills

AI-generated changes are reviewed and verified before being accepted into the framework.

## Planned Improvements

* Migrate the homepage smoke test and create-article flow onto the `pom` fixture for consistency with the newer article tests
* Authentication state reuse with `storageState`
* Shared authenticated UI test setup
* Test data generation and cleanup
* Additional article negative and edge-case scenarios
* Broader UI and API regression coverage
* Further CI improvements
