// Reads and writes the tracker fields as YAML, for the local tracker's frontmatter and the GitHub
// tracker's fields block. Unset fields are written as "none".
import { FIELD_NAMES, GATE_NAMES, STATUS_NAMES, TrackerError, emptyFields } from "./rules";
import type { Fields, Gate, Status } from "./rules";

/** Writes a string plain when YAML reads it back unchanged, and quoted otherwise. */
export function yamlScalar(value: string): string {
  try {
    const parsed = (Bun.YAML.parse(`k: ${value}`) as { k: unknown }).k;
    if (parsed === value && !value.includes("\n")) return value;
  } catch {
    // Fall through to quoting.
  }
  return JSON.stringify(value);
}

export function fieldLines(fields: Fields): string[] {
  const blocks = Object.entries(fields.blocks)
    .map(([gate, count]) => `${gate}: ${count}`)
    .join(", ");
  return FIELD_NAMES.map((name) => {
    if (name === "blocks") return `blocks: {${blocks}}`;
    const value = fields[name];
    return `${name}: ${value === null ? "none" : yamlScalar(String(value))}`;
  });
}

const str = (v: unknown): string | null => (v === undefined || v === null || v === "none" ? null : String(v));

/** Reads the tracker fields from parsed YAML. Unknown keys are ignored. */
export function readFields(data: Record<string, unknown>, where: string): Fields {
  const fields = emptyFields();
  fields.parent = str(data.parent);
  fields.spec = str(data.spec);
  fields.spec_sha = str(data.spec_sha);
  fields.red_sha = str(data.red_sha);
  fields.branch = str(data.branch);
  fields.pr = str(data.pr);
  const blockedBy = str(data.blocked_by);
  if (blockedBy !== null && !GATE_NAMES.includes(blockedBy as Gate)) throw new TrackerError(`${where}: unknown gate "${blockedBy}" in blocked_by.`);
  fields.blocked_by = blockedBy as Gate | null;
  const prior = str(data.prior_status);
  if (prior !== null && !STATUS_NAMES.includes(prior as Status)) throw new TrackerError(`${where}: unknown status "${prior}" in prior_status.`);
  fields.prior_status = prior as Status | null;
  const blocks = data.blocks;
  if (blocks !== undefined && blocks !== null && blocks !== "none") {
    if (typeof blocks !== "object" || Array.isArray(blocks)) throw new TrackerError(`${where}: blocks must be a map of gate to count.`);
    for (const [gate, count] of Object.entries(blocks as Record<string, unknown>)) {
      if (!GATE_NAMES.includes(gate as Gate) || !Number.isInteger(count)) throw new TrackerError(`${where}: bad blocks entry "${gate}: ${count}".`);
      fields.blocks[gate as Gate] = count as number;
    }
  }
  return fields;
}
