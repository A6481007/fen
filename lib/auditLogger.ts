import "server-only";

import { randomUUID } from "crypto";
import { getBackofficeContext } from "@/lib/authz";
import { adminDb, Timestamp } from "@/lib/firebaseAdmin";

type AuditLogInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

type AuditLogResult = {
  success: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
};

/**
 * Records an append-only audit log entry to Firestore.
 * Does not throw on failure; errors are logged and returned to the caller.
 */
export const recordAuditLog = async (input: AuditLogInput): Promise<AuditLogResult> => {
  if (!adminDb) {
    console.warn("[audit] Skipping audit log: Firestore admin client unavailable");
    return { success: false, skipped: true, error: "firestore_unavailable" };
  }

  try {
    const ctx = await getBackofficeContext();
    const logDoc = {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      requestId: input.requestId ?? randomUUID(),
      metadata: input.metadata ?? {},
      actorClerkUserId: ctx.clerkUserId,
      actorEmail: ctx.email,
      actorIsAdmin: ctx.isAdmin,
      actorStaffRoles: ctx.staffRoles,
      actorPermissions: ctx.permissions,
      timestamp: Timestamp.now(),
      source: "backoffice",
    };

    const docRef = await adminDb.collection("auditLogs").add(logDoc);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("[audit] Failed to write audit log", { error, action: input.action });
    return {
      success: false,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
};
