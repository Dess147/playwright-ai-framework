---
name: pw-new-test
description: Write a new Playwright E2E test from user-provided test steps. Reviews existing tests, inspects source code, writes the test, then runs and debugs it if needed.
---

Write a new Playwright E2E test based on the provided test steps.

Test steps: $ARGUMENTS

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## Instructions

### 1. Review existing test suite

Read all existing spec files in `tests/` to understand:

- What is already covered (avoid duplicating tests)
- Which `test.describe` block and file the new test belongs in
- The conventions used (naming, grouping, beforeEach patterns)
- Whether page objects or fixtures from `playwright-utils/` are available and relevant

### 2. Inspect application source code

For each page or component involved in the test steps:

- Read the source code of the relevant page component (e.g., `src/app/(frontend)/blog/[slug]/page.tsx`)
- Read child components that render the elements you need to interact with or assert on
- Identify reliable locators using the priority from playwright-scripting: `getByRole` > `getByLabel` > `getByText` > `getByPlaceholder` > `getByTestId` > CSS selector
- If no reliable user-visible locator exists for an element, **add a `data-testid` attribute to the application source code**, then use `getByTestId` in the test

### 3. Write the test

- Place the test in the correct file and `test.describe` block based on the existing structure
- Every test starts from the home page (`/`) — never navigate directly to inner pages. Use UI interactions (clicking links, buttons) to reach the target page
- Follow all conventions from the Playwright rules (locator priority, assertion types, waiting patterns, naming, constant usage)
- **No custom timeouts** — do not add `test.setTimeout()`, `{ timeout: ... }` on assertions, or `waitForURL` timeouts. Always use the default timeouts from `playwright.config.ts`. Custom timeouts are only allowed as a fix during debugging (step 6) when the test fails because the default timeout was genuinely insufficient.
- Each test should verify one logical user flow
- Use the test steps provided by the user as the guide for the test actions and assertions
- **One statement per line.** After writing the test, re-read the file and inline any vertically-stacked expressions (locator chains, `expect(...)` wraps, test signatures) so each statement lives on a single line. Line length doesn't matter. Do not run a formatter or read the project's formatter config — just judge structure visually and `Edit` what's stacked.

Skip lines that are _intentionally_ multi-line because the content itself contains newlines (template strings spanning real newlines, multi-line array literals where each entry is meant to be readable, etc.).

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

If the issue is in the application (not the test), explain to the user rather than guessing at a fix.

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
