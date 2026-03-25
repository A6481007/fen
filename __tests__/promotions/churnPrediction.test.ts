import { describe, expect, it, vi } from "vitest";

import {
  predictChurn,
  type ChurnSignals,
} from "@/lib/promotions/churnPrediction";

vi.mock("server-only", () => ({}), { virtual: true });

describe("churnPrediction", () => {
  it("classifies healthy users as low risk with no action", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 7,
      daysSinceLastLogin: 2,
      purchaseFrequencyTrend: 0.4,
      aovTrend: 0.2,
      engagementTrend: 0.25,
      abandonmentRate: 0.08,
      ltv: 150,
      ordersCount: 3,
    };

    const result = predictChurn(signals);

    expect(result.churnProbability).toBeCloseTo(0.17, 2);
    expect(result.riskLevel).toBe("low");
    expect(result.recommendedAction.type).toBe("none");
    expect(result.suggestedDiscount).toBe(0);
  });

  it("sends medium-risk users an engagement email with a 10% nudge", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 45,
      daysSinceLastLogin: 30,
      purchaseFrequencyTrend: -0.25,
      aovTrend: -0.1,
      engagementTrend: -0.05,
      abandonmentRate: 0.35,
      ltv: 220,
      ordersCount: 4,
    };

    const result = predictChurn(signals);

    expect(result.churnProbability).toBeCloseTo(0.485, 3);
    expect(result.riskLevel).toBe("medium");
    expect(result.recommendedAction).toMatchObject({
      type: "engagement_email",
      template: "winback_engagement",
      priority: 1,
      discount: 10,
      validityDays: 14,
    });
    expect(result.suggestedDiscount).toBe(10);
  });

  it("recommends a 20% win-back offer for high-risk users", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 90,
      daysSinceLastLogin: 60,
      purchaseFrequencyTrend: -0.5,
      aovTrend: -0.3,
      engagementTrend: -0.4,
      abandonmentRate: 0.55,
      ltv: 300,
      ordersCount: 2,
    };

    const result = predictChurn(signals);

    expect(result.riskLevel).toBe("high");
    expect(result.churnProbability).toBeCloseTo(0.69, 2);
    expect(result.recommendedAction).toMatchObject({
      type: "win_back_offer",
      template: "win_back_offer",
      priority: 2,
      discount: 20,
      validityDays: 7,
    });
  });

  it("escalates VIP rescue for critical high LTV users", () => {
    const signals: ChurnSignals = {
      daysSinceLastPurchase: 140,
      daysSinceLastLogin: 120,
      purchaseFrequencyTrend: -0.9,
      aovTrend: -0.7,
      engagementTrend: -0.8,
      abandonmentRate: 0.82,
      ltv: 1200,
      ordersCount: 12,
    };

    const result = predictChurn(signals);

    expect(result.riskLevel).toBe("critical");
    expect(result.churnProbability).toBeGreaterThanOrEqual(0.8);
    expect(result.recommendedAction).toMatchObject({
      type: "vip_rescue",
      template: "vip_last_chance",
      priority: 3,
      discount: 30,
      validityDays: 3,
    });
    expect(result.contributingFactors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("High LTV"),
      ]),
    );
  });
});
