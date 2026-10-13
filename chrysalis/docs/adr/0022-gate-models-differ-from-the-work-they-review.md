---
status: accepted
date: 2026-10-11
---

# 0022. Gate agents run on a different model from the work they review

Each gate agent runs on a different model from the agent whose work it reviews. The code review agent's RED review runs on a different model from the test agent. The security, test, and code review gates run on a different model from the implementers. A reviewer on the same model tends to share the blind spots of the model that wrote the work.

In a tool that offers more than one model family, the difference is a family difference. The build, test, and review classes then use three families, as in Cursor, Kilo, and Kiro.

Claude Code offers only Claude models. There, each of the three classes uses a different Claude model, and `chrysalis/models.yaml` marks the tool `single_family: true`. Every verdict names the model it ran on and whether that model's family matches the family of the work it reviewed, so a same-family verdict is visible on the issue. The pilot compares gate findings from Claude Code with those from the other tools.

This supersedes ADR 0018, which required a family difference in every tool.

## Considered options

- In Claude Code, the gate agents hand the review to another tool's command line, such as `kilo run`, to keep three families. It needs that tool installed and logged in, and every gate runs slower. Revisit it if Claude Code's same-family gates miss findings the other tools catch.
- Routing Claude Code through an LLM gateway to GPT or Grok models. Anthropic doesn't support non-Claude models through a gateway, and tool calls may break.
