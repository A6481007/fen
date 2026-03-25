import { test, expect } from "@playwright/test";
import { E2EHarness, renderAnalyticsPage } from "../../utils/harness";

test.describe("Promotion analytics tracking", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("tracks view event on page load", async ({ page }) => {
    await renderAnalyticsPage(page, harness, {
      campaignId: "ab-1",
      userId: "returning",
      sessionId: "sess-analytics",
    });
    await page.waitForFunction(() => (window as any).fbqCalls?.length >= 1);

    const snapshot = harness.analyticsSnapshot("ab-1");
    expect(snapshot.events).toBeGreaterThanOrEqual(1);
    const view = harness.state.analytics.find(
      (event) => event.campaignId === "ab-1" && event.action === "view",
    );
    expect(view).toBeTruthy();
  });

  test("tracks click event when CTA is clicked", async ({ page }) => {
    await renderAnalyticsPage(page, harness, {
      campaignId: "ab-1",
      userId: "returning",
      sessionId: "sess-cta",
    });
    await page.click("#cta");

    const clickEvents = harness.state.analytics.filter(
      (event) => event.campaignId === "ab-1" && event.action === "click",
    );
    expect(clickEvents.length).toBe(1);
  });

  test("attributes conversion to campaign", async ({ page }) => {
    await renderAnalyticsPage(page, harness, {
      campaignId: "ab-1",
      userId: "returning",
      sessionId: "sess-conv",
    });
    await page.click("#convert");

    const snapshot = harness.analyticsSnapshot("ab-1");
    expect(snapshot.conversions).toBe(1);
  });

  test("fires Facebook pixel events", async ({ page }) => {
    await renderAnalyticsPage(page, harness, {
      campaignId: "ab-1",
      userId: "returning",
      sessionId: "sess-fb",
    });
    await page.click("#cta");

    const fbqCalls = await page.evaluate(() => (window as any).fbqCalls);
    expect(fbqCalls.some((entry: any[]) => entry[0] === "track" && entry[1] === "view")).toBe(
      true,
    );
    expect(
      fbqCalls.some((entry: any[]) => entry[0] === "track" && entry[1] === "click"),
    ).toBe(true);
  });

  test("fires GA4 events", async ({ page }) => {
    await renderAnalyticsPage(page, harness, {
      campaignId: "ab-1",
      userId: "returning",
      sessionId: "sess-ga4",
    });
    await page.click("#convert");

    const gtagCalls = await page.evaluate(() => (window as any).gtagCalls);
    expect(
      gtagCalls.some((entry: any[]) => entry[0] === "event" && entry[1] === "view"),
    ).toBe(true);
    expect(
      gtagCalls.some((entry: any[]) => entry[0] === "event" && entry[1] === "conversion"),
    ).toBe(true);
  });
});
