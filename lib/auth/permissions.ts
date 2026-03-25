export type Scope =
  | "content.insights.read"
  | "content.insights.edit"
  | "content.insights.publish"
  | "content.insights.delete"
  | "content.taxonomy.manage"
  | "content.banners.manage"
  | "analytics.read";

export type Role =
  | "admin"
  | "content_admin"
  | "insight_editor"
  | "translator"
  | "analyst";

export const ALL_SCOPES: Scope[] = [
  "content.insights.read",
  "content.insights.edit",
  "content.insights.publish",
  "content.insights.delete",
  "content.taxonomy.manage",
  "content.banners.manage",
  "analytics.read",
];

export const ROLE_SCOPE_MAP: Record<Role, Scope[]> = {
  admin: ALL_SCOPES,
  content_admin: [
    "content.insights.read",
    "content.insights.edit",
    "content.insights.publish",
    "content.taxonomy.manage",
    "content.banners.manage",
    "analytics.read",
  ],
  insight_editor: ["content.insights.read", "content.insights.edit"],
  translator: ["content.insights.read", "content.insights.edit"],
  analyst: ["analytics.read", "content.insights.read"],
};

type Metadata = Record<string, unknown> | null | undefined;

type ClerkUserLike = {
  scopes?: string[];
  publicMetadata?: Metadata;
  privateMetadata?: Metadata;
  unsafeMetadata?: Metadata;
  role?: string | string[] | null;
  roles?: string | string[] | null;
};

const normalizeToken = (value: string) => value.trim().toLowerCase();

const readListValue = (value: unknown) => {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") return [value];
  return [] as string[];
};

const readMetadataList = (meta: Metadata, key: string) =>
  readListValue(meta?.[key]);

const readMetadataRoles = (meta?: Metadata) => {
  if (!meta) return [] as string[];
  const candidate = meta.role ?? meta.roles;
  return readListValue(candidate).map(normalizeToken);
};

const readMetadataScopes = (meta?: Metadata) => {
  if (!meta) return [] as string[];
  const candidate = meta.scopes ?? meta.scope;
  return readListValue(candidate).map(normalizeToken);
};

export const resolveScopes = (user: ClerkUserLike | null | undefined): Scope[] => {
  if (!user) return [] as Scope[];

  const directScopes = new Set<string>();
  (user.scopes || []).forEach((scope) => {
    if (typeof scope === "string" && scope.trim()) {
      directScopes.add(normalizeToken(scope));
    }
  });

  readMetadataScopes(user.publicMetadata).forEach((scope) => directScopes.add(scope));
  readMetadataScopes(user.privateMetadata).forEach((scope) => directScopes.add(scope));
  readMetadataScopes(user.unsafeMetadata).forEach((scope) => directScopes.add(scope));

  const roles = new Set<string>();
  readListValue(user.role).forEach((role) => roles.add(normalizeToken(role)));
  readListValue(user.roles).forEach((role) => roles.add(normalizeToken(role)));
  readMetadataRoles(user.publicMetadata).forEach((role) => roles.add(role));
  readMetadataRoles(user.privateMetadata).forEach((role) => roles.add(role));
  readMetadataRoles(user.unsafeMetadata).forEach((role) => roles.add(role));

  if (roles.has("admin")) {
    return [...ALL_SCOPES];
  }

  roles.forEach((role) => {
    const mapped = ROLE_SCOPE_MAP[role as Role];
    if (mapped) {
      mapped.forEach((scope) => directScopes.add(scope));
    }
  });

  return Array.from(directScopes)
    .filter((scope): scope is Scope => ALL_SCOPES.includes(scope as Scope));
};

export function hasScope(user: { scopes?: string[] }, scope: Scope): boolean {
  return !!user.scopes?.includes(scope);
}

export const hasResolvedScope = (
  user: ClerkUserLike | null | undefined,
  scope: Scope
) => {
  const scopes = resolveScopes(user);
  return scopes.includes(scope);
};

export const canAccessLocale = (
  user: ClerkUserLike | null | undefined,
  locale: string
) => {
  const locales = new Set<string>();
  readMetadataList(user?.publicMetadata, "locales").forEach((value) => locales.add(normalizeToken(value)));
  readMetadataList(user?.privateMetadata, "locales").forEach((value) => locales.add(normalizeToken(value)));
  readMetadataList(user?.unsafeMetadata, "locales").forEach((value) => locales.add(normalizeToken(value)));

  if (locales.size === 0) return true;
  return locales.has(normalizeToken(locale));
};
