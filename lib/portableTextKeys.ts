import { randomUUID } from "crypto";

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  Object.prototype.toString.call(value) === "[object Object]";

const makeKey = () =>
  (typeof randomUUID === "function"
    ? randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 16);

const normalizeArray = (arr: unknown[]): { value: unknown[]; changed: boolean } => {
  let changed = false;

  const value = arr.map((item) => {
    if (Array.isArray(item)) {
      const nested = normalizeArray(item);
      if (nested.changed) changed = true;
      return nested.value;
    }

    if (!isPlainObject(item)) return item;

    let itemChanged = false;
    const next: PlainObject = { ...item };

    if (!next._key) {
      next._key = makeKey();
      itemChanged = true;
    }

    for (const [key, val] of Object.entries(next)) {
      if (Array.isArray(val)) {
        const nested = normalizeArray(val);
        if (nested.changed) {
          next[key] = nested.value;
          itemChanged = true;
        }
      }
    }

    if (itemChanged) changed = true;
    return next;
  });

  return { value, changed };
};

export const ensurePortableTextArrayKeys = (
  blocks: unknown,
): { value?: unknown[]; changed: boolean } => {
  if (!Array.isArray(blocks)) return { value: undefined, changed: false };
  const { value, changed } = normalizeArray(blocks);
  return { value, changed };
};

export const buildPortableTextPatch = (
  doc: Record<string, unknown>,
  fields: string[],
): { patch: Record<string, unknown>; changed: boolean } => {
  const patch: Record<string, unknown> = {};
  let changed = false;

  for (const field of fields) {
    const { value, changed: fieldChanged } = ensurePortableTextArrayKeys((doc as any)[field]);
    if (fieldChanged && value) {
      patch[field] = value;
      changed = true;
    }
  }

  return { patch, changed };
};

