// Keeps accepted factory ADRs as they were accepted. chrysalis/templates/adr.md states the rule: once
// accepted, an ADR's decision is never edited. Only its status line may change, to mark it superseded,
// and its paths or names after a rename, which means updating its fingerprint in adr-fingerprints.json
// on purpose.
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ADR_DIR = resolve(import.meta.dir, "..", "..", "docs", "adr");
const FINGERPRINTS = resolve(import.meta.dir, "adr-fingerprints.json");
const FINGERPRINTS_PATH = "chrysalis/scripts/tests/adr-fingerprints.json";
const ADR_FILE = /^\d{4}-[a-z0-9-]+\.md$/;
const STATUS_LINE = /^status:.*$/m;

type Adr = { file: string; status: string; fingerprint: string };

/** Reads an ADR's status, and fingerprints its text with the status line blanked, so only a status change is free. */
function readAdr(file: string, text: string): Adr {
  const normalized = text.replace(/\r\n/g, "\n");
  const status = normalized.match(STATUS_LINE)?.[0].slice("status:".length).trim() ?? "";
  const fingerprint = createHash("sha256").update(normalized.replace(STATUS_LINE, "status:")).digest("hex");
  return { file, status, fingerprint };
}

/** Returns one message for each broken rule, naming what to do instead. */
function problems(adrs: Adr[], fingerprints: Record<string, string>): string[] {
  const out: string[] = [];
  const numbers = new Set(adrs.map((a) => a.file.slice(0, 4)));
  for (const adr of adrs) {
    const superseded = adr.status.match(/^superseded by (\d{4})$/);
    const validStatus = adr.status === "proposed" || adr.status === "accepted" || (superseded && superseded[1] !== adr.file.slice(0, 4) && numbers.has(superseded[1]!));
    if (!validStatus) out.push(`${adr.file}: status "${adr.status}" must be proposed, accepted, or "superseded by NNNN" naming another ADR.`);
    const recorded = fingerprints[adr.file];
    if (adr.status === "proposed") {
      if (recorded) out.push(`${adr.file} was accepted, so it can't go back to proposed. Write a new ADR instead.`);
      continue;
    }
    if (!recorded) {
      out.push(`${adr.file} is accepted and has no fingerprint. In the same commit that accepts it, add "${adr.file}": "${adr.fingerprint}" to ${FINGERPRINTS_PATH}.`);
    } else if (recorded !== adr.fingerprint) {
      out.push(
        `${adr.file} changed after it was accepted. An accepted ADR's decision is never edited, so restore it with ` +
          `git restore --source=master -- chrysalis/docs/adr/${adr.file}, and write a new ADR when the change alters its decision. ` +
          `Only its status line, and a path or name fixed after a rename, may change. For a rename fix, set its fingerprint to ` +
          `"${adr.fingerprint}" in ${FINGERPRINTS_PATH}, so the change shows in review.`,
      );
    }
  }
  const files = new Set(adrs.map((a) => a.file));
  for (const file of Object.keys(fingerprints)) {
    if (!files.has(file)) out.push(`${FINGERPRINTS_PATH} names ${file}, which doesn't exist. ADRs are never deleted, so restore it.`);
  }
  return out;
}

function loadAdrs(): Adr[] {
  return readdirSync(ADR_DIR)
    .filter((file) => ADR_FILE.test(file))
    .sort()
    .map((file) => readAdr(file, readFileSync(join(ADR_DIR, file), "utf8")));
}

describe("accepted ADRs", () => {
  test("every accepted ADR matches the fingerprint it had when accepted", () => {
    // A misnamed file would skip the check, so every file in the folder must be named NNNN-<slug>.md.
    expect(readdirSync(ADR_DIR).filter((file) => !ADR_FILE.test(file))).toEqual([]);
    const fingerprints = JSON.parse(readFileSync(FINGERPRINTS, "utf8")) as Record<string, string>;
    expect(problems(loadAdrs(), fingerprints)).toEqual([]);
  });

  test("the check catches edits, missing fingerprints, deleted ADRs, and bad statuses", () => {
    const text = (status: string, body = "The decision.") => `---\nstatus: ${status}\ndate: 2026-10-24\n---\n\n# 0001. Title\n\n${body}\n`;
    const accepted = readAdr("0001-a.md", text("accepted"));
    const fingerprints = { "0001-a.md": accepted.fingerprint };

    // Marking it superseded changes only the status line, which the fingerprint leaves out.
    const superseded = readAdr("0001-a.md", text("superseded by 0002"));
    const next = readAdr("0002-b.md", text("accepted"));
    expect(problems([superseded, next], { ...fingerprints, "0002-b.md": next.fingerprint })).toEqual([]);

    // Any other change fails, and so does a missing fingerprint, a deleted ADR, or a bad status.
    expect(problems([readAdr("0001-a.md", text("accepted", "An edited decision."))], fingerprints)[0]).toContain("changed after it was accepted");
    expect(problems([accepted, next], fingerprints)[0]).toContain("0002-b.md is accepted and has no fingerprint");
    expect(problems([], fingerprints)[0]).toContain("names 0001-a.md, which doesn't exist");
    expect(problems([readAdr("0001-a.md", text("accepted, amended by 0002"))], fingerprints)[0]).toContain("must be proposed, accepted");
    expect(problems([readAdr("0001-a.md", text("superseded by 0009"))], fingerprints)[0]).toContain("naming another ADR");
    expect(problems([readAdr("0001-a.md", text("proposed"))], fingerprints)[0]).toContain("can't go back to proposed");

    // A proposed ADR needs no fingerprint and may change freely.
    expect(problems([readAdr("0003-c.md", text("proposed", "A draft."))], {})).toEqual([]);
  });
});
