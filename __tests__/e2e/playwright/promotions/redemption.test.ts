import { test, expect } from "@playwright/test";
import { E2EHarness } from "../../utils/harness";

test.describe("Promotion redemption", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("allows eligible user to redeem and logs analytics", () => {
    const result = harness.redeemPromotion({
      campaignId: "flash-1",
      userId: "returning",
      sessionId: "sess-1",
      orderValue: 120,
    });

    expect(result.ok).toBe(true);
    expect(result.discountApplied).toBeGreaterThan(0);
    expect(harness.analyticsSnapshot("flash-1").conversions).toBe(1);
  });

  test("blocks redemption when budget is exhausted", () => {
    harness.seedUsage("flash-1", { budgetSpent: 5_200, total: 50 });
    const result = harness.redeemPromotion({
      campaignId: "flash-1",
      userId: "returning",
      sessionId: "sess-2",
      orderValue: 150,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_eligible");
  });

  test("enforces per-customer limit on redemption", () => {
    const perUser = new Map<string, number>([["returning-user", 2]]);
    harness.seedUsage("flash-1", { perUser, total: 2 });

    const result = harness.redeemPromotion({
      campaignId: "flash-1",
      userId: "returning",
      sessionId: "sess-3",
      orderValue: 180,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_eligible");
  });

  test("records revenue and conversions after redemption", () => {
    harness.redeemPromotion({
      campaignId: "bundle-1",
      userId: "returning",
      sessionId: "sess-4",
      orderValue: 200,
    });

    const snapshot = harness.analyticsSnapshot("bundle-1");
    expect(snapshot.conversions).toBe(1);
    expect(snapshot.revenue).toBeGreaterThan(0);
    expect(snapshot.budgetSpent).toBeGreaterThan(0);
  });

  test("returns challenge decision on suspicious velocity", () => {
    for (let i = 0; i < 4; i += 1) {
      harness.trackEvent({
        campaignId: "flash-1",
        action: "click",
        userId: "returning",
        sessionId: "sess-velocity",
      });
    }

    const result = harness.redeemPromotion({
      campaignId: "flash-1",
      userId: "returning",
      sessionId: "sess-velocity",
      orderValue: 90,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("challenge");
    expect(result.decision?.action).toBe("challenge");
  });
});
