"use client";

import type { PropsWithChildren } from "react";

/**
 * Wrapper for Radix UI context (keeps tree shape stable).
 * Radix v1 removed the old IdProvider; we keep this shim so layout imports work.
 */
export default function RadixProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
