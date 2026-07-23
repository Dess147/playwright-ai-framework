---
name: pw-debug-live
description: Debug a Playwright test interactively via `--debug=cli` and `playwright-cli`. Pauses the test at a user-chosen line using `pause-at` (no source edits), then drives the live, paused page with `snapshot`, `eval`, `generate-locator`, `console`, `requests` to diagnose race conditions, timing bugs, and state-dependent failures that a static trace can't show. Use when the user asks to "step through a test", "live debug", "attach to a paused test", "debug from line N", or when `pw-debug-test` (trace-based) was insufficient because the failure depends on live page state.
---

# Live-Attach Playwright Test Debugging

You are debugging a Playwright E2E test by attaching to a paused, running test session via `playwright-cli`. Unlike `pw-debug-test` (which inspects a frozen trace after the run), this skill drives a **live** browser so you can probe the page mid-execution.

**Critical:** This skill never edits the spec file to insert `page.pause()`. The CLI's built-in `pause-at <file>:<line>` does the same thing without touching source. If you find yourself reaching for `Edit` on the spec, stop and use `pause-at` instead.

## Step 0: Gather inputs from the user

Use `AskUserQuestion` to collect:

1. **Test file path** — relative to repo root, e.g. `tests/user/article-create.spec.ts`.
2. **Test name** — the `test('...')` title (or a unique keyword from it). Used as `-g <pattern>`.
3. **Line number** — the line where execution should pause. Should be inside the body of the chosen test.
4. **Failure hint** _(optional)_ — what's suspected to fail (e.g. "the publish button click times out"). Helps focus the investigation.

Do not skip this step under any circumstance, even if the user has asked to work without clarifying questions. You need all four answers before continuing.

## Step 1: Validate the inputs and the workspace

Before spawning anything:

1. **File exists.** `Read` the test file. If it doesn't exist, stop and ask.
2. **Line is inside the right test.** Confirm the line number falls between the `test('<name>', ...)` opening and its closing brace. If the line is outside the named test (e.g. inside `beforeEach`, another test, or import block), warn the user and ask whether to proceed or pick a different line.
3. **Workspace is clean.** Run `npx playwright-cli list`. If it reports any active `tw-*` browser session, ask the user before continuing — those would create attach ambiguity. Offer to run `npx playwright-cli close-all` to clean up.
4. **Detect the project.** Read `playwright.config.ts` (or `.js` / `.mts`). If `projects:` defines multiple named projects, infer which project the target file belongs to (match by `testDir`, `testMatch`, or path) and remember it as `<proj>`. If it's ambiguous, ask. If there is no `projects:` array, omit the `--project` flag.

## Step 2: Spawn the test in `--debug=cli` mode

Run the test in the background:

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <test-file> -g "<test-name>" --project=<proj> --debug=cli
```

Use `Bash` with `run_in_background: true`. The harness returns the background task id and the path to the captured stdout/stderr — remember both. Refer to that path as `$LOG` in the steps below.

**Always** include `PLAYWRIGHT_HTML_OPEN=never` to prevent the HTML reporter from blocking on a browser tab when the test ends.

Omit `--project` if the project has no named `projects:` array. Quote the test name to handle spaces.

## Step 3: Wait for the session id

Poll the harness's captured-output file until the debugging-instructions block appears, then extract the `tw-XXXXXX` session id. The protocol prints exactly:

```
### The test is currently paused at the start

### Debugging Instructions
- Run "playwright-cli attach tw-79c225" to attach to this test
```

Use a single `Bash` call (`run_in_background: true`) with an `until` poll and a tight grep — you'll get notified the moment the session is up. Substitute the actual log path the harness gave you in Step 2:

```bash
until grep -oE 'tw-[a-z0-9]+' <log-path> >/dev/null 2>&1; do sleep 0.5; done
grep -oE 'tw-[a-z0-9]+' <log-path> | head -1
```

Capture the session id as `<session>`.

### 3a: Confirm it's the right test

Just before the "Debugging Instructions" block, the runner prints the test that's paused, e.g.:

```
[user] › tests/user/article-create.spec.ts:8:7 › Article create › Authenticated user can publish...
```

Verify this matches the file the user gave you. If it doesn't (most often: an `auth-setup` or other dependency project paused first), advance past it:

```bash
npx playwright-cli attach <session>
npx playwright-cli -s=<session> resume
```

Then go back to Step 3 and wait for the **next** `tw-XXXX` to appear in the log. Don't assume the first session is the one you want.

## Step 4: Attach to the live session

```bash
npx playwright-cli attach <session>
```

The `attach` call writes an initial snapshot to `.playwright-cli/page-*.yml`. After this, **every** subsequent cli call must pass `-s=<session>` — there is no implicit default binding.

## Step 5: Set the breakpoint via `pause-at`

```bash
npx playwright-cli -s=<session> pause-at "<test-file>:<line>"
```

`pause-at` accepts `<file>:<line>` directly. This is the substitute for `page.pause()` — and the reason this skill never edits the user's source. If the call returns `{}`, the breakpoint is set.

## Step 6: Resume to the breakpoint

```bash
npx playwright-cli -s=<session> resume
```

The test runs from its current pause point (the start of the test) full-speed up to the line you set, then halts. The browser is now in the exact state the test was in just before that line ran.

If `resume` returns `Session closed`, the test ran to completion before hitting the breakpoint — the line is unreachable from the current state (e.g. it sits after an `if` branch the test didn't take, or after an `await` that threw). Re-check the line and re-run.

## Step 7: Investigate

The agent picks tools from the cli surface based on the user's hint and what the snapshot reveals. **Always pass `-s=<session>` and `--json`** for parseable output.

| Goal                                              | Command                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Inventory the page (refs `e1`, `e2`, …)           | `npx playwright-cli -s=<session> snapshot --json`                                                        |
| Try a candidate locator                           | `npx playwright-cli -s=<session> generate-locator <ref> --json`                                          |
| Read a property/attribute                         | `npx playwright-cli -s=<session> eval "el => el.getAttribute('disabled')" <ref> --json`                  |
| Read page-level state                             | `npx playwright-cli -s=<session> eval "location.href" --json`                                            |
| Check console output                              | `npx playwright-cli -s=<session> console --json`                                                         |
| Inspect network                                   | `npx playwright-cli -s=<session> requests --json` then `request <n> --json`                              |
| Step one action at a time                         | `npx playwright-cli -s=<session> step-over`                                                              |
| Run a Playwright TS snippet against the live test | `npx playwright-cli -s=<session> run-code "await page.getByRole('button', { name: 'Publish' }).click()"` |

Common diagnostic flow:

1. `snapshot` to see what's on the page right now.
2. If a locator looks suspicious, `eval` its `disabled`, `aria-hidden`, `offsetParent`, etc. to find out _why_ Playwright thinks it isn't actionable.
3. If an action is the next step, `generate-locator` or `run-code` rehearses the corrected call — the cli emits Playwright TypeScript you can paste into the spec.
4. If nothing on the page is what you expect, `console` and `requests` tell you whether the app errored or a network call failed.

Keep notes of every action — each cli action emits the equivalent `page.foo()` TS, which is the material for the suggested fix.

## Step 8: Diagnose and report

Once the root cause is clear, summarize for the user:

- **Root cause** — locator drift, missing wait, race condition, app bug, etc. Distinguish _test bug_ vs _app bug_ vs _environment_.
- **Evidence** — quote the snapshot excerpt, the `eval` result, or the network failure that proves it.
- **Suggested fix** — concrete code change with `path:line` and the exact replacement line(s). For locator fixes, paste the TS that the cli already emitted.

Ask before applying the fix to the spec. If the user approves, apply it via `Edit` (do **not** add `page.pause()` or any other debug artifact).

## Step 9: Cleanup (always runs)

This step must run on every exit path — success, error, user interrupt:

```bash
npx playwright-cli close-all                      # closes the attached browser, ends the session
# the background test process exits naturally once the session closes;
# if it's still running, kill the background task by id.
```

The harness's captured-output file is reaped automatically when the background task ends — no manual cleanup needed.

Then verify:

```bash
npx playwright-cli list                            # should print "(no browsers)"
```

If the verify step still shows browsers, escalate with `npx playwright-cli kill-all`.

**No source restoration is needed** — this skill never edits the spec. If a fix was applied in Step 8, leave it as the user's pending change; do not auto-revert.

## Step 10: Re-run to confirm the fix (only if a fix was applied)

```bash
npx playwright-cli list                            # confirm clean
PLAYWRIGHT_HTML_OPEN=never npx playwright test <test-file> -g "<test-name>" --project=<proj>
```

If it passes, report green. If it still fails, do not loop back into another `--debug=cli` session automatically — report the new failure and ask the user how to proceed.

## Reference: cli surface

Full command list: `npx playwright-cli --help`. Most-used here:

| Command                                 | Purpose                               |
| --------------------------------------- | ------------------------------------- |
| `attach <session>`                      | Bind to a paused test session         |
| `-s=<session> pause-at <file>:<line>`   | Set a breakpoint at a source location |
| `-s=<session> resume`                   | Run until next breakpoint or end      |
| `-s=<session> step-over`                | Step a single action                  |
| `-s=<session> snapshot`                 | DOM snapshot with `eN` element refs   |
| `-s=<session> generate-locator <ref>`   | Emit a Playwright locator for a ref   |
| `-s=<session> eval <fn> [ref]`          | Run JS on page or element             |
| `-s=<session> run-code <ts>`            | Execute a Playwright TS snippet live  |
| `-s=<session> console`                  | Console messages                      |
| `-s=<session> requests` / `request <n>` | Network inspection                    |
| `list`                                  | All active cli browsers               |
| `close-all`                             | Close every cli browser               |
| `kill-all`                              | Force-kill stale sessions             |

Global flags: `--json` for structured output, `--raw` for value-only, `--help [command]` for per-command help.
