# Playwright AI Framework

An AI-assisted test automation framework built with Playwright and TypeScript.

## Project Goal

Modern QA engineers often spend significant time creating repetitive test code,
maintaining selectors, analyzing failures, and updating documentation.

This project demonstrates how Playwright and AI-assisted development tools can
be combined to build, maintain, and troubleshoot an automated testing framework
more efficiently.

## What This Project Demonstrates

- UI test automation with Playwright and TypeScript
- API testing with Playwright
- Maintainable test framework architecture
- Page Object Model and reusable fixtures
- Test data management
- Authentication state reuse
- Cross-browser testing
- CI execution with GitHub Actions
- HTML reports, traces, screenshots, and videos
- AI-assisted test generation, debugging, refactoring, and documentation

## Technology Stack

- Playwright
- TypeScript
- Node.js
- GitHub Actions
- Git and GitHub
- Claude Code and other AI-assisted development tools

## Current Status

The project is under active development and currently includes:

- Playwright and TypeScript project configuration
- Conduit RealWorld application configured as the Application Under Test
- UI smoke coverage for the homepage
- Successful and invalid login UI scenarios
- Initial API coverage for the Conduit tags endpoint
- API authentication flow with token reuse
- GitHub Actions integration for automated test execution
- Project-level Claude Code instructions, rules, and reusable skills
- Skills for initializing and synchronizing Playwright rules across projects
- Local and CI verification using Playwright tests and TypeScript checks

The framework is intentionally being developed in small, reviewable iterations. More advanced components, such as API authentication, reusable fixtures, authentication state reuse, and Page Object Model abstractions, will be introduced only when justified by real test duplication or maintenance needs.

## Installation

Clone the repository:

```bash
git clone https://github.com/Dess147/playwright-ai-framework.git
cd playwright-ai-framework