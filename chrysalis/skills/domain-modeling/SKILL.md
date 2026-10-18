---
name: domain-modeling
description: How to keep an app's glossary and ADRs current while writing specs, by checking terms, sharpening vague ones, and recording decisions as they settle. The spec writer reads it before writing any spec or ADR.
metadata:
  sources:
    - repo: mattpocock/skills
      path: skills/engineering/domain-modeling/SKILL.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Challenging terms against the glossary, sharpening vague words, testing boundaries with scenarios, checking claims against the code, and updating the glossary as terms settle.
    - repo: mattpocock/skills
      path: skills/engineering/domain-modeling/ADR-FORMAT.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: The kinds of decision that usually deserve an ADR.
    - repo: mattpocock/skills
      path: skills/engineering/domain-modeling/GLOSSARY-FORMAT.md
      commit: 49dd158d1076134a641b33efb035946536778336
      took: Glossary rules, which live in the glossary template.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Rewritten for the spec writer, which doesn't talk to the human. Challenges become question comments on the issue, and each app has one glossary.
---

# Domain modeling

The glossary is the app's one vocabulary. Specs, code, and tests share it, so a term that means two things turns into two features that don't fit together. Build the glossary as you write: check each word against it, sharpen vague words, and record each decision once it settles.

## Check every term

While you read the request and write the spec, do these four checks.

- Compare each domain word with the app's glossary at `apps/<app>/docs/glossary.md`. When the request uses a word differently from the glossary, post a question that quotes both. For example, the glossary defines a Cancellation as stopping a whole Order, but the request asks to cancel one item.
- When a word is vague, or covers two concepts, propose the precise term in your question. "Account" might mean the Customer or the User, and those are different records.
- Test the boundaries between concepts with concrete scenarios. What happens to a Task's due date when the Task moves to another List? Each answer becomes a criterion, an out-of-scope line, or a question.
- Compare what the documents say with what the code does. When they disagree, post a question that names both. The human picks which one is right.

## Update the glossary as terms settle

Add or change a term on the slice's branch as soon as it settles, and list it under "Glossary terms added" in the spec. Follow the rules in [the glossary template](../../templates/glossary.md): one word per concept, the other words under Avoid, one or two sentences on what the term is, and only terms specific to this app.

The glossary holds language and nothing else. Implementation details go in the spec or in an ADR.

## Record decisions as ADRs

Write an ADR when a decision is hard to reverse, would surprise a reader, and came from a real tradeoff. Your agent file states that rule, and [the ADR template](../../templates/adr.md) gives the format. These kinds of decision usually meet all three tests:

- the shape of the architecture, such as where a boundary between two parts of the app sits,
- a technology with lock-in, such as a payment provider,
- a scope boundary, including what the app will never do,
- a deliberate departure from the obvious approach, which stops a later agent from "fixing" it,
- a constraint the code can't show, such as a legal or partner requirement,
- an alternative the human rejected for reasons a reader wouldn't guess.

An ADR can be one paragraph. Its value is the record that a decision was made and why.
