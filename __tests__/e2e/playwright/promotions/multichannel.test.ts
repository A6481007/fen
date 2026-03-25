import { test, expect } from "@playwright/test";
import { E2EHarness } from "../../utils/harness";

test.describe("Multi-channel messaging", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("sends SMS for cart abandonment", () => {
    const sms = harness.sendSms({ userId: "returning", campaignId: "flash-1" });
    expect(sms.success).toBe(true);
    expect(sms.quietHours).toBe(false);
  });

  test("sends push notification for flash sale", () => {
    const push = harness.sendPush({ userId: "returning", campaignId: "flash-1" });
    expect(push.success).toBe(true);
  });

  test("respects quiet hours", () => {
    const late = new Date(harness.state.nowMs);
    late.setHours(23, 0, 0, 0);
    harness.setNow(late);

    const sms = harness.sendSms({ userId: "returning", campaignId: "flash-1" });
    expect(sms.success).toBe(false);
    expect(sms.quietHours).toBe(true);
  });

  test("enforces frequency caps for push", () => {
    harness.sendPush({ userId: "returning", campaignId: "flash-1" });
    harness.sendPush({ userId: "returning", campaignId: "flash-1" });
    const third = harness.sendPush({ userId: "returning", campaignId: "flash-1" });

    expect(third.success).toBe(false);
    expect(third.capped).toBe(true);
  });

  test("applies SMS frequency caps per day", () => {
    harness.sendSms({ userId: "vip", campaignId: "vip-1" });
    harness.sendSms({ userId: "vip", campaignId: "vip-1" });
    const third = harness.sendSms({ userId: "vip", campaignId: "vip-1" });

    expect(third.success).toBe(false);
    expect(third.capped).toBe(true);
  });
});
