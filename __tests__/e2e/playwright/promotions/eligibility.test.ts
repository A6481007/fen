import { test, expect } from "@playwright/test";
import { E2EHarness } from "../../utils/harness";

test.describe("Promotion eligibility", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("first-time user sees firstTime promotions", () => {
    const result = harness.checkEligibility({ userId: "firstTimer" });
    const campaigns = result.eligible.map((item) => item.campaignId);
    expect(result.userSegment).toBe("firstTime");
    expect(campaigns).toContain("first-1");
  });

  test("VIP user sees VIP promotions", () => {
    const result = harness.checkEligibility({ userId: "vip" });
    const campaigns = result.eligible.map((item) => item.campaignId);
    expect(campaigns).toContain("vip-1");
  });

  test("budget cap prevents over-redemption", () => {
    harness.seedUsage("flash-1", { budgetSpent: 5_100 });
    const result = harness.checkEligibility({ userId: "returning" });
    const budgetLimited = result.ineligible.find((item) => item.campaignId === "flash-1");
    expect(budgetLimited?.reasons).toContain("budget_exhausted");
  });

  test("per-customer limit is enforced", () => {
    const perUser = new Map<string, number>([["returning-user", 2]]);
    harness.seedUsage("flash-1", { perUser, total: 2 });
    const result = harness.checkEligibility({ userId: "returning" });
    const limited = result.ineligible.find((item) => item.campaignId === "flash-1");
    expect(limited?.reasons).toContain("per_customer_limit");
  });

  test("A/B variant assignment is deterministic", () => {
    const first = harness.assignVariant("ab-1", "user-1", "session-1");
    const second = harness.assignVariant("ab-1", "user-1", "session-1");
    const differentSeed = harness.assignVariant("ab-1", "user-2", "session-2");

    expect(first).toBe(second);
    expect(["control", "variantA", "variantB"]).toContain(differentSeed);
  });
});
