import { test, expect } from "@playwright/test";
import { E2EHarness, renderDiscoveryPage } from "../../utils/harness";

test.describe("Promotion discovery", () => {
  let harness: E2EHarness;

  test.beforeEach(() => {
    harness = new E2EHarness();
  });

  test("homepage shows active promotions", async ({ page }) => {
    await renderDiscoveryPage(page, harness, { userId: "returning" });
    const active = harness.listPromotions({ userId: "returning" }).length;
    await expect(page.locator("[data-campaign]")).toHaveCount(active);
    await expect(page.locator('[data-state="ended"]')).toHaveCount(0);
  });

  test("flash sale appears with countdown", async ({ page }) => {
    await renderDiscoveryPage(page, harness, { userId: "returning" });
    const countdown = page.locator('[data-campaign="flash-1"] .countdown');
    await expect(countdown).toContainText("h");
    await expect(countdown).not.toContainText("ended");
  });

  test("VIP promotion is hidden from non-VIP users", async ({ page }) => {
    await renderDiscoveryPage(page, harness, { userId: "returning" });
    await expect(page.locator('[data-campaign="vip-1"]')).toHaveCount(0);

    await renderDiscoveryPage(page, harness, { userId: "vip" });
    await expect(page.locator('[data-campaign="vip-1"]')).toHaveCount(1);
  });

  test("expired promotion shows ended state", async ({ page }) => {
    await renderDiscoveryPage(page, harness, { userId: "returning", includeEnded: true });
    const expired = page.locator('[data-campaign="expired-1"]');
    await expect(expired).toHaveAttribute("data-state", "ended");
    await expect(expired.locator(".countdown")).toContainText("ended");
  });

  test("filtering by type returns the correct promos", async ({ page }) => {
    await renderDiscoveryPage(page, harness, {
      userId: "returning",
      filterType: "flashSale",
    });
    const cards = page.locator("[data-campaign]");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("data-type", "flashSale");
  });
});
