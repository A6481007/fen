# Authentication Standard

## Decision
- Canonical API auth provider: Clerk (`@clerk/nextjs/server`).
- Rationale: Every existing protected API route already uses Clerk; Clerk roles + email allowlist (`isUserAdmin`) are the enforced admin controls. NextAuth only appears in client-side hooks/tests and is **not** used to gate API routes.
- Spec note: Original spec referenced NextAuth (see 4.1 §1.4.3 and 4_1_0_3_IssueFix__Campaigns_List_API______Auth_Deviation.md). We are standardizing on Clerk to match current production wiring and reduce dual-provider drift.

## Required Pattern (API routes)
- Import from `@clerk/nextjs/server`: `auth` for session, `clerkClient` for user lookup. Do not import `next-auth` in `app/api/**`.
- Guard template for admin endpoints:
  ```ts
  import { auth, clerkClient } from "@clerk/nextjs/server";
  import { isUserAdmin } from "@/lib/adminUtils";

  async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return { ok: false, status: 401, message: "Authentication required" };

    const user = await (await clerkClient()).users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email || !isUserAdmin(email)) {
      return { ok: false, status: 403, message: "Forbidden: admin access required" };
    }
    return { ok: true as const, email };
  }
  ```
- For member-only endpoints, check `userId` and attach `userId`/email to downstream logic; respond with 401 otherwise.
- Cache policy: admin endpoints should set `cache: "no-store"` or omit revalidation to avoid leaking data.

## Audit + Coverage
- Audit results are tracked in `docs/auth-audit.csv` (provider per route, actions).
- Consistency enforcement: `__tests__/api/auth-consistency.test.ts` fails if any API route imports `next-auth` or if admin routes skip the Clerk guard.

## Verification Checklist
- [x] Canonical provider documented (Clerk)
- [x] Admin routes aligned to Clerk guard
- [x] Campaigns list API uses the standard guard
- [x] Auth consistency test added
