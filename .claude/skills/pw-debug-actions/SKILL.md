---
name: pw-debug-actions
description: Debug a Playwright test that failed in GitHub Actions. Uses the `gh` CLI to locate the failed workflow run, downloads its `test-results` artifact (containing the Playwright trace), analyzes the trace via `npx playwright trace`, identifies the root cause, and applies a fix to the spec following the project's Playwright scripting rules — leaving the change uncommitted so the user can review, commit, and push. Use this skill when the user asks to debug, fix, or investigate a Playwright test that failed on GitHub Actions / CI (e.g. "the pw test failed on CI", "debug the failed actions run", "why did the GitHub Actions Playwright job fail", "fix the failing CI test").
---

# Debug a Playwright Test That Failed in GitHub Actions

You are debugging a Playwright E2E test that failed in a GitHub Actions workflow. You will fetch the failure artifacts from CI, inspect the trace locally with `npx playwright trace`, find the root cause, and apply a code fix that complies with the project's Playwright scripting rules. You stop **before** committing — the user reviews and pushes themselves.

This skill is the CI-aware sibling of `pw-debug-test`. The big difference: the trace lives in a GitHub Actions artifact, not on the local machine, and the failure may not reproduce locally (timing, environment, base URL differences). Treat the trace from CI as the authoritative source of truth, not a local re-run.

## Prerequisites

Before doing anything else, confirm in parallel that the basic plumbing is in place:

1. `gh --version` — the GitHub CLI is installed.
2. `gh auth status` — the user is authenticated.
3. The current directory is a git repository with a GitHub remote (`gh repo view --json nameWithOwner`).

If any of these fail, stop and tell the user what's missing — do not try to install or authenticate `gh` yourself.

## Step 0: Identify the failed run

The user may give you any of these — handle each:

- A specific run URL or run ID (e.g. `https://github.com/owner/repo/actions/runs/1234567890` or just `1234567890`)
- A workflow name (e.g. "playwright.yml" or "Playwright Tests")
- Nothing — in which case **find the most recent failed Playwright run on the current branch** automatically; do not interrupt the user for this.

Useful commands:

```bash
# Most recent failed runs on the current branch (any workflow)
gh run list --branch "$(git branch --show-current)" --status failure --limit 10

# Filter to a specific workflow file
gh run list --workflow=playwright.yml --status failure --limit 10

# Show details of a specific run
gh run view <run-id>

# Show only the failed jobs/steps for a run
gh run view <run-id> --log-failed
```

Pick the **most recent failed run** unless the user specified one. If multiple workflows ran and more than one is failing, list them and ask which one to debug. If there are zero failed Playwright runs, tell the user and stop — do not invent one.

Capture the run ID — you will use it in the next steps.

## Step 1: Read the failed step's log first

Before downloading artifacts, skim the failed step's log to see which test(s) failed and why:

```bash
gh run view <run-id> --log-failed | tail -200
```

Extract:
- The exact `test('...')` titles that failed
- The spec file path printed by Playwright
- The first error message and stack frame (often enough to know whether it's a locator issue, a timeout, an assertion mismatch, or an environment problem before you even open the trace)

If multiple tests failed, pick **one** to debug first — usually the first failure, since later failures are often cascades of the first. Tell the user which one you're starting with and that you'll come back to the others.

## Step 2: Download the artifacts

The CI workflow uploads `playwright-report/` and `test-results/` as artifacts on failure. You want `test-results/` because it contains the trace zips.

```bash
mkdir -p .pw-ci-debug/<run-id>
gh run download <run-id> --name test-results --dir .pw-ci-debug/<run-id>/test-results
```

If the artifact is named differently in this repo, list the artifacts first and pick the right one:

```bash
gh run view <run-id> --json artifacts --jq '.artifacts[].name'
```

The download directory `.pw-ci-debug/` is intentionally local and disposable — add it to `.gitignore` if it isn't already, but **do not commit that change as part of this skill**; just mention it to the user if you create the entry.

If `test-results/` is empty or has no `trace.zip`, the project may have tracing disabled in CI. In that case, stop and tell the user: tracing must be enabled in CI (e.g. `trace: 'on-first-retry'` or `'retain-on-failure'` in `playwright.config.ts`) for this skill to work. Suggest the config change and stop.

## Step 3: Locate the relevant trace

Find the trace for the failing test. Trace files are typically at:

```
test-results/<spec-name>-<test-title>-<project>/trace.zip
```

```bash
find .pw-ci-debug/<run-id>/test-results -name 'trace.zip'
```

If multiple traces exist (one per failed test, plus retries), pick the one whose folder name matches the test you chose in Step 1. If retries are present (`retry1`, `retry2`), prefer the **last** retry's trace — that's the one that produced the final failure that bubbled up.

## Step 4: Find the test source in the repo

The trace tells you what happened on CI; the spec file tells you what the test was trying to do. Read both.

1. Read `playwright.config.ts` (or `.js` / `.mts`) at the repo root to find `testDir`. Fall back to common locations (`tests/`, `e2e/`, `playwright/`) if no config is found.
2. Inside that directory, grep for the failing test title (handle `test(`, `test.only(`, `test.skip(`, `test.describe(`).
3. Read the matched spec file in full so you understand fixtures, setup, and the intent of the test before deciding how to fix it.

## Step 5: Analyze the trace with the CLI

**Important:** Use `npx playwright trace` (CLI), **NOT** `npx playwright show-trace` — the latter opens a GUI and blocks the agent.

### 5.1 Open the trace

```bash
npx playwright trace open <path-to-trace.zip>
```

### 5.2 List actions and locate the failure

```bash
npx playwright trace actions
```

Look for actions marked with `✗` — these are the failures. To narrow down:

```bash
npx playwright trace actions --grep="expect"
```

### 5.3 Inspect the failing action

```bash
npx playwright trace action <number>
```

This shows the action type, the error message, expected vs received values, the timeout, and which snapshots are available.

### 5.4 View the page snapshot at the moment of failure

```bash
npx playwright trace snapshot <action-number> --name after
```

Use `--name before` to see the page state right before the action; `--name after` to see what the page looked like when the action failed. The `after` snapshot is usually the most useful for failed assertions and missing elements.

### 5.5 Check network requests

If the failure might be related to API calls, missing data, or a slow/failed response (especially likely for CI failures with different `BASE_URL`):

```bash
npx playwright trace requests
npx playwright trace request <request-id>
```

### 5.6 Check console messages and page errors

```bash
npx playwright trace console
npx playwright trace errors
```

Page-side errors often explain why an element never appeared.

### 5.7 Close the trace when done

```bash
npx playwright trace close
```

## Step 6: Classify the root cause

Be honest about which bucket the failure falls into — the right fix depends on it:

- **Test bug** — wrong locator, wrong expected value, missing wait, race condition in the test, brittle CSS selector, hardcoded value that's environment-dependent. Fix the test.
- **Application bug** — the app is genuinely broken (in CI, or everywhere). Do **not** weaken the test to make it pass. Report it and stop.
- **Environment / config problem** — wrong `BASE_URL`, missing seed data, missing auth state, missing env var, CI runs against an environment the test wasn't designed for. Report it; the fix is usually in the workflow or the test config, not the spec.
- **Flake** — passes locally, passes on re-run, intermittent network/timing. If you can identify *why* it's flaky (e.g. animation, missing `await`, racing toast notifications), fix the underlying cause. **Do not paper over flakes with longer timeouts, retries, or `force: true`.**

Tell the user which bucket you placed the failure in and why — this is the most important part of your report.

## Step 7: Report findings

Give the user a clear, structured summary before applying any fix:

- **Run** — workflow name, run ID, run URL.
- **Test** — spec file path and the exact `test('...')` title.
- **Root cause** — the bucket from Step 6, plus a one-paragraph explanation.
- **Evidence** — the specific error message, expected vs received values, what the page snapshot revealed, and any relevant network/console findings.
- **Failing line** — `path:line` format.
- **Proposed fix** — concrete, including which scripting rule it follows (see Step 8).

## Step 8: Apply the fix per the project's scripting rules

Before editing the spec, locate and read the project's Playwright scripting rules. Check these in order and use the first one you find:

1. `.claude/rules/playwright-scripting.md`
2. `.cursor/rules/playwright-scripting.md` (or similar Cursor rule files)
3. `playwright-utils/CLAUDE.md` or a `CLAUDE.md` near the test directory
4. The repo-root `CLAUDE.md`

If none exist, fall back to general Playwright best practice: prefer `getByRole` / `getByLabel` / `getByText` over CSS selectors, prefer auto-waiting assertions (`expect(locator).toBeVisible()`) over `waitForTimeout`, keep test data and selectors deterministic, and never use `force: true` to bypass a real problem.

Apply the fix to the spec file (or to a Page Object, fixture, or helper if the project uses POM — check `playwright-architecture.md` if it exists). Keep the change minimal and focused on the root cause; do not refactor unrelated code as part of this skill.

If the root cause was an **application bug** or an **environment problem**, do **not** edit the spec to mask it. Instead, write up what needs to change (in the app, in the workflow, in the config) and stop.

## Step 9: Verify locally if possible

If the failure is one that can plausibly reproduce locally, run only that test:

```bash
npx playwright test -g "<exact test title>" --retries 0
```

Then once more without any debug flags to confirm it passes cleanly. If the failure is CI-only (e.g. depends on the CI `BASE_URL` or seed data), say so explicitly — do not claim "fixed" based on a local pass that can't actually exercise the failure path. In that case, the only real verification is the next CI run after the user pushes.

## Step 10: Hand off to the user

**Do not commit, do not push.** End by telling the user:

- Which file(s) you changed and the rationale, in one or two sentences.
- Whether you verified locally, and if not, why (e.g. CI-only repro).
- That they should review the diff, commit, and push when they're ready.

Optionally remind them that the next push to the branch (or a re-run of the workflow) will exercise the fix in CI.

## Reference: useful `gh` commands

| Command | Purpose |
|---|---|
| `gh run list --workflow=<file> --status failure --limit N` | Recent failed runs of a workflow |
| `gh run list --branch <name> --status failure` | Recent failed runs on a branch |
| `gh run view <run-id>` | Summary of a run |
| `gh run view <run-id> --log-failed` | Logs from only the failed steps |
| `gh run view <run-id> --json artifacts --jq '.artifacts[].name'` | List artifact names |
| `gh run download <run-id> --name <artifact> --dir <path>` | Download a specific artifact |
| `gh run rerun <run-id>` | Re-run the workflow (only if user asks) |

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
