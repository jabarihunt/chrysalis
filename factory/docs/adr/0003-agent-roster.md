---
status: accepted
date: 2026-10-11
---

# 0003. Agent roster

The TPM runs three tiers of agents. The documentation tier has the spec writer, which writes for agents, and the documentation agent, which writes for people. The implementation tier has the database, backend, and frontend agents. The gate tier has the security, test, and code review agents, and each gate can block. A factory-maintainer agent changes the factory itself and takes no part in app work.

Code review is a third gate agent, as in the workflow this factory is based on. It also reviews acceptance tests before implementation, because the test agent shouldn't grade its own tests and a weak test would otherwise surface only after code is written against it.
