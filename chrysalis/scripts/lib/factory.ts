// Reads the factory's sources for the generator and the tool hooks: the agent files in
// chrysalis/agents/, chrysalis/models.yaml, and the stack profiles in chrysalis/stacks/.
// chrysalis/templates/agent.md defines the agent file fields.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const MODEL_CLASSES = ["plan", "build", "test", "review"] as const;
export type ModelClass = (typeof MODEL_CLASSES)[number];

/** The tools in chrysalis/models.yaml, in the order the generator reports them. */
export const TOOLS = ["cursor", "kilo", "kiro", "claude"] as const;
export type ToolName = (typeof TOOLS)[number];

export const SHELL_GROUPS = ["git-read", "git-write", "tracker", "checks", "stack", "app-setup", "factory-scripts"] as const;
export type ShellGroup = (typeof SHELL_GROUPS)[number];

/** The write scope entry for any file directly in the repository root. */
export const ROOT_FILES = "root-files";
/** Stands for the app named in the brief. */
export const APP_PLACEHOLDER = "<app>";
const STACK_PREFIX = "stack:";

export type Agent = {
  name: string;
  description: string;
  mode: "primary" | "subagent";
  model_class: ModelClass;
  can_block: boolean;
  write_scope: string[];
  shell: ShellGroup[];
  skills: string[];
  /** The prompt, which is everything after the frontmatter. */
  body: string;
  /** The agent file's path from the repository root, such as chrysalis/agents/tpm.md. */
  file: string;
};

export type ModelEntry = { family: string; model: string; confirmed: boolean; fallback?: string; fallback_confirmed?: boolean };
export type ToolModels = { single_family: boolean; classes: Record<ModelClass, ModelEntry> };

export type StackProfile = {
  name: string;
  write_scopes: Record<string, string[]>;
  /** Every command string under the profile's commands, except the working directory. */
  commands: string[];
  working_directory: string | null;
};

export type Factory = {
  root: string;
  agents: Agent[];
  models: Partial<Record<ToolName, ToolModels>>;
  stacks: StackProfile[];
};

/** Holds every problem found, so one run reports all of them. */
export class FactoryError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
  }
}

const AGENT_FIELDS = ["name", "description", "mode", "model_class", "can_block", "write_scope", "shell", "skills"];
const AGENT_NAME = /^[a-z]+(?:-[a-z]+)*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Splits a Markdown file into its YAML frontmatter and its body. */
export function splitFrontmatter(text: string): { data: unknown; body: string } | null {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  return { data: Bun.YAML.parse(match[1]!), body: match[2]!.trim() };
}

/** Checks one write scope entry. Returns a problem, or null when the entry is valid. */
function scopeProblem(entry: string, layers: Set<string>): string | null {
  if (entry === ROOT_FILES) return null;
  if (entry.startsWith(STACK_PREFIX)) {
    const layer = entry.slice(STACK_PREFIX.length);
    return layers.has(layer) ? null : `names ${entry}, but no stack profile defines the ${layer} layer`;
  }
  if (entry.startsWith("/") || entry.includes("\\") || entry.split("/").includes("..")) {
    return `has "${entry}". Write scope paths are relative to the repository root, with forward slashes and no "..".`;
  }
  return null;
}

function readAgent(root: string, file: string, classes: Set<string>, layers: Set<string>, problems: string[]): Agent | null {
  const path = `chrysalis/agents/${file}`;
  let parsed;
  try {
    parsed = splitFrontmatter(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    problems.push(`${path}: the frontmatter isn't valid YAML. ${(error as Error).message}`);
    return null;
  }
  if (!parsed || !isObject(parsed.data)) {
    problems.push(`${path} has no YAML frontmatter.`);
    return null;
  }
  const data = parsed.data;
  const before = problems.length;
  const fail = (message: string) => problems.push(`${path}: ${message}`);
  for (const key of Object.keys(data)) if (!AGENT_FIELDS.includes(key)) fail(`unknown field "${key}". chrysalis/templates/agent.md lists the fields.`);
  const stem = file.slice(0, -".md".length);
  if (data.name !== stem) fail(`name must be "${stem}", the file's name.`);
  if (!AGENT_NAME.test(stem)) fail("the file name must use lowercase letters and hyphens.");
  if (typeof data.description !== "string" || !data.description.trim()) fail("description must be a non-empty string.");
  if (data.mode !== "primary" && data.mode !== "subagent") fail("mode must be primary or subagent.");
  if (typeof data.model_class !== "string" || !classes.has(data.model_class)) fail(`model_class must be one of ${[...classes].join(", ")}.`);
  if (typeof data.can_block !== "boolean") fail("can_block must be true or false.");
  if (!stringList(data.write_scope)) {
    fail("write_scope must be a list of paths.");
  } else {
    for (const entry of data.write_scope) {
      const problem = scopeProblem(entry, layers);
      if (problem) fail(`write_scope ${problem}`);
    }
  }
  if (!stringList(data.shell)) {
    fail("shell must be a list of command groups.");
  } else {
    for (const group of data.shell) if (!(SHELL_GROUPS as readonly string[]).includes(group)) fail(`shell names "${group}". Groups: ${SHELL_GROUPS.join(", ")}.`);
  }
  if (!stringList(data.skills)) {
    fail("skills must be a list of paths.");
  } else {
    for (const skill of data.skills) if (!existsSync(join(root, skill))) fail(`skills names ${skill}, which doesn't exist.`);
  }
  if (!parsed.body) fail("the body is empty. The body is the agent's prompt.");
  if (problems.length > before) return null;
  return {
    name: stem,
    description: (data.description as string).trim(),
    mode: data.mode as Agent["mode"],
    model_class: data.model_class as ModelClass,
    can_block: data.can_block as boolean,
    write_scope: data.write_scope as string[],
    shell: data.shell as ShellGroup[],
    skills: data.skills as string[],
    body: parsed.body,
    file: path,
  };
}

function readModelEntry(where: string, value: unknown, problems: string[]): ModelEntry | null {
  if (!isObject(value)) {
    problems.push(`${where} must be a map with family, model, and confirmed.`);
    return null;
  }
  const before = problems.length;
  if (typeof value.family !== "string" || !value.family) problems.push(`${where}.family must be a string.`);
  if (typeof value.model !== "string" || !value.model) problems.push(`${where}.model must be a string.`);
  if (typeof value.confirmed !== "boolean") problems.push(`${where}.confirmed must be true or false.`);
  if (value.fallback !== undefined && (typeof value.fallback !== "string" || !value.fallback)) problems.push(`${where}.fallback must be a string.`);
  if (value.fallback_confirmed !== undefined) {
    if (typeof value.fallback_confirmed !== "boolean") problems.push(`${where}.fallback_confirmed must be true or false.`);
    if (value.fallback === undefined) problems.push(`${where} sets fallback_confirmed but has no fallback.`);
  }
  if (problems.length > before) return null;
  return value as unknown as ModelEntry;
}

function readModels(root: string, problems: string[]): { classes: Set<string>; tools: Partial<Record<ToolName, ToolModels>> } {
  const path = "chrysalis/models.yaml";
  let data: unknown;
  try {
    data = Bun.YAML.parse(readFileSync(join(root, path), "utf8"));
  } catch (error) {
    problems.push(`${path} isn't valid YAML. ${(error as Error).message}`);
    return { classes: new Set(MODEL_CLASSES), tools: {} };
  }
  if (!isObject(data) || !isObject(data.classes) || !isObject(data.tools)) {
    problems.push(`${path} needs a classes map and a tools map.`);
    return { classes: new Set(MODEL_CLASSES), tools: {} };
  }
  const classes = new Set(Object.keys(data.classes));
  const expected = [...MODEL_CLASSES].sort().join(", ");
  if ([...classes].sort().join(", ") !== expected) problems.push(`${path}: classes must be exactly ${expected}.`);
  const tools: Partial<Record<ToolName, ToolModels>> = {};
  for (const [name, value] of Object.entries(data.tools)) {
    if (!(TOOLS as readonly string[]).includes(name)) {
      problems.push(`${path}: unknown tool "${name}". Tools: ${TOOLS.join(", ")}.`);
      continue;
    }
    if (!isObject(value)) {
      problems.push(`${path}: tools.${name} must be a map.`);
      continue;
    }
    const entries: Partial<Record<ModelClass, ModelEntry>> = {};
    let complete = true;
    for (const cls of MODEL_CLASSES) {
      const entry = readModelEntry(`${path}: tools.${name}.${cls}`, value[cls], problems);
      if (entry) entries[cls] = entry;
      else complete = false;
    }
    if (complete) tools[name as ToolName] = { single_family: value.single_family === true, classes: entries as Record<ModelClass, ModelEntry> };
  }
  return { classes, tools };
}

/** Every string leaf under a profile's commands map, in order, except the working directory. */
function collectCommands(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectCommands(item, out);
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) if (key !== "working_directory") collectCommands(item, out);
}

function readStacks(root: string, problems: string[]): StackProfile[] {
  const dir = join(root, "chrysalis", "stacks");
  if (!existsSync(dir)) return [];
  const stacks: StackProfile[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!statSync(join(dir, name)).isDirectory()) continue;
    const path = `chrysalis/stacks/${name}/profile.yaml`;
    if (!existsSync(join(root, path))) {
      problems.push(`chrysalis/stacks/${name}/ has no profile.yaml.`);
      continue;
    }
    let data: unknown;
    try {
      data = Bun.YAML.parse(readFileSync(join(root, path), "utf8"));
    } catch (error) {
      problems.push(`${path} isn't valid YAML. ${(error as Error).message}`);
      continue;
    }
    if (!isObject(data) || data.name !== name) {
      problems.push(`${path}: name must be "${name}", the folder's name.`);
      continue;
    }
    const scopes: Record<string, string[]> = {};
    if (!isObject(data.write_scopes)) {
      problems.push(`${path}: write_scopes must map each layer to a list of paths.`);
      continue;
    }
    for (const [layer, patterns] of Object.entries(data.write_scopes)) {
      if (!stringList(patterns) || !patterns.every((p) => p.startsWith(`apps/${APP_PLACEHOLDER}/`))) {
        problems.push(`${path}: write_scopes.${layer} must be a list of paths that start with apps/${APP_PLACEHOLDER}/.`);
        continue;
      }
      scopes[layer] = patterns;
    }
    const commands: string[] = [];
    collectCommands(data.commands, commands);
    const workdir = isObject(data.commands) && typeof data.commands.working_directory === "string" ? data.commands.working_directory : null;
    stacks.push({ name, write_scopes: scopes, commands: [...new Set(commands)], working_directory: workdir });
  }
  return stacks;
}

/** Reads and checks the factory's sources under root. Throws a FactoryError that lists every problem. */
export function loadFactory(root: string): Factory {
  const problems: string[] = [];
  const models = readModels(root, problems);
  const stacks = readStacks(root, problems);
  const layers = new Set(stacks.flatMap((stack) => Object.keys(stack.write_scopes)));
  const dir = join(root, "chrysalis", "agents");
  const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith(".md")).sort() : [];
  if (!files.length) problems.push("chrysalis/agents/ has no agent files.");
  const agents = files.map((file) => readAgent(root, file, models.classes, layers, problems)).filter((a): a is Agent => a !== null);
  if (problems.length) throw new FactoryError(problems);
  return { root, agents, models: models.tools, stacks };
}

/** Reads the stack that apps/<app>/app.yaml names, or null when the app or its stack can't be read. */
export function appStack(root: string, app: string, stacks: StackProfile[]): StackProfile | null {
  const path = join(root, "apps", app, "app.yaml");
  if (!existsSync(path)) return null;
  try {
    const data = Bun.YAML.parse(readFileSync(path, "utf8"));
    const name = isObject(data) ? data.stack : null;
    return stacks.find((stack) => stack.name === name) ?? null;
  } catch {
    return null;
  }
}
