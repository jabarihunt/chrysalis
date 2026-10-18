---
name: tdd
description: How implementers write their own unit tests in red-green cycles, and what makes a test worth keeping. The database, backend, and frontend agents read it before writing code or tests.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/tdd/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: The red-green loop, testing through public interfaces at agreed seams, and the implementation-coupled, tautological, and horizontal anti-patterns.
    - repo: mattpocock/skills
      path: skills/engineering/tdd/tests.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: The examples of good and bad tests.
    - repo: mattpocock/skills
      path: skills/engineering/tdd/mocking.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Mocking only at system boundaries, and designing those boundaries so they're easy to replace in a test.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for Chrysalis, where the test agent writes the acceptance tests before any code and implementers run red-green for their own unit tests.
---

# Test-driven development

A slice has two kinds of test. The test agent writes the acceptance tests before any code exists, one per criterion, at the seams the spec names. They're frozen at the RED commit. You write your own unit tests, one at a time, in red-green cycles, as you build. This skill covers your unit tests.

## Run the loop one test at a time

1. Write one failing test for the next behavior.
2. Run it, and watch it fail for the reason you expect. A test that fails on a typo or a missing import hasn't tested anything yet.
3. Write the least code that makes it pass.
4. Run it, and watch it pass.

Then pick the next behavior. Each test answers what the last cycle taught you.

Writing all your unit tests first and then all the code tests the shape you imagined, not the behavior you built. The acceptance tests are the deliberate exception, because each one checks a criterion the human approved, not a guess about the code.

Write only the code the current test needs. A parameter, a branch, or an option no test asks for is code nobody checked.

Once a test passes, tidy the code you wrote for this slice. Leave existing code as it is unless the slice needs it changed.

## Test at the module's interface

Test each module the way its callers use it: through the functions, routes, or components it exposes. A good test reads like a statement of what the module does, such as "a task with a past due date shows as overdue", and it keeps passing when you rewrite the internals.

For the backend, test the plain functions that handlers call. For the frontend, test a component through what a user sees and does. For the database, test a constraint or a migration through the functions the stack profile gives your layer, such as a second insert with the same email failing.

## Spot a bad test

- It's coupled to the implementation. It mocks your own modules, tests a private function, or checks a result through a side channel, such as querying a table directly instead of reading through the module. It breaks when you refactor without changing behavior.
- It's tautological. The expected value is computed the way the code computes it, so the test can never disagree with the code. Use a literal from the spec or from a worked example.

```ts
// Tautological. It passes by construction.
expect(total(items)).toBe(items.reduce((sum, item) => sum + item.price, 0));

// A literal the test can disagree with.
expect(total([{ price: 10 }, { price: 5 }])).toBe(15);
```

- It doesn't fail when it should. The [test gate](../../workflow/gates.md#test) reads each new unit test and asks whether it would fail if every imported function returned `undefined`. Ask the same question before you commit.

## Mock only at system boundaries

Replace only what the app doesn't control: external services such as payments and email, the clock, and randomness. Prefer the stack's test database over a mocked one. Never mock your own modules, because the test then checks the mock instead of the code.

Make those boundaries easy to replace:

- Pass the dependency in, so a test can hand over a fake. A function that builds its own payment client can't be tested without the real one.
- Give each external call its own function, such as `getUser` and `createOrder`, instead of one generic `fetch` wrapper. Each fake then returns one shape, with no branching in the test setup.
