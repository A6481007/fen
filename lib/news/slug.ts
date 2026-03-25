const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeNewsSlug = (value?: string | null): string => {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "";

  const normalized = raw
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

  return normalized;
};

export const isValidNewsSlug = (value?: string | null): boolean => {
  if (typeof value !== "string") return false;
  return SLUG_PATTERN.test(value.trim());
};
