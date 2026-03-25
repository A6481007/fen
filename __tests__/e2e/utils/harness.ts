import type { Page } from "@playwright/test";

type PromotionType = "flashSale" | "seasonal" | "bundle" | "loyalty";
type Segment = "all" | "firstTime" | "vip" | "returning";
type TrackingAction = "view" | "click" | "addToCart" | "purchase" | "conversion";
type FraudAction = "allow" | "deny" | "challenge";

export interface PromotionFixture {
  campaignId: string;
  name: string;
  type: PromotionType;
  segment: Segment;
  discountType: "percentage" | "fixed";
  discountValue: number;
  start: number;
  end: number;
  priority: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  budgetCap?: number;
  hiddenFromGuests?: boolean;
  hero?: string;
}

export interface UserProfile {
  id: string;
  segment: Segment;
  orders: number;
  ltv: number;
  country?: string;
  createdAt: number;
  blocklisted?: boolean;
}

interface AnalyticsEvent {
  campaignId: string;
  action: TrackingAction;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  at: number;
  value?: number;
}

interface UsageBucket {
  total: number;
  perUser: Map<string, number>;
  budgetSpent: number;
  conversions: number;
  impressions: number;
  clicks: number;
  addToCarts: number;
  revenue: number;
}

interface FraudDecision {
  action: FraudAction;
  reason: string;
  severity: "low" | "medium" | "high";
  retryAfterMs?: number;
}

interface EligibilityResult {
  eligible: Array<{
    campaignId: string;
    variant: "control" | "variantA" | "variantB";
    promotion: PromotionFixture;
    reason: string;
  }>;
  ineligible: Array<{ campaignId: string; reason: string; reasons: string[] }>;
  userSegment: Segment;
}

interface RedemptionResult {
  ok: boolean;
  reason?: string;
  discountApplied?: number;
  variant?: "control" | "variantA" | "variantB";
  decision?: FraudDecision;
}

type HarnessState = {
  nowMs: number;
  promotions: PromotionFixture[];
  users: Record<string, UserProfile>;
  analytics: AnalyticsEvent[];
  usage: Map<string, UsageBucket>;
  assignments: Map<string, "control" | "variantA" | "variantB">;
  fraudDecisions: Array<FraudDecision & { campaignId: string; userId?: string; at: number }>;
  rateLimits: Map<string, { count: number; resetAt: number }>;
  countryHistory: Map<string, { last: string; at: number }>;
  smsLog: Array<{ userId: string; campaignId: string; quiet: boolean; at: number }>;
  pushLog: Array<{ userId: string; campaignId: string; at: number }>;
};

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const hashSeed = (seed: string) =>
  seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;

const clonePromotions = (promotions: PromotionFixture[]) =>
  promotions.map((promo) => ({ ...promo }));

const basePromotions = (now: number): PromotionFixture[] => [
  {
    campaignId: "flash-1",
    name: "Holiday Flash Sale",
    type: "flashSale",
    segment: "all",
    discountType: "percentage",
    discountValue: 30,
    start: now - HOUR,
    end: now + 2 * HOUR,
    priority: 10,
    usageLimit: 200,
    perCustomerLimit: 2,
    budgetCap: 5_000,
    hero: "Ends soon",
  },
  {
    campaignId: "vip-1",
    name: "VIP Exclusive Boost",
    type: "loyalty",
    segment: "vip",
    discountType: "percentage",
    discountValue: 25,
    start: now - DAY,
    end: now + 5 * DAY,
    priority: 9,
    usageLimit: 150,
    perCustomerLimit: 3,
    budgetCap: 4_000,
    hiddenFromGuests: true,
  },
  {
    campaignId: "first-1",
    name: "First Order Bonus",
    type: "seasonal",
    segment: "firstTime",
    discountType: "percentage",
    discountValue: 20,
    start: now - DAY,
    end: now + 30 * DAY,
    priority: 8,
    budgetCap: 3_000,
    usageLimit: 1_000,
  },
  {
    campaignId: "bundle-1",
    name: "Bundle Builder",
    type: "bundle",
    segment: "returning",
    discountType: "fixed",
    discountValue: 15,
    start: now - 2 * DAY,
    end: now + 15 * DAY,
    priority: 6,
    perCustomerLimit: 1,
  },
  {
    campaignId: "expired-1",
    name: "Past Season Promo",
    type: "seasonal",
    segment: "all",
    discountType: "percentage",
    discountValue: 10,
    start: now - 10 * DAY,
    end: now - DAY,
    priority: 1,
  },
  {
    campaignId: "ab-1",
    name: "A/B Personalization",
    type: "seasonal",
    segment: "all",
    discountType: "percentage",
    discountValue: 18,
    start: now - DAY,
    end: now + 5 * DAY,
    priority: 7,
    usageLimit: 800,
    budgetCap: 2_500,
  },
];

const baseUsers = (now: number): Record<string, UserProfile> => ({
  guest: {
    id: "guest",
    segment: "returning",
    orders: 0,
    ltv: 0,
    country: "US",
    createdAt: now - 5 * DAY,
  },
  firstTimer: {
    id: "first-timer",
    segment: "firstTime",
    orders: 0,
    ltv: 0,
    country: "US",
    createdAt: now - 2 * DAY,
  },
  vip: {
    id: "vip-user",
    segment: "vip",
    orders: 8,
    ltv: 1_200,
    country: "US",
    createdAt: now - 200 * DAY,
  },
  returning: {
    id: "returning-user",
    segment: "returning",
    orders: 3,
    ltv: 320,
    country: "US",
    createdAt: now - 60 * DAY,
  },
  blocklisted: {
    id: "blocklisted-user",
    segment: "returning",
    orders: 1,
    ltv: 45,
    country: "RU",
    createdAt: now - 2 * DAY,
    blocklisted: true,
  },
});

const countdown = (msRemaining: number) => {
  if (msRemaining <= 0) return "ended";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
};

export class E2EHarness {
  private readonly seedPromotions: PromotionFixture[];
  private readonly seedUsers: Record<string, UserProfile>;
  private readonly seedNow: number;
  state: HarnessState;

  constructor(now = new Date()) {
    this.seedNow = now.getTime();
    this.seedPromotions = basePromotions(this.seedNow);
    this.seedUsers = baseUsers(this.seedNow);
    this.state = this.buildState();
  }

  private buildState(): HarnessState {
    return {
      nowMs: this.seedNow,
      promotions: clonePromotions(this.seedPromotions),
      users: JSON.parse(JSON.stringify(this.seedUsers)),
      analytics: [],
      usage: new Map(),
      assignments: new Map(),
      fraudDecisions: [],
      rateLimits: new Map(),
      countryHistory: new Map(),
      smsLog: [],
      pushLog: [],
    };
  }

  reset() {
    this.state = this.buildState();
  }

  setNow(date: Date) {
    this.state.nowMs = date.getTime();
  }

  private inferSegment(user: UserProfile): Segment {
    if (user.segment) return user.segment;
    if (user.orders === 0) return "firstTime";
    if (user.ltv >= 500) return "vip";
    return "returning";
  }

  isActive(promo: PromotionFixture, nowMs = this.state.nowMs) {
    return promo.start <= nowMs && nowMs < promo.end;
  }

  isExpired(promo: PromotionFixture, nowMs = this.state.nowMs) {
    return nowMs >= promo.end;
  }

  private ensureUsage(campaignId: string): UsageBucket {
    const existing = this.state.usage.get(campaignId);
    if (existing) return existing;
    const next: UsageBucket = {
      total: 0,
      perUser: new Map(),
      budgetSpent: 0,
      conversions: 0,
      impressions: 0,
      clicks: 0,
      addToCarts: 0,
      revenue: 0,
    };
    this.state.usage.set(campaignId, next);
    return next;
  }

  seedUsage(
    campaignId: string,
    overrides: Partial<Omit<UsageBucket, "perUser">> & { perUser?: Map<string, number> },
  ) {
    const bucket = this.ensureUsage(campaignId);
    if (overrides.perUser) bucket.perUser = overrides.perUser;
    bucket.total = overrides.total ?? bucket.total;
    bucket.budgetSpent = overrides.budgetSpent ?? bucket.budgetSpent;
    bucket.conversions = overrides.conversions ?? bucket.conversions;
    bucket.impressions = overrides.impressions ?? bucket.impressions;
    bucket.clicks = overrides.clicks ?? bucket.clicks;
    bucket.addToCarts = overrides.addToCarts ?? bucket.addToCarts;
    bucket.revenue = overrides.revenue ?? bucket.revenue;
  }

  private discountAmount(promo: PromotionFixture, orderValue: number) {
    if (promo.discountType === "percentage") {
      return Math.round((orderValue * promo.discountValue) / 100);
    }
    return promo.discountValue;
  }

  listPromotions(options: { userId?: string; type?: PromotionType; includeEnded?: boolean } = {}) {
    const user = this.state.users[options.userId ?? "guest"] ?? this.state.users.guest;
    const userSegment = this.inferSegment(user);
    return this.state.promotions
      .filter((promo) => options.includeEnded || this.isActive(promo))
      .filter((promo) => !options.type || promo.type === options.type)
      .filter((promo) => {
        if (promo.segment === "all") return true;
        if (promo.segment === "vip") return userSegment === "vip";
        if (promo.segment === "firstTime") return userSegment === "firstTime";
        return userSegment === "returning" || userSegment === "vip";
      })
      .filter((promo) => !(promo.hiddenFromGuests && userSegment !== "vip"))
      .sort((a, b) => b.priority - a.priority);
  }

  assignVariant(campaignId: string, userId?: string, sessionId?: string) {
    const key = `${campaignId}:${userId ?? sessionId ?? "anon"}`;
    const existing = this.state.assignments.get(key);
    if (existing) return existing;
    const bucket = hashSeed(key);
    const variant: "control" | "variantA" | "variantB" =
      bucket < 10 ? "control" : bucket < 60 ? "variantA" : "variantB";
    this.state.assignments.set(key, variant);
    return variant;
  }

  checkEligibility(params: {
    userId?: string;
    sessionId?: string;
    cartValue?: number;
    includeEnded?: boolean;
  }): EligibilityResult {
    const user = this.state.users[params.userId ?? "guest"] ?? this.state.users.guest;
    const userSegment = this.inferSegment(user);
    const eligible: EligibilityResult["eligible"] = [];
    const ineligible: EligibilityResult["ineligible"] = [];

    for (const promo of this.listPromotions({
      userId: user.id,
      includeEnded: params.includeEnded,
    })) {
      const reasons: string[] = [];
      const usage = this.ensureUsage(promo.campaignId);

      if (!this.isActive(promo) && !params.includeEnded) reasons.push("inactive");
      if (this.isExpired(promo)) reasons.push("expired");
      if (promo.segment === "vip" && userSegment !== "vip") reasons.push("vip_only");
      if (promo.segment === "firstTime" && user.orders > 0) reasons.push("first_time_only");
      if (promo.budgetCap && usage.budgetSpent >= promo.budgetCap) reasons.push("budget_exhausted");
      if (promo.usageLimit && usage.total >= promo.usageLimit) reasons.push("usage_limit");
      if (
        promo.perCustomerLimit &&
        (usage.perUser.get(user.id) ?? 0) >= promo.perCustomerLimit
      ) {
        reasons.push("per_customer_limit");
      }
      if (params.cartValue && params.cartValue < 25) reasons.push("min_cart_value");

      if (reasons.length) {
        ineligible.push({ campaignId: promo.campaignId, reason: reasons[0], reasons });
      } else {
        eligible.push({
          campaignId: promo.campaignId,
          variant: this.assignVariant(promo.campaignId, user.id, params.sessionId),
          promotion: promo,
          reason: "eligible",
        });
      }
    }

    return { eligible, ineligible, userSegment };
  }

  trackEvent(event: {
    campaignId: string;
    action: TrackingAction;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    value?: number;
  }) {
    const usage = this.ensureUsage(event.campaignId);
    if (event.action === "view") usage.impressions += 1;
    if (event.action === "click") usage.clicks += 1;
    if (event.action === "addToCart") usage.addToCarts += 1;
    if (event.action === "purchase" || event.action === "conversion") {
      usage.conversions += 1;
      if (typeof event.value === "number") {
        usage.revenue += event.value;
      }
    }

    this.state.analytics.push({
      campaignId: event.campaignId,
      action: event.action,
      userId: event.userId,
      sessionId: event.sessionId,
      metadata: event.metadata,
      at: this.state.nowMs,
      value: event.value,
    });
  }

  checkFraud(params: {
    userId?: string;
    campaignId: string;
    action: TrackingAction;
    country?: string;
    orderValue?: number;
  }): FraudDecision {
    const user = this.state.users[params.userId ?? "guest"] ?? this.state.users.guest;
    const key = `${params.action}:${params.campaignId}:${user.id}`;
    const now = this.state.nowMs;
    const rate = this.state.rateLimits.get(key) ?? {
      count: 0,
      resetAt: now + MINUTE,
    };
    if (now > rate.resetAt) {
      rate.count = 0;
      rate.resetAt = now + MINUTE;
    }
    rate.count += 1;
    this.state.rateLimits.set(key, rate);

    if (user.blocklisted) {
      return this.logDecision(params, { action: "deny", reason: "blocklisted", severity: "high" });
    }
    if (rate.count > 5) {
      return this.logDecision(params, {
        action: "deny",
        reason: "rate_limited",
        severity: "medium",
        retryAfterMs: rate.resetAt - now,
      });
    }

    const recent = this.state.analytics.filter(
      (event) =>
        event.userId === user.id &&
        event.campaignId === params.campaignId &&
        now - event.at < 10_000,
    );
    if (recent.length >= 4) {
      return this.logDecision(params, {
        action: "challenge",
        reason: "velocity",
        severity: "medium",
      });
    }

    if (params.orderValue && now - user.createdAt < DAY && params.orderValue > 100) {
      return this.logDecision(params, {
        action: "challenge",
        reason: "new_account_high_value",
        severity: "medium",
      });
    }

    if (params.country) {
      const history = this.state.countryHistory.get(user.id);
      if (history && history.last !== params.country && now - history.at < HOUR) {
        return this.logDecision(params, {
          action: "challenge",
          reason: "geo_anomaly",
          severity: "medium",
        });
      }
      this.state.countryHistory.set(user.id, { last: params.country, at: now });
    }

    return this.logDecision(params, { action: "allow", reason: "clean", severity: "low" });
  }

  private logDecision(
    params: { userId?: string; campaignId: string },
    decision: FraudDecision,
  ): FraudDecision {
    this.state.fraudDecisions.push({
      ...decision,
      campaignId: params.campaignId,
      userId: params.userId,
      at: this.state.nowMs,
    });
    return decision;
  }

  redeemPromotion(params: {
    campaignId: string;
    userId?: string;
    sessionId?: string;
    orderValue: number;
    country?: string;
  }): RedemptionResult {
    const eligibility = this.checkEligibility({
      userId: params.userId,
      sessionId: params.sessionId,
    });
    const entry = eligibility.eligible.find((item) => item.campaignId === params.campaignId);
    if (!entry) {
      return { ok: false, reason: "not_eligible" };
    }

    const fraudDecision = this.checkFraud({
      userId: params.userId,
      campaignId: params.campaignId,
      action: "purchase",
      orderValue: params.orderValue,
      country: params.country,
    });
    if (fraudDecision.action === "deny") {
      return { ok: false, reason: fraudDecision.reason, decision: fraudDecision };
    }
    if (fraudDecision.action === "challenge") {
      return { ok: false, reason: "challenge", decision: fraudDecision };
    }

    const usage = this.ensureUsage(params.campaignId);
    const userId = params.userId ?? "guest";
    const discount = this.discountAmount(entry.promotion, params.orderValue);

    usage.total += 1;
    usage.perUser.set(userId, (usage.perUser.get(userId) ?? 0) + 1);
    usage.budgetSpent += discount;
    usage.conversions += 1;
    usage.revenue += params.orderValue - discount;

    this.trackEvent({
      campaignId: params.campaignId,
      action: "purchase",
      userId,
      sessionId: params.sessionId,
      value: params.orderValue,
      metadata: { discount },
    });

    return {
      ok: true,
      discountApplied: discount,
      variant: entry.variant,
      decision: fraudDecision,
    };
  }

  sendSms(params: { userId: string; campaignId: string; timezoneOffsetHours?: number }) {
    const now = new Date(this.state.nowMs);
    const hour = params.timezoneOffsetHours
      ? new Date(this.state.nowMs + params.timezoneOffsetHours * HOUR).getHours()
      : now.getHours();
    const quiet = hour >= 22 || hour < 8;
    const todaysMessages = this.state.smsLog.filter(
      (msg) => msg.userId === params.userId && now.getTime() - msg.at < DAY,
    );
    const capped = todaysMessages.length >= 2;
    const sent = !quiet && !capped;

    if (sent) {
      this.state.smsLog.push({
        userId: params.userId,
        campaignId: params.campaignId,
        quiet,
        at: this.state.nowMs,
      });
    }

    return {
      success: sent,
      quietHours: quiet,
      capped,
      messageId: sent ? `sms-${this.state.smsLog.length}` : undefined,
    };
  }

  sendPush(params: { userId: string; campaignId: string }) {
    const pushes = this.state.pushLog.filter(
      (entry) =>
        entry.userId === params.userId && this.state.nowMs - entry.at < DAY && entry.campaignId === params.campaignId,
    );
    const capped = pushes.length >= 2;
    const sent = !capped;

    if (sent) {
      this.state.pushLog.push({
        userId: params.userId,
        campaignId: params.campaignId,
        at: this.state.nowMs,
      });
    }

    return { success: sent, capped };
  }

  analyticsSnapshot(campaignId?: string) {
    const usage = campaignId ? this.state.usage.get(campaignId) : undefined;
    const campaigns = campaignId ? [campaignId] : Array.from(this.state.usage.keys());
    return {
      events: this.state.analytics.length,
      campaigns,
      conversions: usage?.conversions ?? 0,
      revenue: usage?.revenue ?? 0,
      budgetSpent: usage?.budgetSpent ?? 0,
      impressions: usage?.impressions ?? 0,
      clicks: usage?.clicks ?? 0,
      addToCarts: usage?.addToCarts ?? 0,
    };
  }

  adminSnapshot() {
    const active = this.state.promotions.filter((promo) => this.isActive(promo)).length;
    const ended = this.state.promotions.filter((promo) => this.isExpired(promo)).length;
    const usageEntries = Array.from(this.state.usage.entries());
    const top = usageEntries.sort((a, b) => (b[1].conversions ?? 0) - (a[1].conversions ?? 0))[0];
    const fraudAlerts = this.state.fraudDecisions.filter(
      (decision) => decision.action !== "allow",
    );

    return {
      active,
      ended,
      topCampaign: top ? { campaignId: top[0], conversions: top[1].conversions } : null,
      fraudAlerts,
      messageStats: {
        sms: this.state.smsLog.length,
        push: this.state.pushLog.length,
      },
      variantPerformance: Array.from(this.state.assignments.entries()).reduce<Record<
        string,
        { control: number; variantA: number; variantB: number }
      >>((acc, [key, variant]) => {
        const [campaignId] = key.split(":");
        const entry =
          acc[campaignId] ?? { control: 0, variantA: 0, variantB: 0 };
        if (variant === "control") entry.control += 1;
        if (variant === "variantA") entry.variantA += 1;
        if (variant === "variantB") entry.variantB += 1;
        acc[campaignId] = entry;
        return acc;
      }, {}),
    };
  }
}

export async function renderDiscoveryPage(
  page: Page,
  harness: E2EHarness,
  options: { userId?: string; filterType?: PromotionType; includeEnded?: boolean } = {},
) {
  const promotions = harness.listPromotions({
    userId: options.userId,
    type: options.filterType,
    includeEnded: options.includeEnded,
  });
  const nowMs = harness.state.nowMs;
  const cards = promotions
    .map((promo) => {
      const state = harness.isExpired(promo, nowMs) ? "ended" : harness.isActive(promo, nowMs) ? "active" : "scheduled";
      const countdownText = promo.type === "flashSale" ? countdown(promo.end - nowMs) : state;
      const badge = promo.segment === "vip" ? `<span class="vip">VIP</span>` : "";
      return `
        <article class="card" data-campaign="${promo.campaignId}" data-type="${promo.type}" data-state="${state}">
          <header>${promo.name} ${badge}</header>
          <p class="message">${promo.hero ?? "Limited offer"}</p>
          <p class="countdown">${countdownText}</p>
        </article>
      `;
    })
    .join("");

  await page.setContent(`
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; display: grid; gap: 12px; }
      .card { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
      .vip { background: gold; padding: 2px 6px; font-size: 12px; border-radius: 4px; }
      .countdown { color: #ff4d4f; font-weight: 600; }
    </style>
    <div id="promotions">${cards}</div>
  `);
}

export async function renderAnalyticsPage(
  page: Page,
  harness: E2EHarness,
  options: { campaignId: string; userId?: string; sessionId?: string },
) {
  await page.exposeFunction("recordAnalyticsEvent", (payload: { action: TrackingAction }) =>
    harness.trackEvent({
      campaignId: options.campaignId,
      action: payload.action,
      userId: options.userId,
      sessionId: options.sessionId,
    }),
  );

  await page.setContent(`
    <script>
      window.fbqCalls = [];
      window.gtagCalls = [];
      const fire = (action) => {
        window.fbqCalls.push(["track", action, { campaignId: "${options.campaignId}" }]);
        window.gtagCalls.push(["event", action, { campaignId: "${options.campaignId}" }]);
        // recordAnalyticsEvent is provided by Playwright exposeFunction
        recordAnalyticsEvent({ action });
      };
      window.addEventListener("DOMContentLoaded", () => fire("view"));
    </script>
    <button id="cta" data-action="click">CTA</button>
    <button id="convert" data-action="conversion">Complete</button>
    <script>
      document.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => fire(btn.dataset.action));
      });
    </script>
  `);
}
