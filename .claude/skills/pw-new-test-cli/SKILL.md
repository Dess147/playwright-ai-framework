---
name: pw-new-test-cli
description: Write a new Playwright E2E test from user-provided test steps when application source code is NOT accessible. Uses Playwright CLI (`@playwright/cli`) to inspect a live URL via snapshots and `generate-locator`, then writes the test, runs and debugs it if needed.
---

Write a new Playwright E2E test based on the provided test steps using the Playwright CLI to explore a live application instead of reading source code.

Test steps: $ARGUMENTS

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## When to use this skill

Use this skill when the application source code is **not accessible** — for example, testing a third-party site, a deployed-only environment, or an application owned by another team. If you have access to the source code, prefer the `pw-new-test` skill: reading source is faster and produces more reliable locators than CLI snapshots.

## Prerequisites

The Playwright CLI (`@playwright/cli`) must be available. Verify:

```bash
npx playwright-cli --version
```

If it is missing, ask the user to install it (do not install it yourself):

```bash
npm install --save-dev @playwright/cli@latest
```

## Instructions

### 1. Review existing test suite

Read all existing spec files in `tests/` to understand:
- What is already covered (avoid duplicating tests)
- Which `test.describe` block and file the new test belongs in
- The conventions used (naming, grouping, beforeEach patterns)
- Whether page objects or fixtures from `playwright-utils/` are available and relevant

Also read `playwright.config.ts` to identify the configured `baseURL` — this is the live URL you will pass to the CLI in step 2.

### 2. Explore the live application via Playwright CLI

Confirm the URL with the user (default to `baseURL` from `playwright.config.ts`; ask if not configured or if a different environment is needed), then walk the test flow against the live site using the CLI. The CLI maintains page state between commands within a session, and each interaction returns an updated YAML snapshot with element refs (e.g., `e7`, `e15`) that you reuse in subsequent commands.

#### 2.1 Open a session

```bash
npx playwright-cli open <baseURL>
```

This launches a browser and navigates to the URL. The response includes a snapshot of the page with element refs.

#### 2.2 Walk the user flow

For each step in the test scenario, use CLI commands to perform the action and inspect the resulting page state:

```bash
# Inspect current page state
npx playwright-cli snapshot

# Interact with elements using refs from the snapshot
npx playwright-cli click e15
npx playwright-cli fill e7 "user@example.com"
npx playwright-cli select e22 "US"
npx playwright-cli check e9

# Navigate explicitly when needed
npx playwright-cli goto <url>
```

After each action, the CLI returns a fresh snapshot. Use it to find the next ref you need. Keep a running list of which refs correspond to which logical elements in the test (button to submit form, heading on success page, etc.).

#### 2.3 Generate locators for elements used in the test

For every element the test will interact with or assert on, generate a Playwright locator string:

```bash
npx playwright-cli generate-locator e15
```

The CLI returns a locator like `getByRole('button', { name: 'Submit' })`. Collect these for use when writing the test.

**The CLI is a starting point, not the final answer.** Validate each generated locator against the priority defined in `.claude/rules/playwright-scripting.md`:

`getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > `getByTestId` > CSS selector

If `generate-locator` returns a fragile selector (a CSS path or class-based locator), inspect the snapshot to see if a more semantic alternative is available — the snapshot includes role and accessible name information you can use to construct a better locator manually.

#### 2.4 Close the session

```bash
npx playwright-cli close
```

### 3. Write the test

- Place the test in the correct file and `test.describe` block based on the existing structure
- Every test starts from the home page (`/`) — never navigate directly to inner pages. Use UI interactions (clicking links, buttons) to reach the target page
- Follow all conventions from the Playwright rules (locator priority, assertion types, waiting patterns, naming, constant usage)
- **Do NOT modify application source code.** Since you do not have source access, you cannot add `data-testid` attributes. If no reliable user-visible locator exists for an element, use the most stable alternative the CLI revealed (an existing testid, a scoped role, or a structural CSS selector on a stable HTML tag). If you are forced to use a fragile locator, flag it explicitly to the user so they can request a `data-testid` from the application owner.
- **No custom timeouts** — do not add `test.setTimeout()`, `{ timeout: ... }` on assertions, or `waitForURL` timeouts. Always use the default timeouts from `playwright.config.ts`. Custom timeouts are only allowed as a fix during debugging (step 6) when the test fails because the default timeout was genuinely insufficient.
- Each test should verify one logical user flow
- Use the test steps provided by the user as the guide for the test actions and assertions

### 4. Ask user to run or adjust

After writing the test, use the `AskUserQuestion` tool to present the user with a choice:

- Question: "Test is ready. What would you like to do next?"
- Header: "Next step"
- Option 1: label "Run the test", description "Execute the test and debug if it fails"
- Option 2: label "Something else", description "Tell me what you'd like to change"

If the user selects "Run the test", proceed to step 5. If the user selects "Something else" or provides custom input, follow their instructions.

### 5. Run the test

Execute the test with tracing enabled and retries disabled:

```bash
npx playwright test -g "<exact test title>" --trace on --retries 0
```

If the test **passes**, proceed to step 7.

If the test **fails**, proceed to step 6.

### 6. Debug using trace

#### 6.1 Read terminal output

Extract from the terminal output:
- The error message and assertion failure details
- The stack trace pointing to the failing line
- The trace zip file path (under `test-results/`)

If the trace path is not visible, find it:

```bash
find test-results -name "trace.zip" -newer /tmp/test-start-marker 2>/dev/null | head -5
```

#### 6.2 Analyze the trace with CLI

**Important:** Use `npx playwright trace` (CLI mode), NOT `npx playwright show-trace` (GUI — will block execution).

Open the trace and inspect:

```bash
npx playwright trace open <path-to-trace.zip>
```

List actions and find failures (marked with `✗`):

```bash
npx playwright trace actions
```

Inspect the failing action details:

```bash
npx playwright trace action <number>
```

View the page snapshot at the moment of failure:

```bash
npx playwright trace snapshot <action-number> --name after
```

Use `--name before` to see state before the action if needed.

Check network requests if failure might be data/API related:

```bash
npx playwright trace requests
```

Check console errors:

```bash
npx playwright trace errors
```

Close the trace when done:

```bash
npx playwright trace close
```

If the trace alone is not enough to diagnose the failure, **re-open a Playwright CLI session** at the failing URL and re-explore the relevant part of the flow with `snapshot` / `generate-locator`. The live page state may differ from what you assumed when writing the test (dynamic content, A/B variants, auth gating).

#### 6.3 Report findings

Provide a clear summary:
- **What went wrong** — root cause (element not found, assertion mismatch, timeout, etc.)
- **Evidence** — error message, expected vs received, what the snapshot revealed
- **Failing line** — exact line in the spec file

#### 6.4 Apply the fix

If the root cause is clear (wrong selector, incorrect expected value, missing wait, etc.), fix the test and re-run:

```bash
npx playwright test -g "<exact test title>" --retries 0
```

If the issue is in the application itself rather than the test, explain it to the user. Application fixes are out of scope for this skill since you do not have source access.

Repeat steps 5–6 until the test passes or the issue requires user input. Once the test passes, proceed to step 7.

### 7. Confirm and finalize

After the test passes (whether on the first attempt or after debugging), use the `AskUserQuestion` tool to ask the user:

- Question: "Test passed. Does it meet your expectations?"
- Header: "Finalize"
- Option 1: label "Looks good", description "Remove comments and finalize the test"
- Option 2: label "Needs changes", description "Tell me what should be adjusted"

If the user selects **"Looks good"**: remove all inline comments (`// ...`) from the test code, keeping only the executable test lines. Do not remove `test.describe` labels, test titles, or any code — only `//` comment lines. Also collapse any blank lines between lines of code inside the test body so the test reads compactly. Preserve a single blank line only between top-level blocks (e.g., between `test.describe` and `test`, or between sibling `test` blocks). Then proceed to step 8.

If the user selects **"Needs changes"** or provides custom input: apply their instructions, re-run the test, and repeat from step 5.

### 8. Offer to commit

After the test is finalized, use the `AskUserQuestion` tool to ask the user:

- Question: "Should I commit the new test?"
- Header: "Commit"
- Option 1: label "Yes, commit", description "Stage the changes and create a commit"
- Option 2: label "No", description "Skip the commit"

If the user selects **"Yes, commit"**: run `git status` and `git diff` to review what will be included, draft a concise commit message that describes the new test (what flow it covers), then stage the relevant files and create the commit. Follow the repository's existing commit message style from `git log`.

If the user selects **"No"** or provides custom input: follow their instructions and stop.
