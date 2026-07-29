# Playwright AI Framework

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
* API test for the Conduit tags endpoint
* API authentication flow with token reuse
* `LoginPage` Page Object
* `PageManager` for centralized Page Object access
* Custom `pom` Playwright fixture
* Environment-based credentials for authenticated UI tests
* GitHub Actions CI
* Reusable Claude Code rules and Playwright skills

The framework is developed in small, reviewable iterations. New abstractions are introduced as the test suite grows and when they provide practical value.

## Current POM Architecture

```text id="o8gip1"
playwright-utils/
└── fixtures/
    ├── index.ts
    └── page-manager.ts

pages/
└── login-page.ts
```

The custom `pom` fixture provides a `PageManager`, which currently exposes the reusable `LoginPage`.

```text id="i8y7m0"
test
 ↓
pom fixture
 ↓
PageManager
 ↓
LoginPage
```

The current POM implementation covers the login flow. Other UI flows can be migrated to Page Objects when reusable interactions emerge.

## Test Coverage

### UI

* Homepage smoke test
* Successful login
* Invalid credentials validation
* Create article flow

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

* Extend Page Object coverage to additional UI flows
* Authentication state reuse with `storageState`
* Shared authenticated test setup
* Test data generation and cleanup
* Additional article negative and edge-case scenarios
* Broader UI and API regression coverage
* Further CI improvements
