---
description: Playwright E2E test authoring conventions - locators, assertions, waiting, test structure, naming, code style, actions, and form interactions
paths: [tests/**, playwright-utils/**]
---

# Playwright Scripting Rules

## Locators

### Locator Priority (Highest to Lowest)

1. **`getByRole`** — buttons, links, headings, textboxes, checkboxes (primary approach)
2. **`getByLabel`** — form inputs with associated labels
3. **`getByText`** — static text content, link text
4. **`getByPlaceholder`** — when label is absent
5. **`getByTestId`** — when semantic selectors can't produce a unique, reliable locator. When `data-testid` is needed but doesn't exist in the source code, **add it to the application component source code** rather than using a fragile alternative locator. Exhaust role, label, text, and placeholder options first — but **always prefer adding `data-testid` over using CSS selectors based on styling classes or structural paths**.
6. **CSS selector** (`page.locator(...)`) — lowest priority. Acceptable **only** for stable HTML tags used as structural scoping (e.g., `header`, `nav`, `section`, `footer`). **Never use CSS class names** (`.font-bold`, `.grid > div`, `.text-4xl`) as locators — add a `data-testid` to the source code instead.

```typescript
// GOOD: role-based (survives UI refactoring)
page.getByRole('textbox', { name: 'email' })
page.getByRole('button', { name: 'Login', exact: true })
page.getByRole('link', { name: 'Sign up' })
page.getByRole('heading', { name: 'Login to your account' })

// GOOD: label-based for form fields
page.getByLabel('Email')
page.getByLabel('Password')

// GOOD: CSS selector for structural scoping (stable tag/attribute)
page.locator('header').getByRole('link', { name: 'Products' })

// BAD: CSS selectors based on styling (break on design changes)
page.locator('.bg-destructive')
page.locator('div > form > input:first-child')
```

### Common ARIA Roles for getByRole

Only use roles that actually exist on the page. Some HTML elements have **implicit roles** that depend on context:

| Role | HTML Element | Notes |
|------|-------------|-------|
| `button` | `<button>`, `<input type="submit">` | Always works |
| `link` | `<a href="...">` | Must have `href` |
| `heading` | `<h1>`–`<h6>` | Use `{ level: 1 }` to target specific level |
| `textbox` | `<input type="text">`, `<textarea>` | Also `type="email"`, `type="password"` |
| `checkbox` | `<input type="checkbox">` | Always works |
| `combobox` | `<select>` | Always works |
| `navigation` | `<nav>` | Always works — **use this to scope to nav menus** |
| `dialog` | Modals, sheets, drawers (component libraries) | Set via `role="dialog"` attribute |
| `tab` | Tab components (component libraries) | Set via `role="tab"` attribute |
| `table`, `row`, `cell` | `<table>`, `<tr>`, `<td>` | Always works |
| `article` | `<article>` | Always works |
| `banner` | `<header>` | **Only when `<header>` is a direct child of `<body>`** — does NOT work when nested inside `<section>`, `<article>`, `<aside>`, `<main>`, or `<nav>` |
| `contentinfo` | `<footer>` | Same rule as `banner` — only as direct child of `<body>` |
| `region` | `<section>` | **Only when `<section>` has an accessible name** (via `aria-label` or `aria-labelledby`) |

**When `getByRole('banner')` or `getByRole('contentinfo')` won't match** (common case — header/footer nested inside sections), use a CSS selector instead:

```typescript
// BAD: header is nested inside <section>, so 'banner' role doesn't apply
page.getByRole('banner').getByRole('link', { name: 'Blog' })

// GOOD: CSS selector for the <header> element
page.locator('header').getByRole('link', { name: 'Blog' })

// GOOD: scope to <nav> which always has 'navigation' role
page.getByRole('navigation').getByRole('link', { name: 'Blog' })
```

### Locator Text Must Match Source Code Exactly

When reading application source code to build locators, use the **exact text** from the code. Never assume or paraphrase element text. Also watch for **responsive variants** — the same component may render different text or different elements at different viewport sizes (e.g., mobile vs desktop via Tailwind `hidden md:flex` classes). Match the variant that is **visible at the test viewport** (Desktop Chrome by default).

```typescript
// Source has two buttons: "View Details" (mobile) and "Details" (desktop)
// Tests run in Desktop Chrome — use the desktop-visible text

// GOOD: matches the desktop-visible element
page.getByRole('button', { name: 'Details' })

// BAD: matches the mobile element hidden at desktop viewport
page.getByRole('button', { name: 'View Details' })
```

### Locator Uniqueness

Locators used with action methods (`click()`, `fill()`, `check()`, `selectOption()`) **must resolve to exactly one element**. Before writing a locator, check the application source code to verify the selector is unique on the page. If multiple elements match, narrow the scope by chaining with a parent locator.

When a locator intentionally returns multiple elements (e.g., collecting a list of menu items, table rows, or card elements for iteration), uniqueness is not required — use `all()`, `count()`, or `nth()` as needed.

```typescript
// GOOD: scoped to navigation — resolves to one element
page.getByRole('navigation').getByRole('link', { name: 'Products' })

// BAD: matches multiple elements on the page — click() will fail
page.getByRole('link', { name: 'Learn More' })

// GOOD: intentionally working with a collection
const articles = await page.getByRole('article').all()
await expect(articles).toHaveCount(3)
```

### Scoping to Containers (Avoiding False Positives)

When a page has repeated UI patterns (pricing cards, product rows, list items), **always scope interactions and assertions to the specific container** — never rely on `.first()` or unscoped locators that could accidentally match an element from a different section.

A false positive occurs when the intended element is missing but the locator silently matches a different element elsewhere on the page, making the test pass incorrectly.

```typescript
// BAD: clicks the first "Add to Cart" on the page — may not be inside the first card
page.getByRole('button', { name: 'Add to Cart' }).first().click()

// GOOD: scope to the specific pricing card, then find the button within it
// (add data-testid="pricing-card" to the source code if it doesn't exist)
const firstCard = page.getByTestId('pricing-card').nth(0)
await firstCard.getByRole('button', { name: 'Add to Cart' }).click()

// BAD: asserts price anywhere in the dialog — could match the total instead of the item price
await expect(page.getByRole('dialog')).toContainText('$99')

// GOOD: scope to the cart item's price element via data-testid
// (add data-testid="cart-item-price" to the source code if it doesn't exist)
await expect(page.getByRole('dialog').getByTestId('cart-item-price')).toContainText('$99')

// BAD: asserts button visibility anywhere on the page
await expect(page.getByRole('button', { name: 'View Cart' }).first()).toBeVisible()

// GOOD: asserts button within the specific card
await expect(firstCard.getByRole('button', { name: 'View Cart' })).toBeVisible()
```

**Rule of thumb:** if a locator uses `.first()`, `.nth()`, or matches a generic label like "Remove", "Add to Cart", "Submit" — it likely needs a parent scope to be precise. When the parent container has no semantic role or unique text, **add a `data-testid`** to the source code rather than using CSS class selectors.

### Semantic Scoping (Asserting Relationships)

Scoping is not only about disambiguating repeated elements — it also validates that elements appear in the **correct logical context**. Even when a text or element is unique on the page, scope it to its meaningful parent section if the test is verifying a relationship between elements.

**Key question:** "If this value moved to a different section of the page, would that be a bug?" If yes — the assertion must include a scope that pins it to the correct section.

**How to identify scoping opportunities:**
1. Read the page source to understand sections, cards, and containers
2. For each assertion, identify which section or component the value logically belongs to
3. Build a locator chain that starts from the nearest meaningful parent (a container with unique text, a `data-testid`, or a semantic role)
4. Use `.filter()` with `hasText` or `has` to express parent-child relationships between elements

```typescript
// Page has a "Summary" section and a "Details" card that both display counts

// BAD: asserts text exists anywhere — passes even if it appeared in the wrong section
await expect(page.getByText('3 of 5 completed')).toBeVisible()

// GOOD: scoped to the section where this count belongs
await expect(page.getByTestId('summary-panel')).toContainText('3 of 5 completed')

// A user's tag shows an "Owner" badge. Other users' tags do not.

// BAD: "Owner" anywhere on the page is accepted — doesn't verify it's attached to the right user
await expect(page.getByText('Owner')).toBeVisible()

// GOOD: scoped to the specific user's tag — verifies the badge belongs to the correct user
const ownerTag = page.getByTestId('user-tag').filter({ hasText: ownerEmail })
await expect(ownerTag).toContainText('Owner')

// A team member was added to a specific project card, not just anywhere on the page

// BAD: asserts the member exists somewhere on the page
await expect(page.getByText(memberEmail)).toBeVisible()

// GOOD: scoped to the project card — confirms the member is in the right project
const projectCard = page.getByTestId('project-card').filter({ hasText: 'Project Alpha' })
await expect(projectCard.getByText(memberEmail)).toBeVisible()
```

### Cross-Page Content Linking

When a user action navigates from one page to another, and the destination page displays content related to the source page (e.g., clicking a product card opens that product's detail page), **capture a value from the source page and assert it on the destination page**. This validates the user landed on the correct page — not just any page of the same type.

**Key question:** "How do I know the user arrived at the *right* destination, not just *a* destination of the same kind?" If a heading, title, or label from the source page should appear on the destination — capture it before navigating and assert it after.

```typescript
// User clicks on an item in a list → opens its detail page

// BAD: asserts any h1 exists — passes even if the wrong item opened
await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

// BAD: asserts a feature only present on detail pages — confirms the page type but not which item
await expect(page.getByRole('button', { name: 'Add to Favorites' })).toBeVisible()

// GOOD: capture item name from source page, assert it on destination
const itemNameValue = await listItem.getByRole('heading').textContent()
await listItem.getByRole('link', { name: 'View Details' }).click()
await expect(page.getByRole('heading', { level: 1, name: itemNameValue!.trim() })).toBeVisible()
```

This pattern applies whenever navigation creates a logical link between pages: clicking a list item → detail page, clicking an article title → article page, clicking an order row → order detail, etc.

### Chaining and Filtering

Prioritize the built-in `name` or `hasText` argument on the locator constructor for filtering. Use `.filter()` only when a **second level** of filtration is needed on an already-constructed locator.

```typescript
// GOOD: use name argument for role-based filtering (preferred)
page.getByRole('button', { name: 'Submit' })
page.getByRole('link', { name: 'Courses' })
page.getByRole('heading', { name: 'Dashboard' })

// GOOD: use hasText option on CSS locator constructor
page.locator('section', { hasText: 'About the Team' })
page.locator('section', { has: page.getByRole('heading', { name: 'About the Team' }) })

// GOOD: chain to narrow scope
page.getByRole('navigation').getByRole('link', { name: 'Products' })
page.locator('section', { hasText: 'Featured Items' }).getByRole('link', { name: 'View All' })

// GOOD: .filter() for second-level filtration on an existing locator
page.getByRole('row', { name: 'John' }).filter({ has: page.getByRole('cell', { name: 'Active' }) })

// BAD: using .filter() when constructor option suffices
page.locator('section').filter({ hasText: 'About the Team' })
page.getByRole('button').filter({ hasText: 'Submit' })

// BAD: using index when text-based scoping is possible
page.locator('section').first()
```

## Assertions

### Locator Assertions (Auto-Retrying)

Locator assertions poll until the condition is met or timeout. Always prefer these.

```typescript
// GOOD: assert text content on a unique element
await expect(page.getByRole('heading')).toHaveText('Dashboard')
await expect(page.locator('header')).toContainText('Welcome back')

// GOOD: assert element state
await expect(page).toHaveURL('/dashboard')
await expect(page.getByRole('textbox', { name: 'email' })).toHaveValue('test@example.com')
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled()
await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled()
await expect(page.getByRole('listitem')).toHaveCount(5)

// GOOD: toBeVisible when unique locator via text is not compact
await expect(page.getByRole('button', { name: 'John Doe' })).toBeVisible()
```

Prefer `toHaveText` / `toContainText` on a unique locator over `getByText(...).toBeVisible()` — it asserts the content directly rather than checking visibility of a text match.

### Generic Assertions (No Retry)

Overall, avoid using Generic Assertions.

```typescript
// BAD: generic assertion — no retry, race condition prone
const text = await page.textContent('.header')
expect(text).toBe('Dashboard')

// BAD: manual check — does not retry
const isVisible = await page.locator('.toast').isVisible()
expect(isVisible).toBe(true)
```

### Negative Assertions

After an action that triggers a DOM change (click, fill, etc.), add a dynamic wait **before** the negative assertion to avoid false positives. The DOM may not have updated yet when the assertion runs.

```typescript
// GOOD: wait for API to complete before asserting absence
await page.getByRole('button', { name: 'Delete' }).click()
await page.waitForResponse(resp =>
  resp.url().includes('/api/') && resp.status() === 200
)
await expect(page.getByRole('dialog')).not.toBeVisible()

// GOOD: verify element was removed from DOM
await expect(page.getByRole('dialog')).toBeHidden()
```

### No Soft Assertions

Do not use `expect.soft()`. Every assertion should fail the test immediately.

## Waiting

### Playwright Auto-Waits on Actions

`click()`, `fill()`, `check()`, `selectOption()` — all auto-wait for the element to be actionable AND auto-scroll to it. Do NOT add explicit waits or `scrollIntoViewIfNeeded()` before actions.

```typescript
// GOOD: auto-waits for element to be ready
await page.getByRole('button', { name: 'Submit' }).click()

// BAD: redundant wait
await page.getByRole('button', { name: 'Submit' }).waitFor()
await page.getByRole('button', { name: 'Submit' }).click()
```

### When You Need Explicit Waits

Add explicit waits only before steps that do **not** have built-in auto-waiting. Action methods (`click()`, `fill()`, `check()`) and locator assertions (`toBeVisible()`, `toHaveText()`) all auto-wait — no explicit wait needed before them.

Methods that **require** a preceding explicit wait (they resolve instantly, no auto-wait):
- `all()`, `count()`, `allTextContents()`, `textContent()`, `inputValue()`

```typescript
// GOOD: locator assertion auto-waits after navigation — no waitForURL needed
await page.getByRole('link', { name: 'Blog' }).click()
await expect(page.getByRole('heading', { name: 'Latest Articles' })).toBeVisible()

// BAD: redundant waitForURL when next step is a locator assertion
await page.getByRole('link', { name: 'Blog' }).click()
await page.waitForURL('**/blog')  // unnecessary — the assertion below already waits
await expect(page.getByRole('heading', { name: 'Latest Articles' })).toBeVisible()

// GOOD: wait for API before using non-auto-waiting methods
await page.waitForResponse(resp =>
  resp.url().includes('/api/') && resp.status() === 200
)
const items = await page.getByRole('listitem').all()

// GOOD: wait for specific network request to complete
const responsePromise = page.waitForResponse(resp =>
  resp.url().includes('/api/') && resp.status() === 200
)
await page.getByRole('button', { name: 'Save' }).click()
await responsePromise

// GOOD: wait for element state
await page.getByRole('dialog').waitFor({ state: 'hidden' })
```

### Never Use Arbitrary Timeouts

```typescript
// BAD: slow, unreliable, hides real issues
await page.waitForTimeout(3000)
```

Rely on the natural flow of action methods (`click()`, `fill()`) and locator assertions instead of arbitrary waits.

### No Custom Timeouts by Default

Always rely on the default timeouts configured in `playwright.config.ts`. Do not add custom timeouts to:
- `test.setTimeout()` — do not override the test-level timeout
- `toBeVisible({ timeout: ... })` — do not add timeout to assertions
- `waitForURL(..., { timeout: ... })` — do not add timeout to URL waits
- Any other method that accepts an optional `timeout` parameter

Custom timeouts are allowed **only as a debugging fix** — when the test fails due to a timeout and investigation confirms the default timeout is genuinely insufficient for that step. Never add them preemptively in the first draft of a test.

```typescript
// BAD: preemptive timeout in first draft
await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible({ timeout: 30000 })

// GOOD: use default timeout
await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible()
```

## Test Structure

### Naming Convention

Test names describe **user behavior**, not implementation details.

```typescript
// GOOD: describes what the user does and expects
test('User can log in with valid credentials', ...)
test('User sees error for invalid password', ...)
test('Student can enroll in a free course', ...)
test('Admin can create a new course', ...)

// BAD: describes implementation
test('test login', ...)
test('POST /api/auth should return 200', ...)
test('LoginForm component renders', ...)
```

### Always Start from the Home Page

Every test must start from the home page (`/`). Never navigate directly to inner pages like `/login` or `/register` — the user journey always begins at home. Use UI interactions (clicking links, buttons) to reach the target page.

```typescript
// GOOD: starts from home, navigates via UI
test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('User can log in with valid credentials', async ({ page }) => {
  await page.getByRole('link', { name: 'Log In' }).click()
  // ... fill form and assert
})

// BAD: navigates directly to inner page
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
})
```

### Grouping with describe

```typescript
test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('User can log in with valid credentials', async ({ page }) => { ... })
  test('User sees error for invalid password', async ({ page }) => { ... })
  test('User can navigate to forgot password', async ({ page }) => { ... })
})
```

### One Logical Flow Per Test

Each test should verify one user journey or behavior. Avoid combining unrelated assertions.

```typescript
// GOOD: focused test
test('User can log in with valid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'email' }).fill('user@example.com')
  await page.getByRole('textbox', { name: 'password' }).fill('Password123!')
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('button', { name: 'John Doe' })).toBeVisible()
})

// BAD: tests multiple unrelated things
test('login page', async ({ page }) => {
  // tests login, then navigation, then profile, then logout...
})
```

## Test Code Style

### Locator Constants

Extract locators into constants **only** when:
- The locator is **repeated 3+ times** in the test
- The locator is **not self-descriptive** (e.g., relies on CSS selectors with no readable context) AND is used **2+ times**

Do NOT extract locators into constants when:
- The locator is **self-descriptive** (has `name`, `hasText`, or other readable arguments) AND is used only **1–2 times**
- The constant is only used as an **intermediate step** to build another locator — inline the chain instead

```typescript
// BAD: unnecessary constant — locator is self-descriptive and used twice
const tableOfContentsNav = page.locator('nav', { hasText: 'Table of contents' })
await expect(tableOfContentsNav).toBeVisible()
const items = await tableOfContentsNav.getByRole('link').allTextContents()

// GOOD: inline the self-descriptive locator
await expect(page.locator('nav', { hasText: 'Table of contents' })).toBeVisible()
const tocLinkTexts = await page.locator('nav', { hasText: 'Table of contents' }).getByRole('link').allTextContents()

// BAD: intermediate constants used only to build the next constant
const pricingSection = page.locator('#pricing')
const pricingCards = pricingSection.getByTestId('pricing-card')
const firstCard = pricingCards.nth(0)

// GOOD: inline the chain
const firstCard = page.getByTestId('pricing-card').nth(0)

// GOOD: constant justified — opaque CSS selector with no readable context, used 2+ times
const authorAvatar = page.locator('main header [class*="rounded-full"]')
```

### `data-testid` Naming

`data-testid` values must name the **element** (a noun like `button`, `badge`, `checkmark`, `input`, `dialog`), not just a state or action. Use the form `<subject>-<descriptor>-<element>` so the locator is self-explanatory without reading the source.

```typescript
// BAD: ends with an action/state — doesn't say what element this is
page.getByTestId('lesson-completed')

// GOOD: includes the element (checkmark) that the testid points to
page.getByTestId('lesson-completed-checkmark')
```

### Reuse Locator Constants

Locators are lazy — they re-resolve against the current DOM on every use. Reuse the same constant across all phases of the test (including after navigation or data refreshes). Do not re-declare the same locator under variant names like `*AfterUpdate`, `*AfterRevert`.

```typescript
// BAD
const courseCard = programCard.getByRole('link', { name: courseNameValue })
// ... navigate away and back ...
const courseCardAfterUpdate = programCard.getByRole('link', { name: courseNameValue })

// GOOD — reuse the existing constant
const courseCard = programCard.getByRole('link', { name: courseNameValue })
// ... navigate away and back ...
await expect(courseCard).toBeVisible()
```

### Variable Naming

Use **descriptive names** — no abbreviations or acronyms. The name should make the variable's purpose immediately clear without needing to read its assignment.

Name the variable after **what it holds**, not what the locator targets. When a method like `allTextContents()`, `textContent()` or `inputValue()` extracts text values, the variable name should end with **`Values`** or **`Texts`** — not `Links`, `Headings`, etc. Reserve element-type names for variables holding locators.

```typescript
// BAD: abbreviations
const tocNav = page.locator('nav', { hasText: 'Table of contents' })
const tocItems = await tocNav.getByRole('link').allTextContents()

// BAD: "Links" and "Subheadings" imply locators, but these hold text strings
const tableOfContentsLinks = await page.locator('nav', { hasText: 'Table of contents' }).getByRole('link').allTextContents()
const articleSubheadings = await page.getByRole('article').getByRole('heading', { level: 2 }).allTextContents()

// GOOD: "Values" suffix reflects that allTextContents() returned strings
const tableOfContentsValues = await page.locator('nav', { hasText: 'Table of contents' }).getByRole('link').allTextContents()
const articleSubheadingValues = await page.getByRole('article').getByRole('heading', { level: 2 }).allTextContents()

// GOOD: locator variable — element-type name is appropriate
const tableOfContentsLinks = page.locator('nav', { hasText: 'Table of contents' }).getByRole('link')
```

## Actions

### Repeated Clicks on the Same Element

When the same element needs to be clicked multiple times in a row (e.g., bumping a quantity selector, stepping through a counter), pass `clickCount` to a single `click()` call instead of repeating the line.

```typescript
// BAD: repeated click lines on the same element
await page.getByRole('button', { name: 'Increase quantity' }).click()
await page.getByRole('button', { name: 'Increase quantity' }).click()

// GOOD: single call with clickCount
await page.getByRole('button', { name: 'Increase quantity' }).click({ clickCount: 2 })
```

This rule applies only when the **exact same locator** is clicked consecutively with no other actions or assertions between the clicks. If the target element may change, disappear, or be replaced between clicks (e.g., the button becomes disabled after hitting a max), keep the clicks on separate lines so each one re-resolves the locator.

## Form Interactions

```typescript
// Text input
await page.getByRole('textbox', { name: 'email' }).fill('user@example.com')

// Password input
await page.getByLabel('Password').fill('password123')

// Select dropdown
await page.getByRole('combobox', { name: 'Country' }).selectOption('US')

// Checkbox
await page.getByRole('checkbox', { name: 'Remember me' }).check()

// Retype — fill() clears existing value automatically, no need for clear()
await page.getByRole('textbox', { name: 'search' }).fill('new query')

// Type character by character (for autocomplete/debounce)
await page.getByRole('textbox', { name: 'search' }).pressSequentially('query', { delay: 100 })
```
