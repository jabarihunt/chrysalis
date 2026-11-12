---
status: accepted
date: 2026-11-11
---

# 0033. A tool gets agent files only when all its models are confirmed, and the template confirms none

The generator writes a tool's agent files only when `chrysalis/models.yaml` confirms a model, or a fallback, for all four of that tool's classes. With none confirmed, the tool gets no agent files. With some but not all, the generator stops, because a gate agent on an unchecked model could share a family with the work it reviews, which 0027 rules out. The files that deny commands to every agent, `.kiro/hooks/` and `.claude/settings.json`, name no model, so the generator always writes them.

The template's `models.yaml` confirms no model, and a test in `bun test chrysalis/scripts` fails when it does. Tools retire models, and each person's plan offers different ones, so a model confirmed in the template could be gone or unavailable by the time someone copies it. Each copy confirms its own models, for the tools its owner uses, and the template's IDs are dated suggestions. So the template ships no agent files. The evals, once built, confirm their models in their own scratch folder, from a file that git ignores, so those confirmations never reach a copy.

## Considered options

- Keep the template's confirmations in a git-ignored file that the generator reads. The generated agent files would then hold confirmed IDs, so the template would have to ignore folders that copies commit.
- Write agent files with no model for a tool whose models aren't confirmed. Each agent would run on the session's model, and a gate could run on the model that wrote the work it reviews.

## Consequences

- In the template, no tool lists the Chrysalis agents. The TPM starts each agent with a brief that names its agent file, and the human picks the model, as before.
- Trying a generated agent in the template means confirming models locally and leaving the change uncommitted.
