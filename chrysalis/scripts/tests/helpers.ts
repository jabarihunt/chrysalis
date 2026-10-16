// Shared setup for the tracker tests: scratch git repositories, a runner for the CLI, and the fake gh.
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { run } from "../lib/proc";
import { emptyState } from "./fake-gh";
import type { FakeState } from "./fake-gh";

export const CLI = resolve(import.meta.dir, "..", "tracker.ts");
const FAKE_GH = resolve(import.meta.dir, "fake-gh.ts");

const scratch: string[] = [];

export function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "chrysalis-test-")));
  scratch.push(dir);
  return dir;
}

export function cleanup(): void {
  while (scratch.length) rmSync(scratch.pop()!, { recursive: true, force: true });
}

/** Runs a command and returns its standard output, or throws with its error output. */
export async function sh(cmd: string[], cwd: string, input?: string): Promise<string> {
  const result = await run(cmd, { cwd, input });
  if (result.code !== 0) throw new Error(`${cmd.join(" ")} failed in ${cwd}: ${result.stderr}`);
  return result.stdout;
}

/** A git repository with one commit on master and a committer identity, inside a fresh temp folder. */
export async function makeRepo(name = "repo"): Promise<string> {
  const dir = join(tempDir(), name);
  mkdirSync(dir);
  await sh(["git", "init", "--quiet", "-b", "master"], dir);
  await sh(["git", "config", "user.name", "Test"], dir);
  await sh(["git", "config", "user.email", "test@example.com"], dir);
  writeFileSync(join(dir, "README.md"), "code\n");
  await sh(["git", "add", "README.md"], dir);
  await sh(["git", "commit", "--quiet", "-m", "Initial commit"], dir);
  return dir;
}

export function writeApp(repo: string, app: string, yaml: string): void {
  mkdirSync(join(repo, "apps", app), { recursive: true });
  writeFileSync(join(repo, "apps", app, "app.yaml"), yaml);
}

export type CliResult = { code: number; json: any; error: string | null; stdout: string; stderr: string };

export async function tracker(cwd: string, args: string[], opts: { input?: string; env?: Record<string, string> } = {}): Promise<CliResult> {
  const proc = Bun.spawn([process.execPath, CLI, ...args], {
    cwd,
    env: { ...process.env, ...opts.env },
    stdin: opts.input === undefined ? "ignore" : new TextEncoder().encode(opts.input),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  let json: any = null;
  let error: string | null = null;
  try {
    json = stdout.trim() ? JSON.parse(stdout) : null;
  } catch {
    json = null;
  }
  try {
    error = stderr.trim() ? JSON.parse(stderr).error : null;
  } catch {
    error = stderr.trim() || null;
  }
  return { code, json, error, stdout, stderr };
}

/** Installs the fake gh first on PATH and returns the environment and accessors for its state and calls. */
export function fakeGh(opts: { version?: string; state?: FakeState } = {}) {
  const dir = tempDir();
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const statePath = join(dir, "state.json");
  const logPath = join(dir, "calls.jsonl");
  writeFileSync(statePath, JSON.stringify(opts.state ?? emptyState()));
  writeFileSync(logPath, "");
  writeFileSync(join(bin, "gh"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GH}" "$@"\n`);
  chmodSync(join(bin, "gh"), 0o755);
  const env: Record<string, string> = { PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: statePath, FAKE_GH_LOG: logPath };
  if (opts.version) env.FAKE_GH_VERSION = opts.version;
  return {
    env,
    state: (): FakeState => JSON.parse(readFileSync(statePath, "utf8")),
    setState: (state: FakeState) => writeFileSync(statePath, JSON.stringify(state)),
    calls: (): string[][] =>
      readFileSync(logPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}
