---
name: pw-test-audit
description: Audit a recently written Playwright test as a fresh pair of eyes. Reviews only the most recent uncommitted changes via git diff, checks compliance with the project's Playwright scripting rules, architecture, and POM conventions, and reports findings before optionally applying fixes.
---

Audit the most recent Playwright test changes against the project's rules. You are running in a fresh agent session — bring a clean, independent perspective. Do not assume the previous agent's choices were correct.

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## Instructions

### 1. Identify the recent changes

Find the uncommitted changes — that is the entire audit scope:

```bash
git status --short
git diff HEAD
```

If the diff is empty (no uncommitted changes), **stop immediately** and tell the user:

> No uncommitted changes detected — there is no new test code to review. This skill only audits the most recent additions. If you've already committed, surface the changes (e.g. `git reset --soft HEAD~1`) and re-run the skill.

Do not fall back to prior commits, do not audit committed history, do not pick a different scope. Exit cleanly.

If a diff exists but contains no Playwright-related files (no spec files, no page objects, no fixtures, no helpers under the project's E2E test tree), tell the user the diff has no Playwright changes to review and exit.

Otherwise, limit the audit to the diff hunks you see — do not review unchanged tests, untouched page objects, or unrelated files.

### 2. Establish the project context

Read the project's Playwright rules in full. Look in the project's documented rules location (commonly `.claude/rules/`, but may differ — discover the actual filenames):

- The Playwright **scripting** rules — locators, assertions, waiting, naming, code style, actions, form interactions
- The Playwright **architecture** rules — POM conventions, fixtures, auth setup, directory structure

If the project has no Playwright rules files, fall back to the conventions you can infer from the existing test suite (read 2–3 representative spec files and the contents of the test-utilities directory) and state in the report that the audit is based on inferred conventions rather than documented rules.

Detect whether the project's affected tests use Page Object Model:

- **POM in use** — a page-objects directory exists with at least one page class AND the changed spec imports a custom test fixture (commonly `pom`) instead of importing `test` directly from `@playwright/test`
- **POM not in use** — bare Playwright with the `page` fixture only

This determines which audit rules apply. POM rules are skipped entirely when POM is not in use — that is an expected, valid setup. Do not flag the absence of POM as a violation.

### 3. Read the application source code touched by the changes

For each locator or interaction in the diff, read the frontend source code that renders the element. The project may use any framework (React, Vue, Angular, Svelte, plain HTML, etc.) and any directory structure — discover where the UI components live, then read the files that render the routes and components the test interacts with.

Goal: judge whether each locator is correct, unique, and the most semantic option available, based on the actual rendered HTML and the locator priority defined in the project's scripting rules.

### 4. Audit the changes

Walk every changed line against the checklists below. Flag each violation with `file:line`. **Cite the specific rule** from the project's rules files — do not invent rules. The categories below are framework-agnostic patterns commonly enforced by Playwright rule sets; map each one to the equivalent rule in the project's actual rule files. If the project's rules contradict an item below, the project's rules win.

#### Locators
- Priority order followed: `getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > `getByTestId` > CSS (only for stable structural tags, never style classes)
- No CSS class-name selectors as locators
- `data-testid` actually exists in the source; if newly added, the value follows the project's naming convention (e.g. ends with the element noun if the project requires it)
- Locators used with action methods (`click`, `fill`, `check`, `selectOption`) resolve to exactly one element — verify by reading source
- Repeated UI patterns (cards, rows, list items) are scoped to their container — no `.first()` or unscoped action locators that risk false positives
- Cross-page navigation captures a value from the source page (e.g. heading text) and asserts it on the destination, not just any element of the destination type
- `name` / `hasText` constructor option preferred over `.filter()` when one is enough; `.filter()` reserved for second-level filtration
- Locator text matches source code exactly, including the responsive variant visible at the test viewport
- Semantic scoping: assertions on values that belong to a specific section are scoped to that section, not asserted globally on the page

#### Assertions
- Locator (auto-retrying) assertions preferred over generic `expect(value).toBe(...)` patterns
- No `expect.soft(...)`
- Negative assertions wait for the DOM mutation first (response, `waitFor({ state: 'hidden' })`, etc.) before asserting absence
- `toHaveText` / `toContainText` on a unique locator preferred over `getByText(...).toBeVisible()`

#### Waiting
- No `page.waitForTimeout(...)`
- No redundant `waitFor()` or `waitForURL` before an action or auto-waiting locator assertion
- Explicit waits used only before non-auto-waiting methods (`all`, `count`, `textContent`, `inputValue`, `allTextContents`)
- No custom timeouts in the first draft — no `{ timeout: ... }` on assertions, no `test.setTimeout(...)`. Custom timeouts are allowed only as a debugging fix, never preemptively

#### Test structure
- Test names describe user behavior, not implementation details
- Test entry point follows the project's convention (e.g. always start at the home page, or other documented pattern)
- Each test verifies one logical user flow
- `test.describe` placement and `beforeEach` usage match the file's existing conventions

#### Code style
- One statement per line — no vertically-stacked locator chains, `expect(...)` wraps, or test signatures
- Locator constants only when justified by the project's rules (typically: repeated 3+ times, or opaque-and-used 2+ times); otherwise inlined
- No intermediate-only constants used solely to build the next constant
- No re-declaration of the same locator under variant names (`*AfterUpdate`, `*AfterRevert`) — locators are lazy and re-resolve
- Variable names ending in `Values` / `Texts` for `allTextContents` / `textContent` results — element-type names like `Links`, `Headings` are reserved for variables holding locators
- Repeated clicks on the exact same element use `click({ clickCount: N })`, not multiple lines

#### POM rules (only if POM is in use)
- Constructor takes `Page` only — no locator properties, no eager locator construction on the class
- All locators declared inline in the methods that use them
- No tiny single-action methods — methods cover meaningful multi-step user tasks
- No methods spanning two pages — every navigation marks a method boundary on a different page object
- Action methods do not own the test's goal assertion; goal assertions live in dedicated `expect*`-prefixed validation methods that are parametrized for reuse
- Action methods include lightweight stabilizing assertions where needed (start guard before non-auto-waiting code; end confirmation `expect(page).toHaveURL(...)` after navigation, or `toBeVisible` / `toHaveText` after in-page changes)
- Method names: camelCase, descriptive verb phrases, no abbreviations or acronyms; validation methods start with `expect`
- No duplicate methods differing only in a hardcoded value — parametrize the existing method instead
- Any new page class is registered in the project's `PageManager` (or equivalent) with eager construction and a camelCase property name
- Spec imports `test` and `expect` from the project's custom fixtures module, not directly from `@playwright/test`
- Reuse-first: a near-match existing method is parametrized rather than duplicated; before adding a new method the relevant class was scanned for existing coverage

#### Architecture
- Spec file lives in the correct directory for the actor / role / scenario, following the project's existing test layout
- Auth setup files untouched unless the change intentionally targets them
- Stateless utilities live in the project's helpers location, not inlined into page methods or specs

### 5. Compose the audit report

Output a single structured report directly to the user using markdown tables, one table per severity. Number every finding sequentially across all tables (1, 2, 3, …) so the user can reference them by ID when choosing which to apply.

```
## Audit summary
<one-sentence verdict: passes cleanly / minor issues / multiple violations>

## Findings — Must-fix

| #  | Location              | Issue                                    | Fix                                          |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 1  | `<file>:<line>`       | <rule violated + one-line evidence>      | <one-line suggested fix>                     |

## Findings — Should-fix

| #  | Location              | Issue                                    | Fix                                          |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 2  | `<file>:<line>`       | <rule violated + one-line evidence>      | <one-line suggested fix>                     |

## Suggestions

| #  | Location              | Improvement                              | Suggested change                             |
|----|-----------------------|------------------------------------------|----------------------------------------------|
| 3  | `<file>:<line>`       | <stylistic / readability nudge>          | <one-line suggested change>                  |

## What looks good
- <brief callouts of well-applied conventions so positive choices are reinforced>
```

Formatting rules:
- Omit any section with no entries.
- Keep cell content to a single line each. If the rule citation and the evidence are both essential, combine them as `<rule>: <evidence>` in the **Issue** column rather than spilling onto a second line.
- Use backticks around code identifiers, file paths, and selectors inside cells (e.g. `` `.ion-trash-a` ``, `` `getByTestId` ``, `` `article-page.ts:14` ``).
- Strip directory prefixes from the **Location** column to keep the table narrow — show only the filename and line (e.g. `article-page.ts:14`, not the full path). The reader can disambiguate from context; the full path lives only in the surrounding prose if needed.
- Cite the specific rule from the project's rules files inside the **Issue** column.
- The "What looks good" section stays as bullets — it's praise, not actionable items.

**Severity guide:**
- **Must-fix** — direct violation of a documented rule
- **Should-fix** — patterns the rules call out as preferred but where the current code still works
- **Suggestions** — stylistic or readability nudges not codified in the rules

### 6. Offer next step

Use `AskUserQuestion`:

- Question: "Audit complete. What would you like to do?"
- Header: "Next step"
- Option 1: label "Apply must-fix", description "Edit the test to resolve the must-fix findings only"
- Option 2: label "Apply all", description "Edit the test to resolve must-fix and should-fix findings"
- Option 3: label "Discuss", description "Talk through specific findings before changing anything"

The user may also select "Other" to ask for a custom subset by number (e.g. "apply 1, 3, 5") since the table assigns a stable ID to every finding. Honor those references precisely.

If the user picks **Apply must-fix** or **Apply all** (or names specific finding numbers): edit the spec (and page objects, if POM is in use) to resolve the selected findings, then re-run only the affected test:

```bash
npx playwright test -g "<exact test title>" --retries 0
```

If the test fails after the fixes, debug using a trace-driven loop (open the trace via `npx playwright trace open`, inspect actions/snapshots, apply a fix, re-run) until it passes.

If the user picks **Discuss**: answer their questions and only edit code on explicit request.

## Operating principles

- **Fresh-eyes posture** — you are NOT the agent that wrote this code. Re-derive every locator from the application source. Question every choice. The previous agent's intent is irrelevant; only the rules and the source code matter.
- **Recent uncommitted changes only** — the uncommitted diff is the entire audit scope. Never fall back to prior commits, never review untouched files, never propose rewrites of tests outside the diff.
- **Cite rules, not opinions** — every must-fix finding maps to a rule in the project's documented rules files. Opinion-only feedback goes under Suggestions.
- **Verify locators against source** — do not flag a locator as wrong without first reading the component that renders it. A locator that looks weak may be the only reliable option for that DOM.
- **No guessing about test intent** — if a finding depends on what the test was supposed to do, ask rather than assume.
- **POM-conditional review** — if POM is not in use, skip the POM section entirely. A bare Playwright spec is a valid project setup, not a violation.
- **Framework-agnostic** — the project may use any frontend framework or directory layout. Discover the project's conventions from its files; do not assume a specific stack.
