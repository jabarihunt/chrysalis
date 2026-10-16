// Tests for the minimum tool versions.
import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { MINIMUM, atLeast, checkTools, parseVersion } from "../lib/versions";

describe("versions", () => {
  test("reads version numbers from each tool's --version output", () => {
    expect(parseVersion("git version 2.39.3 (Apple Git-146)")).toEqual([2, 39, 3]);
    expect(parseVersion("gh version 2.102.0 (2026-09-30)\nhttps://github.com/cli/cli/releases/tag/v2.102.0")).toEqual([2, 102, 0]);
    expect(parseVersion("1.4.3")).toEqual([1, 4, 3]);
    expect(parseVersion("git version 2.42")).toEqual([2, 42, 0]);
    expect(parseVersion("no version here")).toBeNull();
  });

  test("compares each part as a number", () => {
    expect(atLeast([2, 42, 0], "2.42.0")).toBe(true);
    expect(atLeast([2, 102, 0], "2.94.0")).toBe(true);
    expect(atLeast([2, 9, 9], "2.42.0")).toBe(false);
    expect(atLeast([1, 2, 20], "1.2.21")).toBe(false);
    expect(atLeast([3, 0, 0], "2.42.0")).toBe(true);
  });

  test("the Bun and git running these tests meet the minimums", async () => {
    expect(await checkTools(["bun", "git"])).toEqual([]);
  });

  test("the README lists the same minimums", async () => {
    const readme = await Bun.file(resolve(import.meta.dir, "..", "..", "..", "README.md")).text();
    const short = (v: string) => v.replace(/\.0$/, "");
    expect(readme).toContain(`Bun ${short(MINIMUM.bun)} or later`);
    expect(readme).toContain(`git ${short(MINIMUM.git)} or later`);
    expect(readme).toContain(`gh ${short(MINIMUM.gh)} or later`);
  });
});
