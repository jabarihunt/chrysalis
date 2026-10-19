---
name: upstream-sync
description: How the factory-maintainer runs an upstream enhancement session, which compares each pinned upstream file with its latest version, ports only the changes the human picks, and moves the pins. The factory-maintainer reads it before every enhancement session.
metadata:
  sources:
    - repo: cursor/plugins
      path: pstack/skills/maintain-verification-skill/SKILL.md
      commit: bc1443790cc980d0ea857663260a831299884508
      took: Ending each pass in one named outcome, clean, changed, or blocked, limiting the edits to the files the pass maintains, and shipping at most one pull request of checked changes.
  license: MIT. See THIRD_PARTY_NOTICES.md at the repository root.
  changes: Written for Chrysalis upstream enhancement sessions, which follow factory ADR 0012 and the pins in chrysalis/UPSTREAM.md.
---

# Upstream sync

Chrysalis skills and templates adapt parts of Matt Pocock's skills and pstack, and [UPSTREAM.md](../../UPSTREAM.md) pins the commit of each repository that the factory was last checked against. An enhancement session moves a pin forward. Upstream changes come in only this way, and only the ones the human picks, as [factory ADR 0012](../../docs/adr/0012-own-skills-built-from-upstream-parts.md) says.

The session is factory work, so it gets its own factory issue and branch, as your agent file says. Title the issue "Sync with upstream".

## Read upstream from GitHub

Read every upstream file straight from GitHub with your tool's web fetch, and clone nothing.

- A file at a commit: `https://raw.githubusercontent.com/<repo>/<commit>/<path>`.
- The newest commit on a repository's default branch: `https://api.github.com/repos/<repo>/commits/HEAD`, whose `sha` field holds it.
- Every file at a commit: `https://api.github.com/repos/<repo>/git/trees/<commit>?recursive=1`.

Every agent's tool rules deny `gh api`, whatever its shell groups, so use the web fetch for these reads. The GitHub API allows 60 requests an hour without a login, so use it only for the commit and tree reads, fetch file contents from `raw.githubusercontent.com`, and keep each file in a scratch folder outside the repository until the session ends.

## Find what changed

1. Build the list of upstream files the factory uses. Each skill's frontmatter lists its sources, with the repository, path, and commit. `THIRD_PARTY_NOTICES.md` lists the templates and agent files that adapt upstream material. The two lists must agree, so fix any file one lists and the other doesn't.
2. For each repository, get the newest commit. When it equals the pin, that repository has nothing to sync.
3. For each source file, fetch it at the pin and at the newest commit, and compare them. When a path is missing at the newest commit, upstream moved or deleted the file. Look for it in the newest tree under another name, and treat a deleted file as a change to show the human.
4. Compare the two trees for new files in the folders `UPSTREAM.md` lists. A new upstream skill that covers something a Chrysalis agent does is worth showing too.
5. Fetch each repository's license at the newest commit. When it's no longer MIT, stop and ask the human before you port anything.

## Show the human each change

For each changed file, list each change in a sentence or two: what upstream changed, which Chrysalis files adapt that part, and what the port would change in them. Give a recommendation for each:

- Port it, when it changes what a Chrysalis agent does and fits the pipeline.
- Skip it, when it's about the upstream workflow around a skill, such as plugin setup, model names, or commands that Chrysalis doesn't use. ADR 0012 takes what a skill does and leaves its workflow behind.
- Already covered, when a Chrysalis file already says it, and name the file.

Wait for the human to pick. Port nothing they didn't pick.

## Port the picked changes

- Rewrite each change for Chrysalis, in the voice of the file it goes into, as the writing-for-agents skill says. No adapted file may share a run of 12 or more words with its upstream sources. Check every touched file with a script that compares word runs, and rewrite each run it finds.
- The unslop skill is the exception. Its body is a copy, so a picked change to it comes in word for word, and only its frontmatter stays Chrysalis's own.
- Update each touched file's frontmatter: the `took` line when what it takes changed, and `path` when the source moved.
- Change only the files that adapt upstream material, plus `UPSTREAM.md` and `THIRD_PARTY_NOTICES.md`. A port that needs a change to the pipeline, a gate, or a script is a separate factory issue.

## Move the pins

For each repository you checked, move its pin in `UPSTREAM.md` to the newest commit, and set the date. Move every `commit` line for that repository in every skill's frontmatter to the same commit, because you've now checked every file against it, including the ones whose changes the human skipped. Update the `THIRD_PARTY_NOTICES.md` rows whose sources or use changed.

Then verify:

- Every source path in every frontmatter exists at its new pin.
- No adapted file shares a run of 12 or more words with its sources.
- Every link and anchor resolves, and every frontmatter parses.

## End in one outcome

Name the outcome in your report:

- Clean. Upstream changed nothing the human picked. Move the pins anyway, so the next session starts from here, and open one pull request with only those moves.
- Changed. One pull request holds the ported changes and the moved pins.
- Blocked. A license changed, a fetch failed, or a port couldn't pass its checks. Move no pins, and say what blocked.

Your report names each repository's old and new pin, each change you showed with the human's pick, what you ported into which files, and the outcome.
