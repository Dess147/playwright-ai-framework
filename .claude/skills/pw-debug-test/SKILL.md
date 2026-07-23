---
name: pw-debug-test
description: Debug a failed Playwright test by running it with tracing on, then analyzing the trace using the Playwright CLI trace tool (`npx playwright trace`). Use this skill whenever the user asks to debug, fix, or investigate a failing or flaky Playwright test, or when a test execution produces an error. Also triggers when the user says things like "this test is broken", "why is this test failing", "fix this test", or "investigate test failure".
---

# Debug a Failed Playwright Test

You are debugging a Playwright E2E test using the `npx playwright trace` CLI. Follow these steps in order.

## Step 0: Confirm the test name

The user must provide the test to debug — either the exact `test('...')` title or a unique keyword from it.

If the user did **not** provide a test name, **stop and ask**:

> Which Playwright test should I debug? Please paste the exact `test('...')` title or a unique keyword from it.

Do not guess, do not pick the most recently edited test, do not run the entire suite. Wait for the user's answer before continuing.

## Step 1: Find the test in the project

This skill is project-agnostic. Discover the project layout instead of assuming `tests/`:

1. Read `playwright.config.ts` (or `.js` / `.mts`) at the repo root to find `testDir`. Fall back to common locations (`tests/`, `e2e/`, `playwright/`) if no config is found.
2. Inside the test directory, grep recursively for the user-supplied test title or keyword. Match against `test(`, `test.only(`, `test.skip(`, and `test.describe(` blocks so the same skill works for tests nested inside describe blocks.
3. If multiple matches are found, list them and ask the user which one to debug. If no match is found, tell the user and stop — do not invent a test.

Read the matched spec file in full so you understand setup, fixtures, and what the test is supposed to do before running it.

## Step 2: Run the test with tracing forced on

Run only the matched test, with tracing forced on and retries disabled so the trace reflects a single, deterministic run:

```bash
npx playwright test -g "<exact test title>" --trace on --retries 0
```

If the project uses multiple Playwright projects (e.g. `chromium`, `firefox`, `mobile`) and the failure is project-specific, also pass `--project=<name>`. Otherwise let it run on the configured default.

Read the terminal output carefully:
- If the test **passes**, inform the user that the test passed on this run, mention it may be flaky, and stop. Do not open a trace for a passing run.
- If the test **fails**, extract the error message, the assertion failure, the stack trace pointing to the failing line, and the trace zip path (printed under `test-results/`).

If the trace path is not visible in the output, find the most recently produced trace:

```bash
ls -t test-results/**/trace.zip 2>/dev/null | head -5
```

If `test-results/` lives elsewhere (custom `outputDir` in the config), use that path instead.

## Step 3: Analyze the trace with the CLI

**Important:** Use `npx playwright trace` (CLI), **NOT** `npx playwright show-trace` — the latter opens a GUI and blocks the agent.

### 3.1 Open the trace

```bash
npx playwright trace open <path-to-trace.zip>
```

### 3.2 List actions and locate the failure

```bash
npx playwright trace actions
```

Look for actions marked with `✗` — these are the failures. To narrow down to a specific kind of action:

```bash
npx playwright trace actions --grep="expect"
```

### 3.3 Inspect the failing action

```bash
npx playwright trace action <number>
```

This shows the action type, the error message, expected vs received values, the timeout, and which snapshots are available.

### 3.4 View the page snapshot at the moment of failure

```bash
npx playwright trace snapshot <action-number> --name after
```

Use `--name before` to see the page state right before the action, `--name after` to see what the page looked like when the action failed. The `after` snapshot is usually the most useful for failed assertions and missing elements.

### 3.5 Check network requests (when relevant)

If the failure might be related to API calls, missing data, or a slow/failed response:

```bash
npx playwright trace requests
npx playwright trace request <request-id>
```

### 3.6 Check console messages and page errors

```bash
npx playwright trace console
npx playwright trace errors
```

Page-side errors often explain why an element never appeared.

### 3.7 Close the trace when done

```bash
npx playwright trace close
```

## Step 4: Report findings

Give the user a clear, structured summary:

- **Which test failed** — file path and exact `test('...')` title.
- **What went wrong** — the root cause (locator didn't match, assertion mismatch, timeout, network/API failure, missing test data, navigation issue, etc.).
- **Evidence** — the specific error message, expected vs received values, and what the page snapshot revealed.
- **Failing line** — point to the exact line in the spec file using `path:line` format.
- **Suggested fix** — a concrete code change or next step.

Distinguish between *test bugs* (wrong selector, wrong expectation, missing wait), *application bugs* (the app is genuinely broken), and *environment problems* (missing seed data, auth state, env vars). Do not silently "fix" an application bug by weakening the test.

## Step 5: Apply the fix

If the root cause is clear and the fix is straightforward and lives in the test (wrong locator, incorrect expected value, wrong URL, missing precondition), apply it directly to the spec file. Re-run only that test to verify:

```bash
npx playwright test -g "<exact test title>" --retries 0
```

Then run it once more without `--trace on` to confirm it passes under normal conditions.

If the fix is **not** straightforward — application bug, ambiguous root cause, missing test data, environment/config issue, or a flake that needs broader investigation — explain the situation and propose next steps rather than guessing. Do not paper over real bugs with timeouts, retries, or `force: true`.

## Reference: `npx playwright trace` subcommands

| Command | Purpose |
|---|---|
| `open <trace>` | Open a trace zip file for CLI inspection |
| `close` | Close the currently open trace |
| `actions [options]` | List all actions (use `--grep` to filter) |
| `action <id>` | Show details of a specific action |
| `requests [options]` | List network requests |
| `request <id>` | Show details of a specific request |
| `console [options]` | Show console messages |
| `errors` | Show errors with stack traces |
| `snapshot [options] <id>` | View DOM snapshot for an action |
| `screenshot [options] <id>` | Save screencast screenshot for an action |
| `attachments` | List trace attachments |
| `attachment [options] <id>` | Extract a specific attachment |
| `help [command]` | Show help for a command |
