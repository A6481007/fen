import { test, expect } from "@playwright/test";
import { E2EHarness } from "../../utils/harness";

test.describe("Fraud prevention", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("rate limits excessive requests", () => {
    let decision;
    for (let i = 0; i < 6; i += 1) {
      decision = harness.checkFraud({
        campaignId: "flash-1",
        action: "click",
        userId: "returning",
      });
    }
    expect(decision?.action).toBe("deny");
    expect(decision?.reason).toBe("rate_limited");
  });

  test("detects velocity anomalies", () => {
    for (let i = 0; i < 4; i += 1) {
      harness.trackEvent({
        campaignId: "flash-1",
        action: "view",
        userId: "returning",
      });
    }

    const decision = harness.checkFraud({
      campaignId: "flash-1",
      action: "purchase",
      userId: "returning",
      orderValue: 80,
    });

    expect(decision.action).toBe("challenge");
    expect(decision.reason).toBe("velocity");
  });

  test("challenges new accounts on high-value orders", () => {
    const now = Date.now();
    harness.state.users["newbie"] = {
      id: "newbie",
      segment: "firstTime",
      orders: 0,
      ltv: 0,
      createdAt: now - 30 * 60 * 1000,
    };

    const decision = harness.checkFraud({
      campaignId: "flash-1",
      action: "purchase",
      userId: "newbie",
      orderValue: 200,
    });

    expect(decision.action).toBe("challenge");
    expect(decision.reason).toBe("new_account_high_value");
  });

  test("denies blocklisted users", () => {
    const decision = harness.checkFraud({
      campaignId: "flash-1",
      action: "click",
      userId: "blocklisted",
    });

    expect(decision.action).toBe("deny");
    expect(decision.reason).toBe("blocklisted");
  });

  test("flags geographic anomalies", () => {
    const first = harness.checkFraud({
      campaignId: "flash-1",
      action: "view",
      userId: "returning",
      country: "US",
    });
    expect(first.action).toBe("allow");

    const second = harness.checkFraud({
      campaignId: "flash-1",
      action: "click",
      userId: "returning",
      country: "FR",
    });
    expect(second.action).toBe("challenge");
    expect(second.reason).toBe("geo_anomaly");
  });
});
