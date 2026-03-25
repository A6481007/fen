"use client";

import { useEffect, type ReactNode } from "react";
import type { LockBadgeVariant } from "./LockBadge";

export type AccessLevel = "public" | LockBadgeVariant;

/**
 * Renders protected children or a fallback while stamping the resolved access level for analytics/a11y.
 * Triggers `onAccessDenied` once when `accessible` is false.
 */
export interface AccessControlProps {
  children: ReactNode;
  fallback: ReactNode;
  accessible: boolean;
  accessLevel?: AccessLevel;
  onAccessDenied?: () => void;
}

const AccessControl = ({
  children,
  fallback,
  accessible,
  accessLevel = "public",
  onAccessDenied,
}: AccessControlProps) => {
  /**
   * Default to "public" so analytics and lock badges always receive a concrete value.
   */
  const resolvedAccessLevel = accessLevel ?? "public";

  useEffect(() => {
    if (!accessible) {
      onAccessDenied?.();
    }
  }, [accessible, onAccessDenied, resolvedAccessLevel]);

  const content = accessible ? children : fallback;

  return (
    <span data-access-level={resolvedAccessLevel} style={{ display: "contents" }}>
      {content}
    </span>
  );
};

export default AccessControl;
