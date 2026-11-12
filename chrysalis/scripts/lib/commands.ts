// Shell command rules for the generated tool files. The shell groups an agent file may name, and the
// commands every agent is denied whatever its groups, both come from chrysalis/templates/agent.md.
// The generator writes them as each tool's permission patterns. The hook in hooks/deny-commands.ts
// parses each command instead, which also catches a denied command inside a compound command,
// a subshell, or sh -c.
import { posix } from "node:path";
import { APP_PLACEHOLDER } from "./factory";
import type { ShellGroup, StackProfile } from "./factory";

/** The command prefixes each shell group allows. The stack group comes from the stack profiles. */
const GROUP_COMMANDS: Record<Exclude<ShellGroup, "stack">, string[]> = {
  "git-read": ["git status", "git diff", "git log", "git show", "git rev-parse", "git branch --list", "git remote get-url"],
  "git-write": ["git switch", "git add", "git commit", "git push"],
  tracker: ["bun chrysalis/scripts/tracker.ts"],
  checks: ["bun chrysalis/scripts/check.ts"],
  "app-setup": ["bun chrysalis/scripts/app-setup.ts"],
  "factory-scripts": ["bun chrysalis/scripts/*", "bun test", "bun install --cwd chrysalis/scripts", "bun run --cwd chrysalis/scripts typecheck"],
};

/** The command prefixes an agent's shell groups allow, for every stack profile. */
export function groupCommands(groups: ShellGroup[], stacks: StackProfile[]): string[] {
  const out: string[] = [];
  for (const group of groups) {
    if (group !== "stack") {
      out.push(...GROUP_COMMANDS[group]);
      continue;
    }
    for (const stack of stacks) {
      // Stack commands run in the app's folder, so the agent changes into it first.
      if (stack.working_directory) out.push(`cd ${stack.working_directory.replaceAll(APP_PLACEHOLDER, "*")}`);
      out.push(...stack.commands);
    }
  }
  return [...new Set(out)];
}

/** Each prefix as patterns where * matches any run of characters: the command alone, and with arguments. */
export function prefixPatterns(prefixes: string[]): string[] {
  return [...new Set(prefixes.flatMap((prefix) => (prefix.endsWith("*") ? [prefix] : [prefix, `${prefix} *`])))];
}

/**
 * The always-denied commands as patterns where * matches any run of characters. Tool permission
 * rules match a command's text, so these catch the common spellings. The hook catches the rest.
 */
export const DENIED_PATTERNS = [
  "gh api",
  "gh api *",
  "gh pr create",
  "gh pr create *",
  "gh pr new",
  "gh pr new *",
  "gh pr merge",
  "gh pr merge *",
  "gh pr review",
  "gh pr review *",
  "git push * master",
  "git push * master *",
  "git push * *:master",
  "git push * *:master *",
  "git push * *:refs/heads/master",
  "git push * *:refs/heads/master *",
  "git push --force*",
  "git push * --force*",
  "git push -f",
  "git push -f *",
  "git push * -f",
  "git push * -f *",
  "git push * +*",
  "git push --mirror*",
  "git push * --mirror*",
  "git push --all*",
  "git push * --all*",
  "git rebase",
  "git rebase *",
  "git reset --hard*",
  "git reset * --hard*",
  "git branch -D*",
  "git branch * -D*",
];

// ---- Parsing shell commands ----

export class ShellParseError extends Error {}

/** Finds the end of a $( ... ) group that starts at text[start], and returns its inside. */
function readGroup(text: string, start: number): { inner: string; end: number } {
  let depth = 1;
  let i = start;
  while (i < text.length) {
    const c = text[i]!;
    if (c === "\\") i += 2;
    else if (c === "'") {
      const close = text.indexOf("'", i + 1);
      if (close < 0) throw new ShellParseError("unterminated single quote");
      i = close + 1;
    } else if (c === '"') {
      i = readDouble(text, i + 1, () => {}).end;
    } else if (c === "(") {
      depth++;
      i++;
    } else if (c === ")") {
      depth--;
      if (depth === 0) return { inner: text.slice(start, i), end: i + 1 };
      i++;
    } else i++;
  }
  throw new ShellParseError("unterminated $(");
}

/** Reads a backtick substitution that starts after the opening backtick. */
function readBacktick(text: string, start: number): { inner: string; end: number } {
  let i = start;
  while (i < text.length) {
    if (text[i] === "\\") i += 2;
    else if (text[i] === "`") return { inner: text.slice(start, i), end: i + 1 };
    else i++;
  }
  throw new ShellParseError("unterminated backtick");
}

/**
 * Reads a double-quoted string that starts after the opening quote. Each command substitution
 * inside it goes to onCommand, because the shell runs it.
 */
function readDouble(text: string, start: number, onCommand: (inner: string) => void): { value: string; end: number } {
  let value = "";
  let i = start;
  while (i < text.length) {
    const c = text[i]!;
    if (c === '"') return { value, end: i + 1 };
    if (c === "\\" && i + 1 < text.length) {
      const next = text[i + 1]!;
      if ('"\\$`'.includes(next)) value += next;
      else if (next !== "\n") value += c + next;
      i += 2;
    } else if (c === "$" && text[i + 1] === "(") {
      const group = readGroup(text, i + 2);
      if (!group.inner.startsWith("(")) onCommand(group.inner);
      i = group.end;
    } else if (c === "`") {
      const tick = readBacktick(text, i + 1);
      onCommand(tick.inner);
      i = tick.end;
    } else {
      value += c;
      i++;
    }
  }
  throw new ShellParseError("unterminated double quote");
}

/**
 * Splits shell text into the argument lists of its simple commands, including commands inside
 * $( ), backticks, and subshells. Quotes are removed, heredoc bodies are skipped, and redirection
 * targets are dropped. This covers what agents write, not every shell feature.
 */
export function parseShell(text: string): string[][] {
  const commands: string[][] = [];
  let argv: string[] = [];
  let word: string | null = null;
  let skipNext = false;
  const heredocs: { delimiter: string; stripTabs: boolean }[] = [];

  const endWord = () => {
    if (word === null) return;
    if (skipNext) skipNext = false;
    else argv.push(word);
    word = null;
  };
  const endCommand = () => {
    endWord();
    if (argv.length) commands.push(argv);
    argv = [];
  };
  const nested = (inner: string) => commands.push(...parseShell(inner));

  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (c === "\n") {
      endCommand();
      i++;
      // Skip the bodies of heredocs that started on the line that just ended.
      while (heredocs.length) {
        const { delimiter, stripTabs } = heredocs.shift()!;
        for (;;) {
          if (i >= text.length) throw new ShellParseError(`heredoc ${delimiter} has no end line`);
          const lineEnd = text.indexOf("\n", i);
          const line = text.slice(i, lineEnd < 0 ? text.length : lineEnd);
          i = lineEnd < 0 ? text.length : lineEnd + 1;
          if ((stripTabs ? line.replace(/^\t+/, "") : line) === delimiter) break;
        }
      }
    } else if (c === " " || c === "\t") {
      endWord();
      i++;
    } else if (c === "#" && word === null) {
      const lineEnd = text.indexOf("\n", i);
      i = lineEnd < 0 ? text.length : lineEnd;
    } else if (c === ";" || c === "&" || c === "|" || c === "(" || c === ")") {
      endCommand();
      i++;
    } else if (c === "<" && text.startsWith("<<<", i)) {
      endWord();
      skipNext = true;
      i += 3;
    } else if (c === "<" && text[i + 1] === "<") {
      endWord();
      let j = i + 2;
      const stripTabs = text[j] === "-";
      if (stripTabs) j++;
      while (text[j] === " " || text[j] === "\t") j++;
      let delimiter = "";
      while (j < text.length && !" \t\n;&|<>()".includes(text[j]!)) {
        const d = text[j]!;
        if (d === "'" || d === '"') {
          const close = text.indexOf(d, j + 1);
          if (close < 0) throw new ShellParseError("unterminated heredoc delimiter");
          delimiter += text.slice(j + 1, close);
          j = close + 1;
        } else if (d === "\\") {
          delimiter += text[j + 1] ?? "";
          j += 2;
        } else {
          delimiter += d;
          j++;
        }
      }
      if (!delimiter) throw new ShellParseError("heredoc without a delimiter");
      heredocs.push({ delimiter, stripTabs });
      i = j;
    } else if (c === "<" || c === ">") {
      // A file descriptor number right before the operator belongs to it, as in 2>&1.
      if (word !== null && /^\d+$/.test(word)) word = null;
      endWord();
      i++;
      if (text[i] === ">" || text[i] === "|") i++;
      if (text[i] === "&") {
        i++;
        while (i < text.length && /[0-9-]/.test(text[i]!)) i++;
      } else skipNext = true;
    } else if (c === "'") {
      const close = text.indexOf("'", i + 1);
      if (close < 0) throw new ShellParseError("unterminated single quote");
      word = (word ?? "") + text.slice(i + 1, close);
      i = close + 1;
    } else if (c === '"') {
      const read = readDouble(text, i + 1, nested);
      word = (word ?? "") + read.value;
      i = read.end;
    } else if (c === "\\") {
      if (text[i + 1] !== "\n") word = (word ?? "") + (text[i + 1] ?? "");
      i += 2;
    } else if (c === "$" && text[i + 1] === "(") {
      const group = readGroup(text, i + 2);
      if (!group.inner.startsWith("(")) nested(group.inner);
      word = (word ?? "") + "$()";
      i = group.end;
    } else if (c === "`") {
      const tick = readBacktick(text, i + 1);
      nested(tick.inner);
      word = (word ?? "") + "$()";
      i = tick.end;
    } else {
      word = (word ?? "") + c;
      i++;
    }
  }
  if (heredocs.length) throw new ShellParseError(`heredoc ${heredocs[0]!.delimiter} has no end line`);
  endCommand();
  return commands;
}

// ---- Finding the command a wrapper runs ----

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "fish"]);
/** Commands that run the command after their own options. */
const WRAPPERS = new Set(["sudo", "doas", "command", "builtin", "exec", "nohup", "time", "nice", "ionice", "noglob", "stdbuf", "caffeinate", "env", "timeout", "xargs"]);
/** Options of the wrappers above that take a separate value. */
const WRAPPER_VALUES: Record<string, Set<string>> = {
  sudo: new Set(["-u", "-g", "-C", "-D", "-h", "-p", "-r", "-t", "-U"]),
  env: new Set(["-u", "-C", "-S", "--unset", "--chdir", "--split-string"]),
  nice: new Set(["-n", "--adjustment"]),
  ionice: new Set(["-c", "-n", "-p", "-t"]),
  stdbuf: new Set(["-i", "-o", "-e"]),
  timeout: new Set(["-k", "-s", "--kill-after", "--signal"]),
  xargs: new Set(["-a", "-d", "-E", "-I", "-L", "-n", "-P", "-s", "--arg-file", "--delimiter", "--max-args", "--max-procs", "--max-chars", "--replace"]),
};

/**
 * Returns the commands an argument list runs: itself without its variable assignments and
 * wrappers, and the commands inside sh -c or eval strings.
 */
export function effectiveCommands(argv: string[]): string[][] {
  let args = [...argv];
  for (;;) {
    while (args.length && ASSIGNMENT.test(args[0]!)) args.shift();
    if (!args.length) return [];
    const name = posix.basename(args[0]!);
    if (SHELLS.has(name)) {
      const flag = args.findIndex((a, i) => i > 0 && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
      if (flag > 0 && args[flag + 1] !== undefined) return parseShell(args[flag + 1]!).flatMap(effectiveCommands);
      return [[name, ...args.slice(1)]];
    }
    if (name === "eval") return parseShell(args.slice(1).join(" ")).flatMap(effectiveCommands);
    if (!WRAPPERS.has(name)) return [[name, ...args.slice(1)]];
    const values = WRAPPER_VALUES[name] ?? new Set<string>();
    let i = 1;
    while (i < args.length) {
      const a = args[i]!;
      if (name === "env" && ASSIGNMENT.test(a)) i++;
      else if (a.startsWith("-") && a !== "-") i += values.has(a) ? 2 : 1;
      else break;
    }
    // timeout's first argument is the duration.
    if (name === "timeout" && i < args.length) i++;
    args = args.slice(i);
  }
}

// ---- The denied commands ----

const POLICY = "Every agent is denied this command, whatever its shell groups. See chrysalis/templates/agent.md.";

const GH_VALUE_OPTIONS = new Set(["-R", "--repo", "--hostname"]);

function positionals(args: string[], valueOptions: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") {
      out.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("-") && a !== "-") {
      if (valueOptions.has(a)) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

function ghProblem(args: string[]): string | null {
  const words = positionals(args, GH_VALUE_OPTIONS);
  if (words[0] === "api") {
    return `gh api is denied, reads included. Reach GitHub through bun chrysalis/scripts/tracker.ts, which calls gh inside its own process. ${POLICY}`;
  }
  if (words[0] === "pr" && ["create", "new", "merge", "review"].includes(words[1] ?? "")) {
    const what = words[1] === "new" ? "create" : words[1];
    return `gh pr ${what} is denied. The TPM or the factory-maintainer opens pull requests with tracker pr-open, and only humans merge them. ${POLICY}`;
  }
  return null;
}

const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env"]);
const PUSH_VALUE_OPTIONS = new Set(["--repo", "--receive-pack", "--exec", "--push-option", "-o"]);

/** What git push would do that the rules deny, or null. branch returns the current branch. */
function pushProblem(args: string[], branch: () => string | null): string | null {
  const force = `git push --force, -f, and a + refspec are denied. Agents never rewrite a pushed branch. ${POLICY}`;
  const master = `git push to master is denied. master changes only through a pull request that a human merges. ${POLICY}`;
  const words: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--") {
      words.push(...args.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const name = a.split("=")[0]!;
      if (name === "--force" || name === "--force-with-lease" || name === "--force-if-includes") return force;
      if (name === "--mirror" || name === "--all" || name === "--branches") return master;
      if (PUSH_VALUE_OPTIONS.has(name) && !a.includes("=")) i++;
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      if (a.slice(1).includes("f")) return force;
      if (a === "-o") i++;
      continue;
    }
    words.push(a);
  }
  const refspecs = words.slice(1);
  const isMaster = (ref: string) => {
    const name = ref === "HEAD" || ref === "@" ? branch() : ref.replace(/^refs\/heads\//, "");
    return name === "master";
  };
  // With no refspec, git pushes the current branch.
  if (!refspecs.length) return isMaster("HEAD") ? master : null;
  for (const spec of refspecs) {
    if (spec.startsWith("+")) return force;
    const colon = spec.indexOf(":");
    const target = colon < 0 ? spec : spec.slice(colon + 1) || spec.slice(0, colon);
    if (isMaster(target)) return master;
  }
  return null;
}

function gitProblem(args: string[], cwd: string, branchOf: (dir: string) => string | null): string | null {
  let dir = cwd;
  let i = 0;
  while (i < args.length && args[i]!.startsWith("-")) {
    const a = args[i]!;
    if (GIT_VALUE_OPTIONS.has(a)) {
      if (a === "-C" && args[i + 1] !== undefined) dir = posix.resolve(dir, args[i + 1]!);
      i += 2;
    } else i++;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (sub === "rebase") return `git rebase is denied. Agents never rewrite history. If a branch needs changes from master, the TPM asks the human. ${POLICY}`;
  if (sub === "reset" && rest.includes("--hard")) return `git reset --hard is denied, because it throws away work. ${POLICY}`;
  if (sub === "branch") {
    const shorts = rest.filter((a) => /^-[a-zA-Z]+$/.test(a)).join("");
    const del = shorts.includes("d") || rest.includes("--delete");
    const forced = shorts.includes("f") || rest.includes("--force");
    if (shorts.includes("D") || (del && forced)) return `git branch -D is denied, because it deletes unmerged work. ${POLICY}`;
  }
  if (sub === "push") return pushProblem(rest, () => branchOf(dir));
  return null;
}

/**
 * Why the rules deny a command, or null when they don't. The text can be a compound command.
 * branchOf returns the branch checked out in a folder, for a git push that names no branch.
 */
export function deniedCommand(text: string, ctx: { cwd: string; branchOf: (dir: string) => string | null }): string | null {
  let commands: string[][];
  try {
    commands = parseShell(text);
  } catch {
    // The shell can't run what it can't parse either, but check the text for a denied command anyway.
    return rawProblem(text);
  }
  let cwd = ctx.cwd;
  for (const argv of commands) {
    for (const [name, ...args] of effectiveCommands(argv)) {
      if (name === "cd" && args.length === 1) cwd = posix.resolve(cwd, args[0]!);
      const problem = name === "gh" ? ghProblem(args) : name === "git" ? gitProblem(args, cwd, ctx.branchOf) : null;
      if (problem) return problem;
    }
  }
  return null;
}

/** A text search for the denied commands, used only when the command can't be parsed. */
function rawProblem(text: string): string | null {
  const segment = "[^\\n;|&]*";
  const checks: [RegExp, string][] = [
    [new RegExp(`\\bgh\\b${segment}\\bapi\\b`), "gh api"],
    [new RegExp(`\\bgh\\b${segment}\\bpr\\s+(create|new|merge|review)\\b`), "gh pr create, merge, or review"],
    [new RegExp(`\\bgit\\b${segment}\\brebase\\b`), "git rebase"],
    [new RegExp(`\\bgit\\b${segment}\\breset\\b${segment}--hard\\b`), "git reset --hard"],
    [new RegExp(`\\bgit\\b${segment}\\bbranch\\b${segment}\\s-[a-zA-Z]*D`), "git branch -D"],
    [new RegExp(`\\bgit\\b${segment}\\bpush\\b${segment}(\\s--force|\\s-[a-zA-Z]*f|\\s\\+|\\bmaster\\b|--mirror|--all)`), "git push --force or to master"],
  ];
  for (const [pattern, name] of checks) {
    if (pattern.test(text)) return `This command couldn't be parsed, and it looks like ${name}, which is denied. ${POLICY}`;
  }
  return null;
}
