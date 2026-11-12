// Turns an agent's write_scope into file patterns, and checks a path against them.
// The generator writes loose patterns, because a generated file can't know which app a run is for.
// The Claude Code write hook, and later check.ts, use the exact patterns for one app. See factory ADR 0032.
import { APP_PLACEHOLDER, ROOT_FILES } from "./factory";
import type { StackProfile } from "./factory";

const STACK_PREFIX = "stack:";

/** Glob patterns from the repository root. rootFiles also allows any file directly in the root. */
export type Scope = { globs: string[]; rootFiles: boolean };

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

/**
 * Patterns for generated tool files. <app> becomes *, and stack:<layer> becomes that layer's
 * patterns from every stack profile, so the patterns hold for every app on every stack.
 */
export function looseScope(scope: string[], stacks: StackProfile[]): Scope {
  const globs: string[] = [];
  let rootFiles = false;
  for (const entry of scope) {
    if (entry === ROOT_FILES) rootFiles = true;
    else if (entry.startsWith(STACK_PREFIX)) {
      const layer = entry.slice(STACK_PREFIX.length);
      for (const stack of stacks) globs.push(...(stack.write_scopes[layer] ?? []));
    } else globs.push(entry);
  }
  return { globs: dedupe(globs.map((glob) => glob.replaceAll(APP_PLACEHOLDER, "*"))), rootFiles };
}

/**
 * Patterns for one app on one stack. An entry that names <app> matches nothing when app is null,
 * as on a factory branch, and stack:<layer> matches nothing when the app has no stack.
 */
export function exactScope(scope: string[], app: string | null, stack: StackProfile | null): Scope {
  const globs: string[] = [];
  let rootFiles = false;
  const add = (glob: string) => {
    if (!glob.includes(APP_PLACEHOLDER)) globs.push(glob);
    else if (app) globs.push(glob.replaceAll(APP_PLACEHOLDER, app));
  };
  for (const entry of scope) {
    if (entry === ROOT_FILES) rootFiles = true;
    else if (entry.startsWith(STACK_PREFIX)) for (const glob of stack?.write_scopes[entry.slice(STACK_PREFIX.length)] ?? []) add(glob);
    else add(entry);
  }
  return { globs: dedupe(globs), rootFiles };
}

/**
 * A glob as a regular expression over a path from the repository root. * and ? stay within one
 * path segment, ** crosses segments, and a trailing /** also matches the folder itself.
 */
export function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; ) {
    if (glob.startsWith("**/", i)) {
      source += "(?:.*/)?";
      i += 3;
    } else if (glob.startsWith("/**", i) && i + 3 === glob.length) {
      source += "(?:/.*)?";
      i += 3;
    } else if (glob.startsWith("**", i)) {
      source += ".*";
      i += 2;
    } else if (glob[i] === "*") {
      source += "[^/]*";
      i += 1;
    } else if (glob[i] === "?") {
      source += "[^/]";
      i += 1;
    } else {
      source += glob[i]!.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

/** Whether a path from the repository root, with forward slashes, is inside the scope. */
export function inScope(path: string, scope: Scope): boolean {
  if (scope.rootFiles && !path.includes("/")) return true;
  return scope.globs.some((glob) => globToRegExp(glob).test(path));
}

/** The scope as one line for error messages. */
export function describeScope(scope: Scope): string {
  const parts = [...scope.globs];
  if (scope.rootFiles) parts.push("files directly in the repository root");
  return parts.length ? parts.join(", ") : "nothing";
}
