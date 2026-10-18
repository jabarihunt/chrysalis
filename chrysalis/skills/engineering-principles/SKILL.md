---
name: engineering-principles
description: Design principles for code in a Chrysalis app, each with a test that tells whether code follows it. The database, backend, and frontend agents apply them while writing code, and the test and code review agents use them to judge it.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/principle-boundary-discipline/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Validating at system boundaries, trusting internal code, and keeping business logic in plain functions.
    - repo: cursor/plugins
      path: pstack/skills/principle-type-system-discipline/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Parsing external data into types at the boundary, distinct types for distinct meanings, and types derived from the schema.
    - repo: cursor/plugins
      path: pstack/skills/principle-model-the-domain/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Encoding the domain in a data structure instead of scattered conditions, and not forcing an abstraction.
    - repo: cursor/plugins
      path: pstack/skills/principle-minimize-reader-load/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Counting the layers and the state a reader must hold, and collapsing pass-through layers.
    - repo: cursor/plugins
      path: pstack/skills/principle-subtract-before-you-add/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Removing before adding, and building no code the spec doesn't ask for.
    - repo: cursor/plugins
      path: pstack/skills/principle-make-operations-idempotent/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Operations that reach the same end state however many times they run or wherever the last run stopped.
    - repo: cursor/plugins
      path: pstack/skills/principle-prove-it-works/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Checking the real result instead of a proxy.
    - repo: mattpocock/skills
      path: skills/engineering/codebase-design/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Deep modules with small interfaces, the deletion test, and adding a seam only when two implementations vary across it.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Eight principles combined into one skill for the builders and the reviewers, most ending in a test a reviewer can apply.
---

# Engineering principles

These principles keep an app easy to change slice after slice. Builders apply them while writing code. The test and code review agents judge code with the test that ends most of them. A breach is a judgment call that the code review gate reports as a smell, unless the stack profile or the ARD makes it a rule.

## Check input at the boundary, and trust it inside

Validate data where it enters the app: route handlers, form actions, environment variables, and replies from external services. Turn it into the app's own types there. Inside the app, trust those types, and don't check the same thing again.

Keep business logic in plain functions with no framework imports, and keep handlers thin: they parse input, call the logic, and shape the reply.

The test: does this check sit where data enters the app? If not, it's redundant. Could this logic be a plain function that the handler calls? If so, move it there.

## Let the types rule out bad states

- Turn outside data into typed values at the boundary. JSON bodies, form fields, query strings, and database rows have no trustworthy type until they're parsed.
- Give values with different meanings different types, even when both are strings underneath. A task ID and a user ID shouldn't be interchangeable.
- Derive types from the schema or contract that owns the shape, instead of writing a second copy by hand that can drift.

The test: can the code represent a state the domain forbids, such as a completed task with no completion date? If it can, change the type so it can't.

## Model the domain in data

Put the domain's rules in a structure instead of spreading them across conditions. Reach for:

- a set of named states with allowed moves between them, instead of several booleans that must stay in sync,
- a union of variants, or a lookup table, instead of an if-else chain that grows with every feature,
- a module that owns one part of the domain, instead of one module per step, such as load, check, and save.

Prefer plain code when the current shape is already clear and unlikely to grow.

The test: does this feature add one more branch to an existing chain, or a second flag that must match the first? Then the structure is missing.

## Hide a lot behind a small interface

A module is worth having when callers get a lot of behavior from a little interface. The interface is everything a caller must know: the arguments, the errors, the order of calls, and any setup.

- Delete the module in your head. If the complexity disappears, the module only passed calls through, and callers can call what's underneath. If the complexity reappears in every caller, the module earns its place.
- Add a seam, such as an interface with swappable implementations, only when two real implementations vary across it. One implementation behind an interface is a guess.

## Keep the reader's load low

A reader works out where a value comes from and what can change it. Make both quick.

- Collapse a layer that only forwards its arguments to the next one.
- Keep state as local as you can: a return value over a mutation, a local over a field, and a field over a module-level variable.
- Name an invariant once, where it's enforced, not in every caller.

The test: can a new reader find where a value comes from, and what can change it, in under a minute?

## Subtract before you add

Remove dead code and stale checks before you build on top of them. Build what the spec and the tests ask for, and nothing for cases nobody has asked about. Code nobody asked for still has to be read, tested, and kept working.

The test: does each new branch, option, and check trace to a criterion or an ARD requirement?

## Make operations safe to repeat

Migrations, background jobs, webhooks, and retries run twice and stop halfway. Write each one to read the current state, compare it with the goal, and apply only the difference. When a run stops partway, the next run must be able to tell that its leftovers are stale, whether that's a lock, a temporary file, or a half-written record.

The test: what happens when this runs twice in a row, and when the previous run stopped at any point? Both must end in the same state.

## Prove it on the real thing

Check the result itself before you call work done: run the feature, read the actual value, and read the diff. Compiling, a passing mock, or a report that says it works are signs, not proof.
