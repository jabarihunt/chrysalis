---
name: acceptance-testing
description: How to turn a slice's approved criteria into Playwright acceptance tests that fail before the feature exists and prove it once it does. The test agent reads it for RED and the test gate, and the code review agent reads it for the RED review.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/principle-test-behavior-not-implementation/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Judging a test by two imagined edits, one that breaks the behavior and one that changes only the internals, the usual reasons a test passes on broken code, asserting exactly what the contract promises, and showing that a check for something that didn't happen can see it happen.
    - repo: mattpocock/skills
      path: skills/engineering/tdd/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Testing only at agreed seams, and taking expected values from an independent source such as the spec.
    - repo: mattpocock/skills
      path: skills/engineering/tdd/tests.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Checking a result through the interface instead of a side channel.
    - repo: cursor/plugins
      path: pstack/skills/create-verification-skill/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Driving the real user path instead of test-only endpoints, finding elements by stable handles such as accessible names, and waiting until the app is usable rather than merely running.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis RED, where the test agent writes one Playwright test per approved criterion before any code exists, and the tests are frozen at the RED commit.
---

# Acceptance testing

Each acceptance test is one approved criterion turned into code. Its Given becomes the setup, its When becomes one action at the seam the spec names, and its Then becomes the assertion. You write the tests before the feature exists, the implementers work until they pass, and nobody changes them after the RED commit. A weak test here lets a broken feature through every later gate.

## Reach the app through the criterion's seam

The seam is where the test touches the app, and the spec names one for each criterion.

- A page seam means the test opens the page and uses it as a person does, with clicks, typing, and navigation.
- A route seam means the test calls the route with Playwright's `request` fixture, the way a client of the route does.

Stay at the named seam for both the When and the Then. A test that checks a page criterion by calling the route behind the page passes even when the page never shows the result.

## Set up the Given through the app

- Build each test's starting state through the app's own pages or routes, or with the fixtures the stack profile provides. Writing rows straight into the database skips the code that a real user's data passes through.
- Give each test its own data, such as a unique email per test, so each test gives the same result in any order and in parallel. A test that relies on another test's leftovers fails when it runs alone.
- Wait until the app is usable before the When, not just until it responds. Wait for what a person would wait for, such as a heading or a loaded list, and never for a fixed number of milliseconds.
- Pin anything that varies between runs. Use Playwright's clock for dates and times, and fixed values for anything random.

## Drive it the way its users do

- Find elements the way a person does: by role and accessible name, by label, or by visible text. Use a test ID only when the element has no accessible name. CSS classes, DOM position, and coordinates change whenever the markup does.
- Perform the When as the real action. Test-only routes, internal setters, and a URL that skips the steps a user takes all prove less than the criterion asks.
- When the When acts on something the feature adds, such as a new button, assert that it's visible before you act on it. Otherwise, at RED, the test fails on the action's timeout, and `check.ts --red` counts that as an error before an assertion.

## Assert exactly what the Then line promises

- Copy each expected value from the spec as a literal. An expected value computed the way the feature will compute it agrees with the feature by construction, even when both are wrong.
- Match the Then line's strength. An assertion looser than the line, such as checking that a badge is visible when the line says it reads "Overdue", passes a broken feature. An assertion stricter than the line, such as matching the whole page's text, fails a correct feature on wording the spec never fixed.
- Assert the right value, not the absence of a wrong one. `not.toHaveText("$0.00")` passes for every other wrong total.
- Check an effect where the criterion says someone sees it. "The task is still there after a reload" means reload the page and read the list, not query the table.
- A Then line that says something doesn't happen passes trivially when the test looks in the wrong place. In the same test, confirm that the place you look is live, such as the list having loaded, before you assert the item isn't in it.

## Judge each test with two edits

Before you commit a test, picture the finished feature and two changes to it.

1. Break the behavior. The feature returns a wrong value, skips its effect, or does it twice. The test must fail. When it would still pass, it proves nothing. The usual reasons are an assertion looser than the Then line, an expected value computed instead of copied, and an assertion on data the test created rather than data the app returned.
2. Change only the internals. The pages and responses stay the same, and someone rewrites the code underneath. The test must still pass. When it would fail, it's tied to the implementation, usually through a CSS selector, a private route, or a database read.

Keep a test that fails the first edit and survives the second, and rewrite the others before the RED commit. The code review agent applies the same two edits in the RED review. At the test gate, apply them to each new unit test too. The [test gate's](../../workflow/gates.md#test) check that a test fails when every import returns `undefined` is the first edit in its simplest form.

## Watch each test fail for the right reason

1. Run the slice's tests. Each one must fail on its assertion, because the behavior is missing.
2. Read every failure message. A failure in setup, a missing fixture, or a timeout before the first assertion says nothing about the criterion. Fix the test until the failure is the assertion.
3. Run the tests a second time. Each one must fail the same way. A failure that changes between runs comes from timing or leftover state, and nobody can trust the test once the feature exists.

You're done when every test fails on its assertion in both runs, each failure message shows what the criterion expected, and your report lists each test with its message.
