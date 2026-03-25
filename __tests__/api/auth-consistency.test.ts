import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const API_DIR = path.join(ROOT, "app", "api");
const AUDIT_PATH = path.join(ROOT, "docs", "auth-audit.csv");
const CANONICAL_PROVIDER = "@clerk/nextjs/server";

type RouteRecord = {
  abs: string;
  rel: string;
  content: string;
};

function collectRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (entry.isFile() && entry.name === "route.ts") {
      files.push(full);
    }
  }

  return files;
}

const routes: RouteRecord[] = collectRouteFiles(API_DIR).map((file) => ({
  abs: file,
  rel: path.relative(ROOT, file).replace(/\\/g, "/"),
  content: fs.readFileSync(file, "utf8"),
}));

describe("API auth consistency", () => {
  it("avoids next-auth in API routes", () => {
    const offenders = routes.filter((route) => route.content.includes("next-auth"));
    expect(offenders.map((route) => route.rel)).toEqual([]);
  });

  it("guards admin routes with the canonical provider", () => {
    const adminRoutes = routes.filter((route) => route.rel.startsWith("app/api/admin/"));
    const missingClerk = adminRoutes.filter(
      (route) => !route.content.includes(CANONICAL_PROVIDER)
    );
    expect(missingClerk.map((route) => route.rel)).toEqual([]);
  });

  it("keeps the auth audit in sync with route files", () => {
    const auditContent = fs.readFileSync(AUDIT_PATH, "utf8");
    const auditRoutes = new Set(
      auditContent
        .split("\n")
        .slice(1) // skip header
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(",")[0])
    );

    const missingInAudit = routes
      .map((route) => route.rel)
      .filter((rel) => !auditRoutes.has(rel));
    const staleAudit = Array.from(auditRoutes).filter(
      (rel) => !routes.find((route) => route.rel === rel)
    );

    expect({ missingInAudit, staleAudit }).toEqual({
      missingInAudit: [],
      staleAudit: [],
    });
  });

  it("documents the canonical provider", () => {
    const doc = fs.readFileSync(path.join(ROOT, "docs", "AUTH_STANDARD.md"), "utf8");
    expect(doc).toContain("Canonical API auth provider: Clerk");
    expect(doc).toContain(CANONICAL_PROVIDER);
  });
});
