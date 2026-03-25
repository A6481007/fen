import { describe, expect, it, vi } from "vitest";

import { predictChurn, type ChurnSignals } from "@/lib/promotions/churnPrediction";

vi.mock("server-only", () => ({}), { virtual: true });

describe("churnPrediction", () => {
  it("classifies active users as low risk with no action", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 5,
      daysSinceLastLogin: 2,
      purchaseFrequencyTrend: 0.5,
      aovTrend: 0.5,
      engagementTrend: 0.4,
      abandonmentRate: 0.1,
      ltv: 120,
      ordersCount: 2,
    };

    const result = predictChurn(signals);

    expect(result.churnProbability).toBeCloseTo(0.18, 2);
    expect(result.riskLevel).toBe("low");
    expect(result.recommendedAction.type).toBe("none");
    expect(result.suggestedDiscount).toBe(0);
  });

  it("marks declining users as high risk and recommends win-back", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 70,
      daysSinceLastLogin: 45,
      purchaseFrequencyTrend: -0.4,
      aovTrend: -0.2,
      engagementTrend: -0.2,
      abandonmentRate: 0.4,
      ltv: 180,
      ordersCount: 3,
    };

    const result = predictChurn(signals);

    expect(result.churnProbability).toBeCloseTo(0.64, 2);
    expect(result.riskLevel).toBe("high");
    expect(result.contributingFactors).toEqual(
      expect.arrayContaining([
        "No purchase in 70 days",
        "Declining purchase frequency",
        "Declining order values",
        "Reduced site engagement",
      ]),
    );
    expect(result.recommendedAction).toMatchObject({
      type: "win_back_offer",
      template: "win_back_standard",
      priority: 2,
      discount: 15,
      validityDays: 7,
    });
    expect(result.suggestedDiscount).toBe(15);
  });

  it("caps critical VIP rescue discounts at maxDiscount", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 140,
      daysSinceLastLogin: 100,
      purchaseFrequencyTrend: -0.8,
      aovTrend: -0.6,
      engagementTrend: -0.7,
      abandonmentRate: 0.8,
      ltv: 800,
      ordersCount: 8,
    };

    const result = predictChurn(signals);

    expect(result.riskLevel).toBe("critical");
    expect(result.churnProbability).toBeGreaterThanOrEqual(0.85);
    expect(result.recommendedAction).toMatchObject({
      type: "vip_rescue",
      template: "vip_last_chance",
      priority: 3,
      discount: 30,
      validityDays: 3,
    });
  });
});
