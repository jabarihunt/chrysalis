// Runs external commands, such as git and gh, for the factory scripts.

export type RunResult = { code: number; stdout: string; stderr: string };

export async function run(cmd: string[], opts: { cwd?: string; input?: string } = {}): Promise<RunResult> {
  let proc;
  try {
    proc = Bun.spawn(cmd, {
      cwd: opts.cwd,
      stdin: opts.input === undefined ? "ignore" : new TextEncoder().encode(opts.input),
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (error) {
    // Bun.spawn throws when the executable isn't on PATH.
    return { code: 127, stdout: "", stderr: `${cmd[0]} wasn't found: ${(error as Error).message}` };
  }
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}
