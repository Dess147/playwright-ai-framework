# Coverage Plan: Authenticated User Publishes an Article and Sees It in the Feeds

**Actor:** Authenticated standard user (Conduit has no role distinction beyond authenticated vs. guest — confirmed by `login.spec.ts` / `auth.spec.ts`, which use a single `CONDUIT_USER_EMAIL` / `CONDUIT_USER_PASSWORD` pair and no role-based folders exist under `tests/`)
**Feature area:** Article creation (`/editor`) and its downstream visibility on the Home page (`Your Feed` / `Global Feed`)
**Primary goal:** A logged-in user can write and publish an article with a title, description, body, and tags, land on the published article page, and then find that article in the Global Feed from the homepage.
**Suggested file:** `tests/ui/create-article.spec.ts` (new)
**Existing related tests:**
- `user can sign in with valid credentials` (`tests/ui/login.spec.ts`)
- `invalid credentials show an error message` (`tests/ui/login.spec.ts`)
- `homepage loads and shows the Global Feed tab` (`tests/ui/homepage.spec.ts`)
- No existing UI tests cover the editor / article-creation flow.

## Assumptions

- Conduit application source is not in this repo (per `CLAUDE.md`), so field behavior (placeholders, validation error wording, tag dedup, route guarding) is based on the standard RealWorld Conduit app used by Bondar Academy, not verified against source. These are flagged with `?` below and should be confirmed by inspecting the live app during test authoring (`pw-new-test` / `pw-new-test-cli`).
- The editor is reached via a "New Article" link visible only when logged in — consistent with the project's "always start from home page, navigate via UI" convention already used in `login.spec.ts`.
- Tests requiring login will follow the existing convention: read `CONDUIT_USER_EMAIL` / `CONDUIT_USER_PASSWORD` from env and `test.skip` when unset (matches `login.spec.ts` and `auth.spec.ts`).
- No Page Object Model exists yet in this project and `CLAUDE.md` explicitly says not to introduce one for early tests — this plan assumes flat spec files with inline locators, consistent with current test files.
- "Two tags" in the parent scenario is treated as representative test data; the exact tag text is not prescriptive.

## Test cases

### Happy path

1. **User can publish an article with title, description, body and two tags, and see it in the Global Feed** — the canonical flow from the parent scenario _(P0)_
   - Pre: user is logged in (valid env credentials)
   - Steps:
     - From the homepage, click "New Article"
     - Fill in article title, description, and body
     - Add two tags
     - Click "Publish Article"
   - Expect: user is redirected to the published article's page showing the title, body, and both tags; navigating to the homepage and viewing the Global Feed shows an entry for the article with the same title

2. **User can publish an article with no tags** — tags are optional; alternate valid path through the same flow _(P1)_
   - Pre: user is logged in
   - Steps: fill title, description, body; skip tags; click Publish Article
   - Expect: article publishes successfully and appears in the Global Feed with no tags shown

### Edge cases

3. **User can remove a tag before publishing** — tag pill has a remove control; verify the removed tag is excluded from the published article _(P1)_
   - Pre: user is logged in
   - Steps: add two tags, remove one, publish
   - Expect: published article and Global Feed entry show only the remaining tag

4. **Title, description, and body support unicode and special characters** — verifies the editor and article view render non-ASCII input correctly _(P1)_
   - Pre: user is logged in
   - Steps: publish an article using a title/description/body containing accented characters, emoji, and symbols
   - Expect: published article page and Global Feed entry display the text unchanged

5. **Pressing Enter with an empty tag field does not add a blank tag** `?` — needs confirmation of exact tag-input UX during authoring _(P2)_
   - Pre: user is logged in, on the editor page
   - Steps: focus the tag input without typing, press Enter; then publish with one real tag
   - Expect: no empty tag pill appears; published article's tag list contains only the one real tag

### Negative cases

6. **User cannot publish an article without a title** — required-field validation _(P0)_
   - Pre: user is logged in, on the editor page
   - Steps: leave title blank, fill description and body, click Publish Article
   - Expect: user remains on the editor page and sees a validation error; no navigation to an article page occurs

7. **User cannot publish an article without a description** _(P1)_
   - Pre / Steps: same as above, description left blank
   - Expect: same as above — blocked with a validation error, stays on editor

8. **User cannot publish an article without a body** _(P1)_
   - Pre / Steps: same as above, body left blank
   - Expect: same as above — blocked with a validation error, stays on editor

9. **A whitespace-only title is rejected the same as an empty title** `?` — depends on whether the app trims/validates whitespace server-side _(P2)_
   - Pre: user is logged in, on the editor page
   - Steps: fill title with only spaces, fill description and body, click Publish Article
   - Expect: treated as blank — validation error shown, no article published

10. **Unauthenticated visitor cannot reach the article editor** `?` — needs confirmation of exact guard behavior (nav link hidden vs. redirect on direct navigation) _(P0)_
    - Pre: no active session
    - Steps: from the homepage, look for a "New Article" entry point / attempt to reach the editor
    - Expect: no "New Article" link is available to a logged-out user (and/or navigating to the editor route redirects to sign in), so an unauthenticated user cannot publish an article

11. **User cannot publish a second article using a title that already exists** `?` — parent-scenario-adjacent duplicate-identifier check; actual product behavior unconfirmed (may reject with a validation/conflict error, or may accept and generate a distinct slug) _(P1)_
    - Pre: user is logged in; an article with a known title already exists (created via the happy-path test or seeded beforehand)
    - Steps: attempt to publish a second article using the exact same title, with a different description/body
    - Expect: `?` — needs confirmation against the live app before authoring: either (a) publish is blocked and a validation/conflict error is shown, keeping the user on the editor page, or (b) publish succeeds and the user lands on a distinct article page (different URL/slug) with both articles independently visible in the Global Feed. Write the assertion to match whichever behavior is observed — do not assume.

## Out of scope

- Concurrency (double-click Publish, two tabs publishing simultaneously) — not reliably testable through the UI without backend mocking, and low value for a content-creation form.
- Refresh/back-button mid-editing data loss — expected browser behavior, not a product bug; no meaningful assertion surface.
- Field length maximums (extremely long title/description/body) — no confirmed limit without reading source/API validation; would need live exploration to avoid guessing a boundary that doesn't exist.
- Deep-linking directly into `/editor` with a partially-completed draft state — Conduit's editor has no draft-persistence feature to test.
- Editing or deleting a published article, commenting, favoriting — belong to separate parent scenarios (article management, engagement), not this creation flow.

## Open questions

- Exact validation error message wording for missing title/description/body (cases 6–8) — confirm against the live app before writing assertions.
- Whether the tag input silently ignores empty/whitespace tag submissions (case 5) or requires explicit handling.
- Whether article title is trimmed/validated for whitespace-only input server-side (case 9).
- Exact behavior when an unauthenticated user tries to reach the editor — hidden nav link vs. server-side/route redirect (case 10).
- Whether publishing with a duplicate title is rejected or accepted with a distinct slug (case 11) — this determines the expected outcome and must be confirmed against the live app before authoring the test.
