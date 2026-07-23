---
name: pw-coverage-planner
description: Plan Playwright E2E test coverage for a parent scenario. Enters plan mode, researches existing tests and source code, brainstorms positive/edge/negative cases, and saves an approved coverage plan as a markdown artifact in `.claude/pw-plans/` for later test generation.
---

Build a comprehensive Playwright test coverage plan for a parent scenario provided by the user. The output is a markdown artifact in `.claude/pw-plans/` that downstream skills (e.g. `pw-new-test`) can consume to generate concrete tests.

Parent scenario: $ARGUMENTS

**Never skip `AskUserQuestion` steps in this skill, even if told to work autonomously.**

## Instructions

### 1. Enter plan mode immediately

Before doing anything else, call the `EnterPlanMode` tool. All research in steps 2–5 happens in plan mode (read-only). No files are written until the user approves the plan in step 6.

If `$ARGUMENTS` is empty or too vague to plan against (e.g. less than ~5 words and no nouns identifying a feature/page/flow), use `AskUserQuestion` once to ask the user to describe the parent scenario before entering plan mode. Otherwise proceed.

### 2. Anchor on the parent scenario

Restate the parent scenario in one sentence to confirm understanding. Identify:
- **Actor / user role** — the role performing the scenario (e.g. an unauthenticated visitor, a standard authenticated user, a privileged/admin user, or any other role defined by the project)
- **Feature area** — the part of the product the scenario lives in (a page, a flow, a domain such as auth, payments, content management, etc.)
- **Primary user goal** — what success looks like for the actor

Discover the available roles from the project itself — look at folders under `tests/`, project-specific docs (`CLAUDE.md`, READMEs, rules files), and auth setup (`tests/auth.setup.ts` or equivalent). Do not assume a fixed role list.

If any of the three is ambiguous, make a reasonable assumption and flag it in the plan; do not block on clarification.

### 3. Review existing test suite

Read the spec files under `tests/` (or whichever directory the project uses for E2E tests) that are relevant to the actor and feature area:
- Match by folder first (e.g. role-based subfolders if the project uses them) and then by filename keyword
- Note which tests already exist so the plan does **not** duplicate them
- Note conventions in use (file location, `test.describe` block, fixtures, helpers, page objects) — follow what the project already does
- Identify which existing file the new tests should land in (or whether a new spec file is warranted)

If the project has a Playwright rules file (e.g. under `.claude/rules/`), read it and respect its conventions in the plan (naming style, locator priorities, assertion patterns).

### 4. Inspect application source code

For each page or component the parent scenario touches, read enough source to identify behavior worth testing:
- Page / route / view files that render the UI
- Child components rendering the interactive elements
- Server-side endpoints, controllers, or API routers behind those components — input validation schemas reveal field rules; thrown errors and conditional branches reveal negative-path behavior
- Data layer / schema definitions — uniqueness constraints, enums, nullability, status fields
- Authorization checks — role guards, ownership checks, middleware

Adapt the search to whatever stack the project uses (any framework, any language, any data layer). The goal is to surface every observable branch a user could hit. Do not infer behavior — read the code.

### 5. Brainstorm test cases across all categories

Produce a coverage plan that is **MECE-style** (mutually exclusive, collectively exhaustive) across these categories. For each, ask the listed prompts and only keep cases that are observable through the UI:

**Happy path (positive)**
- The canonical success flow described by the parent scenario
- Meaningful variants of success — different valid inputs, optional flags, alternative valid paths through the same flow

**Edge cases**
- Input boundaries: empty, whitespace-only, min/max length, unicode, leading/trailing spaces, case sensitivity, special characters
- Numeric / quantity boundaries: 0, 1, exactly at a threshold, just above a threshold, max
- State boundaries: empty list, exactly one item, list at pagination boundary, all-selected vs none-selected
- Pre-existing state collisions: duplicate identifier already exists, resource already in target state, repeated submission
- Navigation edges: back button mid-flow, refresh mid-flow, deep-link into a step that requires earlier state, closing and reopening a modal
- Concurrency: double-click submit, two tabs in parallel (only if testable through UI without mocks)

**Negative cases**
- Validation failures: required field missing, malformed format, value too short/long, mismatched fields (e.g. confirm-password)
- Authorization: wrong role accessing a privileged route, unauthenticated user hitting an authenticated-only action, expired/invalid session
- Access-level / visibility rules: hidden/draft content not visible to non-privileged roles, private resources accessed by non-owners
- External-service failures: payment declined, third-party API error, webhook not yet received (only the user-visible side)
- Not-found / 404: bad identifier, deleted resource, mistyped URL
- Forbidden mutations: user editing a resource they don't own, non-eligible user attempting a privileged action

For each case, decide if it is **realistically testable in E2E** (not a unit-test concern). Drop cases that require mocking internals or that the UI has no surface for. Mark anything ambiguous with a `?` so the user can confirm during review.

### 6. Present the coverage plan with `ExitPlanMode`

Call `ExitPlanMode` with a markdown plan body that has these sections in order:

```markdown
# Coverage Plan: <parent scenario short title>

**Actor:** <role>
**Feature area:** <area>
**Primary goal:** <one sentence>
**Suggested file:** `<path/to/spec/file>.spec.ts` (new | existing)
**Existing related tests:** <list of test titles already in the suite, or "none">

## Assumptions
- <bullet for each assumption made about ambiguous parts of the scenario>

## Test cases

### Happy path
1. **<test title in user-behavior style>** — <one-line summary> _(P0)_
   - Pre: <auth state, test data needed>
   - Steps: <bullets, user-level — no selectors>
   - Expect: <observable outcomes — UI state, URL, persisted data visible in UI>

### Edge cases
2. **<test title>** — <summary> _(P1)_
   - Pre / Steps / Expect ...

### Negative cases
3. **<test title>** — <summary> _(P1)_
   - Pre / Steps / Expect ...

## Out of scope
- <cases considered but dropped, with one-line reason — e.g. "covered by unit test", "no UI surface", "requires mocking external service">

## Open questions
- <anything marked `?` during brainstorming that the user should confirm>
```

Use a user-behavior naming style for test titles (subject + can/cannot/sees + observable behavior — e.g. `<Role> can <do X>`, `<Role> sees error when <condition>`). Match the exact style already used in the project's existing tests if one is established. Steps and expectations describe **what the user does and observes**, not selectors or implementation. Priorities: `P0` = must-have for parent scenario, `P1` = important, `P2` = nice-to-have.

### 7. Save the artifact after approval

Once the user approves the plan (plan mode exits), write the same plan body to:

```
.claude/pw-plans/<slug>.md
```

Where `<slug>` is a kebab-case slug derived from the parent scenario short title (e.g. `<feature>-<variant>.md`). Create `.claude/pw-plans/` if it does not exist.

If a file with that slug already exists, append a numeric suffix (`-2`, `-3`, ...) rather than overwriting.

### 8. Confirm and offer next step

After saving, use `AskUserQuestion`:
- Question: "Coverage plan saved to `.claude/pw-plans/<slug>.md`. What's next?"
- Header: "Next step"
- Option 1: label "Generate first test", description "Run `pw-new-test` against the top P0 case from the plan"
- Option 2: label "Done", description "Stop here — I'll generate tests later"

If the user picks **Generate first test**, hand off to the `pw-new-test` skill using the first P0 case's title, pre-conditions, steps, and expectations as the test steps argument. If they pick **Done** or provide custom input, follow that instruction and stop.
