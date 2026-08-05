# Coverage Plan: Edit and Delete Own Article

**Actor:** Signed-in user (regular authenticated Conduit user — same role as existing `login.spec.ts` / `create-article.spec.ts`, credentials via `CONDUIT_USER_EMAIL` / `CONDUIT_USER_PASSWORD`)
**Feature area:** Article management — editing and deleting an article the signed-in user authored
**Primary goal:** A signed-in user can modify the content of their own published article, and separately, permanently remove their own published article, with both outcomes visibly reflected in the UI.
**Suggested files:**
- `tests/ui/edit-article.spec.ts` (new)
- `tests/ui/delete-article.spec.ts` (new)

(Two files, not one, to match the existing one-flow-per-file convention set by `create-article.spec.ts` / `login.spec.ts`.)

**Existing related tests:**
- `user can publish an article with title, description, body and two tags, and see it in the Global Feed` (`tests/ui/create-article.spec.ts`) — covers creation only, not edit or delete.
- No existing edit or delete article coverage anywhere in the repo (confirmed — no `ArticlePage`/editor POM, no API article client, no article-related API tests).

## Assumptions

- Conduit's editor (`/editor` for create, `/editor/:slug` for edit) is the same form for both create and update, and the article view page shows author-only **"Edit Article"** and **"Delete Article"** controls when the signed-in user is the article's author — this matches the standard RealWorld reference app, but the exact locators are **unverified** since this repo doesn't vendor Conduit's frontend source (per `CLAUDE.md`: "Application source code is not part of this repository"). Whoever implements the tests must confirm exact accessible names against the live app (e.g. via `pw-new-test-cli`'s live snapshot inspection) before finalizing locators.
- Delete redirects to the home page (`/`) and removes the article from the Global Feed — standard RealWorld behavior, unverified against the live app.
- Only one test user account is available (`CONDUIT_USER_EMAIL`/`CONDUIT_USER_PASSWORD`). Ownership/authorization checks ("a different user can't edit/delete this article") are not testable without a second account — flagged under Open Questions.
- Both tests set up their own article as an arrange step (create it via the UI at the start of the test) rather than depending on seeded/shared data, matching the isolation style of `create-article.spec.ts`.

## Reuse & extraction notes

**Reuse as-is:**
- `pom.loginPage.signInWithCredentials(email, password)` (`playwright-utils/pages/login-page.ts`) for authentication — already POM-based, used by `login.spec.ts`.
- The `test.skip(!email || !password, '...')` env-var guard pattern used identically in `login.spec.ts`, `create-article.spec.ts`, and `tests/api/auth.spec.ts`.
- Confirmed stable locators from `create-article.spec.ts` for the create/edit article form:
  - `getByPlaceholder('Article Title')`
  - `getByPlaceholder("What's this article about?")`
  - `getByPlaceholder('Write your article (in markdown)')`
  - `getByPlaceholder('Enter tags')` + `.press('Enter')` per tag
  - `getByRole('button', { name: 'Publish Article' })`
  - `getByRole('heading', { name: articleTitle })` / `page.locator('p', { hasText: articleBody })` / `getByText(tagName, { exact: true })` for post-publish verification
  - `getByRole('link', { name: 'New Article' })`, `getByRole('link', { name: 'Home' })`, `getByText('Global Feed', { exact: true })` for navigation

**Duplication this work introduces (extraction candidate, not yet extracted):**
- Both new tests need to reach a "my own published article" starting state — today that fill-and-publish sequence exists only inline in `create-article.spec.ts` (not POM-based). Once a second and third consumer (edit test, delete test) need the same sequence, it crosses the project's "extract after 2+ real consumers" bar (`.claude/rules/playwright-architecture.md`). Recommend introducing an article editor Page Object at implementation time (not in this plan) covering the fill-and-publish flow shared by create and update — exact class/method boundaries are an implementation-phase decision, not finalized here, since the editor form is identical for create vs. edit but is reached via a different page each time (page-boundary rule applies).
- Whether to also retrofit `create-article.spec.ts` onto the same new POM is a judgment call for implementation time — out of scope for this plan per "don't modify unrelated files."

**Needs to be built new (nothing exists yet):**
- No article view/editor Page Object exists (`playwright-utils/pages/` currently has only `login-page.ts`).
- No API article client exists (`playwright-utils/api/` has `auth-api.ts`, `tags-api.ts`, `user-api.ts` only) — this plan defaults to **UI-based article setup** (reusing the proven creation flow) rather than adding a new `ArticlesApi` client, to keep this change small and avoid introducing API infrastructure not requested. Faster API-based setup is noted as a future option, not part of this plan.

## Test-data requirements

- Each test generates a unique article title (e.g. `Date.now()`-suffixed, matching `create-article.spec.ts`'s pattern) to avoid collisions with other runs/parallel workers in the shared live Global Feed.
- Edit test additionally needs a distinct "updated" title/description/body/tag set to prove the change actually took effect (not just re-asserting the same values).

## Cleanup requirements

- No cleanup mechanism exists in the repo today — `create-article.spec.ts` already leaves its published article on the live site permanently (confirmed, no `afterEach`/teardown anywhere).
- The **delete test's own action is its cleanup** — it removes the article it created as part of the test itself.
- The **edit test has no natural cleanup** — it will permanently leave an (edited) article on the live Global Feed, same as the existing create test does today. Recommend the edit test end with an explicit deletion step (reusing whatever delete flow the delete test introduces) purely for hygiene, rather than a new fixture/teardown mechanism — flagged as an open question below since it's a judgment call, not required to match existing precedent.

## Test cases

### Happy path

1. **Signed-in user can edit their own article** — user changes an existing article's title, description, body, and tags, and sees the updated content. _(P0)_
   - Pre: User is signed in; user has published an article (created as part of this test's arrange step).
   - Steps:
     - Sign in and publish an article (arrange step, reusing the creation flow).
     - From the published article's page, open the edit view for that article.
     - Change the title, description, body, and tags to new values.
     - Submit the update.
   - Expect:
     - The article page shows the new title, new body text, and new tags — old tag(s) are no longer present.
     - Navigating to the Global Feed shows the new title; the old title is not present there.

### Edge cases

2. **Signed-in user can edit their own article changing only the tags** — tag list fully replaced (old tags removed, new tags added), title/body unchanged. _(P1)_
   - Pre/Steps/Expect: same arrange as case 1; only tags are modified; article page reflects new tags only, old tags gone, title/body unchanged.

3. **Edited article reflects the update after navigating away and back** — user edits the article, navigates to Global Feed, then reopens the article from the feed. _(P1)_
   - Pre: article already edited (case 1 flow).
   - Steps: from Global Feed, click into the edited article's title (cross-page content linking — capture title from feed, assert same title + updated body on the detail page).
   - Expect: detail page shows the updated content, confirming the change persisted server-side, not just client-side state.

### Negative cases

4. **Signed-in user can delete their own article** — user permanently removes an article they authored. _(P0 — listed here as it's the second parent scenario; not a "negative" case in the traditional sense, structurally it's a second happy path)_
   - Pre: User is signed in; user has published an article (arrange step).
   - Steps:
     - Sign in and publish an article.
     - From the published article's page, trigger delete.
   - Expect:
     - User lands on the home page.
     - The deleted article's title is no longer present in the Global Feed.

5. **Deleted article is gone after revisiting the feed** — after deleting, user browses the Global Feed and confirms the article doesn't reappear. _(P1)_
   - Pre: article already deleted (case 4 flow).
   - Steps: click the Global Feed tab.
   - Expect: deleted article's title is absent from the feed listing.

## Out of scope

- **Non-owner cannot see/use Edit or Delete controls on someone else's article** — valid and valuable authorization check, but not testable with only one configured test account (`CONDUIT_USER_EMAIL`/`CONDUIT_USER_PASSWORD`); would need a second account.
- **Empty/invalid field validation while editing** (e.g. clearing the title) — no confirmed validation behavior in this repo (no frontend source); would require live-app inspection to know if it's even reachable/observable, and isn't part of the two requested scenarios.
- **API-based article creation/cleanup (new `ArticlesApi` client)** — would speed up and isolate setup, but is new infrastructure beyond what's needed for two UI tests; noted as a future improvement, not this plan.
- **Concurrency (double-click delete, two tabs)** — low value for this app, no clear UI surface to test reliably.
- **Direct URL access to a deleted article (404 handling)** — would require direct navigation to an inner page, which conflicts with the project's "always start from the home page" rule unless reached via an in-app action (e.g. back button); the back-button variant is covered speculatively under Open Questions instead of committed here.

## Open questions

- Should the edit test explicitly delete the article it creates at the end, for hygiene (since a delete flow will now exist), even though `create-article.spec.ts` sets the precedent of not cleaning up? Recommend yes, but flagging since it's not required to match existing repo convention.
- Is a second test account available (or worth adding) to cover the non-owner authorization checks noted under Out of Scope? If so, these should become P1 negative cases in a follow-up plan.
- Worth confirming: does clicking "Delete Article" show a confirmation step, or does it delete immediately? This changes the exact click sequence in the delete test and is unverified without live-app inspection.
- Pressing the browser back button after deleting an article, then refreshing — does the app show a 404/error state, or something else? If it's a real, simple, reachable user action (not a direct `goto()`), it could be added as a P2 edge case at implementation time once verified.
