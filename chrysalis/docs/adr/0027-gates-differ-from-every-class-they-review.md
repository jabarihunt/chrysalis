---
status: accepted
date: 2026-10-18
---

# 0027. Each gate runs on a different model from every class whose work it reviews

Each gate agent runs on a different model from every agent whose work it reviews. In a tool that offers more than one model family, the difference is a family difference. A reviewer on the same model tends to share the blind spots of the model that wrote the work.

The gates between them review work from every class:

- The review class runs the security gate, the RED review, and the code review gate. The security gate reviews the implementers' code, and the RED review reviews the test agent's tests. The code review gate reads every file in the change, which includes the docs and specs that plan-class agents write and the factory-maintainer's changes to the factory. So review differs from build, test, and plan.
- The test class runs the test gate, which reviews the implementers' work. So test differs from build and review.
- Plan may share a family with build or test. No gate in either class reviews plan work, and no plan agent runs a gate on theirs.

In Cursor, Kilo, and Kiro, plan and test use Claude, build uses Grok or an open-weight family, and review uses GPT. Claude Code offers only Claude models, so its classes use different Claude models instead, and `chrysalis/models.yaml` marks it `single_family: true`. A fallback must also differ from every model its class must differ from. Every verdict names the model it ran on and whether that model's family matches the family of the work it reviewed.

A test in the factory's script tests fails when `chrysalis/models.yaml` breaks these rules.

This supersedes ADR 0022, which required different families only among build, test, and review. Under it, plan and review both used Claude Opus 5.5 in Cursor, Kilo, and Kiro, so the code review of docs, specs, and factory changes ran on the model that wrote them.

## Considered options

- Keep test on GPT and move review to a fourth family. Cursor and Kilo offer Gemini, but Kiro doesn't, so Kiro's reviewer would be an open-weight model, and every gate there would be weaker.
- Move plan off Claude. The TPM and the factory-maintainer, the agents the human talks to, would change family, and so would the spec writer and the documentation agent.
- Give only the factory-maintainer's work a separate reviewer. The code review gate also reads the docs and specs from the other plan agents, so the same problem would remain there.
- In Claude Code, hand gate reviews to another tool's command line, such as `kilo run`, to keep different families. It needs that tool installed and logged in, and every gate runs slower. Revisit it if Claude Code's same-family gates miss findings that the other tools' gates catch, which Q-20 tracks.
- Route Claude Code through an LLM gateway to GPT or Grok models. Anthropic doesn't support non-Claude models through a gateway, and tool calls may break.

## Consequences

- The TPM's spec check judges the spec writer's work, and both are plan class, so the spec check stays same-model. It's the TPM's checklist rather than a gate agent's review, and the human's criteria approval follows it.
- In Kiro, review now runs on GPT-5.6 Sol at 4.4x credits and test on Claude Opus 5.5 at 2.0x, the reverse of before. GPT-5.6 Sol is experimental in Kiro, which Q-17 covers.
- The model IDs stay unconfirmed until each tool's own model list confirms them, as Q-11 tracks.
