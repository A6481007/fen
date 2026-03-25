import { test, expect } from "@playwright/test";
import { E2EHarness } from "../../utils/harness";

test.describe("Admin dashboard", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("shows active and ended promotion counts", () => {
    const snapshot = harness.adminSnapshot();
    expect(snapshot.active).toBeGreaterThan(0);
    expect(snapshot.ended).toBeGreaterThan(0);
  });

  test("reports top campaign conversions", () => {
    harness.redeemPromotion({
      campaignId: "flash-1",
      userId: "returning",
      sessionId: "admin-1",
      orderValue: 140,
    });

    const snapshot = harness.adminSnapshot();
    expect(snapshot.topCampaign?.campaignId).toBe("flash-1");
    expect(snapshot.topCampaign?.conversions).toBe(1);
  });

  test("surfaces fraud alerts", () => {
    harness.checkFraud({
      campaignId: "flash-1",
      action: "click",
      userId: "blocklisted",
    });

    const snapshot = harness.adminSnapshot();
    expect(snapshot.fraudAlerts.length).toBeGreaterThan(0);
    expect(snapshot.fraudAlerts[0]?.action).not.toBe("allow");
  });

  test("aggregates channel performance stats", () => {
    harness.sendSms({ userId: "vip", campaignId: "vip-1" });
    harness.sendPush({ userId: "vip", campaignId: "vip-1" });

    const snapshot = harness.adminSnapshot();
    expect(snapshot.messageStats.sms).toBeGreaterThan(0);
    expect(snapshot.messageStats.push).toBeGreaterThan(0);
  });

  test("captures variant performance distribution", () => {
    harness.assignVariant("ab-1", "user-1", "sess-1");
    harness.assignVariant("ab-1", "user-2", "sess-2");
    harness.assignVariant("ab-1", "user-3", "sess-3");

    const snapshot = harness.adminSnapshot();
    const variants = snapshot.variantPerformance["ab-1"];
    expect(variants).toBeTruthy();
    expect(
      (variants?.control ?? 0) + (variants?.variantA ?? 0) + (variants?.variantB ?? 0),
    ).toBeGreaterThan(0);
  });
});
