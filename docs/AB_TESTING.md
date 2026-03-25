# A/B Testing Significance

## Requirements
- Minimum traffic: 100+ impressions per variant before evaluating results.
- Minimum conversions: 5+ purchases per variant; fewer keeps the test inconclusive.
- Baseline: control data is required for comparison; if control is under-sampled, keep running the test.
- Significance: two-tailed chi-squared on conversions vs. non-conversions; declare a winner only when confidence ≥ 95% (p ≤ 0.05).
- Confidence: reported as an integer (0–99) and capped when data is sparse rather than extrapolated.

## How decisions are made
1. Fetch variant metrics with `getVariantAnalytics(campaignId)`.
2. Pick the highest CVR variant that meets the traffic + conversion minimums.
3. Compare that variant against control with the chi-squared test to compute confidence.
4. If confidence ≥ 95%, set that variant as the winner; otherwise mark the test as inconclusive.

## Operator checklist
- Keep tests running until both traffic and conversion minimums are met.
- Check that impressions and conversions are flowing for control and all active variants.
- Use a consistent attribution window while the test is active; avoid mid-test targeting changes.
- If results stay inconclusive after thresholds are met, expand the sample or revisit the hypothesis before shipping changes.
