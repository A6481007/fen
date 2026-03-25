import { type BackofficePermission } from "@/config/authz";
import { type BackofficeContext, requirePermission } from "@/lib/authz";
import { adminDb, firebaseAdminAvailable } from "@/lib/firebaseAdmin";
import { backendClient } from "@/sanity/lib/backendClient";

export type ActionSuccess<T> = { success: true; data: T; message?: string };
export type ActionError = {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};

export type ActionResult<T> = ActionSuccess<T> | ActionError;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Server-only Sanity client that includes drafts for backoffice reads.
// Never import this into client components.
export const backofficeReadClient = backendClient.withConfig({
  perspective: "drafts",
});

export const normalizePagination = (params: PaginationParams = {}) => {
  const limit =
    typeof params.limit === "number" && params.limit > 0
      ? Math.min(Math.floor(params.limit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const offset =
    typeof params.offset === "number" && params.offset > 0
      ? Math.floor(params.offset)
      : 0;

  return { limit, offset, end: offset + limit };
};

export const handleActionError = (
  error: unknown,
  fallbackMessage: string,
  status?: number,
): ActionError => {
  const derivedStatus =
    status ??
    (error && typeof error === "object" && "status" in error && typeof (error as { status?: number }).status === "number"
      ? (error as { status?: number }).status
      : undefined);

  console.error(fallbackMessage, error);
  return {
    success: false,
    message: error instanceof Error ? error.message : fallbackMessage,
    status: derivedStatus,
  };
};

export async function withActionAuth<T>(
  permission: BackofficePermission | BackofficePermission[],
  operation: (ctx: BackofficeContext) => Promise<T>,
  options?: { actionName?: string; errorMessage?: string },
): Promise<ActionResult<T>> {
  try {
    const ctx = await requirePermission(permission);
    const data = await operation(ctx);
    return { success: true, data };
  } catch (error) {
    const message =
      options?.errorMessage ??
      `Failed to run ${options?.actionName ?? "backoffice action"}`;
    return handleActionError(error, message);
  }
}

export const withFirestore = <T>(
  operation: (db: NonNullable<typeof adminDb>) => Promise<T>,
  errorMessage = "Firestore is not configured",
): Promise<ActionResult<T>> => {
  if (!firebaseAdminAvailable || !adminDb) {
    return Promise.resolve({
      success: false,
      message: errorMessage,
      status: 503,
    });
  }

  return operation(adminDb)
    .then((data): ActionSuccess<T> => ({ success: true as const, data }))
    .catch((error): ActionError => handleActionError(error, errorMessage));
};

export const coerceString = (value?: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const coerceArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export const nowIso = () => new Date().toISOString();

/**
 * Normalizes a Sanity document id to both published and draft variants.
 * - Strips leading "drafts." when present.
 * - Returns null when the value is empty.
 */
export const normalizeDocumentIds = (
  id?: string | null,
  label?: string,
): { id: string; draftId: string } | null => {
  const raw = typeof id === "string" ? id.trim() : "";
  if (!raw) return null;
  const baseId = raw.startsWith("drafts.") ? raw.replace(/^drafts\./, "") : raw;
  if (!baseId) return null;
  return { id: baseId, draftId: `drafts.${baseId}` };
};

export type LocaleReference = { _type: "reference"; _ref: string };

export const resolveLocaleReference = async (
  input?: LocaleReference | { _ref?: string | null } | string | null,
): Promise<LocaleReference | undefined> => {
  if (!input) return undefined;

  if (typeof input === "string") {
    const code = input.trim();
    if (!code) return undefined;
    const localeId = await backofficeReadClient.fetch<string | null>(
      '*[_type == "locale" && lower(code) == $code][0]._id',
      { code: code.toLowerCase() },
    );
    return localeId ? { _type: "reference", _ref: localeId } : undefined;
  }

  if (typeof input === "object" && input._ref) {
    return { _type: "reference", _ref: input._ref };
  }

  return undefined;
};
