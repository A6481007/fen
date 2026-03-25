import "server-only"

import { adminDb, FieldValue, Timestamp } from "@/lib/firebaseAdmin"
import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export interface ChurnSignals {
  daysSinceLastPurchase: number
  daysSinceLastLogin: number
  purchaseFrequencyTrend: number // -1 to 1 (negative = declining)
  aovTrend: number // -1 to 1
  engagementTrend: number // -1 to 1
  abandonmentRate: number // 0 to 1
  ltv: number
  ordersCount: number
  averageOrderValue?: number
}

export interface ChurnScores {
  purchaseRecency: number
  loginRecency: number
  frequency: number
  aov: number
  engagement: number
  abandonment: number
  reliefFromLtv: number
  reliefFromLoyalty: number
}

export interface ChurnAction {
  type: "none" | "engagement_email" | "win_back_offer" | "vip_rescue" | "exit_survey"
  priority: number
  template: string
  discount: number
  validityDays: number
  channel?: "email" | "sms" | "push"
  note?: string
}

export interface ChurnPrediction {
  userId: string
  churnProbability: number // 0 to 1
  riskLevel: RiskLevel
  signals: ChurnSignals
  scores: ChurnScores
  contributingFactors: string[]
  recommendedAction: ChurnAction
  suggestedDiscount: number
  evaluatedAt?: Timestamp
  queued?: boolean
}

export interface ChurnConfig {
  thresholds: {
    low: number
    medium: number
    high: number
    critical: number
  }
  weights: {
    purchaseRecency: number
    loginRecency: number
    frequencyTrend: number
    aovTrend: number
    engagementTrend: number
    abandonment: number
    reliefFromLtv: number
    reliefFromLoyalty: number
  }
  recency: {
    purchaseHalfLife: number
    loginHalfLife: number
  }
  highValue: {
    ltv: number
    vipLtv: number
    loyaltyOrders: number
  }
  actions: {
    mediumDiscount: number
    highDiscount: number
    criticalDiscount: number
    maxDiscount: number
    vipBonus: number
  }
}

export interface EvaluateOptions {
  dryRun?: boolean
  skipQueue?: boolean
  db?: Firestore
  config?: ChurnConfig
  signals?: ChurnSignals
}

const DEFAULT_CONFIG: ChurnConfig = {
  thresholds: {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 1, // clamp handles the ceiling; 0.8+ is critical
  },
  weights: {
    purchaseRecency: 0.24,
    loginRecency: 0.14,
    frequencyTrend: 0.18,
    aovTrend: 0.1,
    engagementTrend: 0.16,
    abandonment: 0.18,
    reliefFromLtv: 0.05,
    reliefFromLoyalty: 0.05,
  },
  recency: {
    purchaseHalfLife: 60,
    loginHalfLife: 30,
  },
  highValue: {
    ltv: 500,
    vipLtv: 1000,
    loyaltyOrders: 6,
  },
  actions: {
    mediumDiscount: 10,
    highDiscount: 20,
    criticalDiscount: 30,
    maxDiscount: 35,
    vipBonus: 0,
  },
}

/**
 * Calculate churn probability for a user
 */
export function predictChurn(
  signals: ChurnSignals,
  config: ChurnConfig = DEFAULT_CONFIG,
): ChurnPrediction {
  const contributingFactors: string[] = []
  const scores = calculateScores(signals, config)
  const rawProbability =
    scores.purchaseRecency * config.weights.purchaseRecency +
    scores.loginRecency * config.weights.loginRecency +
    scores.frequency * config.weights.frequencyTrend +
    scores.aov * config.weights.aovTrend +
    scores.engagement * config.weights.engagementTrend +
    scores.abandonment * config.weights.abandonment -
    scores.reliefFromLtv * config.weights.reliefFromLtv -
    scores.reliefFromLoyalty * config.weights.reliefFromLoyalty

  const probability = clamp(rawProbability, 0, 1)
  const churnProbability = Math.round(probability * 1000) / 1000
  const riskLevel = getRiskLevel(churnProbability, config.thresholds)
  const recommendedAction = getRecommendedAction(riskLevel, signals, config)

  if (signals.daysSinceLastPurchase > 60) {
    contributingFactors.push(`No purchase in ${signals.daysSinceLastPurchase} days`)
  }
  if (signals.daysSinceLastLogin > 30) {
    contributingFactors.push(`No login in ${signals.daysSinceLastLogin} days`)
  }
  if (signals.purchaseFrequencyTrend < -0.25) {
    contributingFactors.push("Purchase frequency declining")
  }
  if (signals.aovTrend < -0.25) {
    contributingFactors.push("Average order value falling")
  }
  if (signals.engagementTrend < -0.2) {
    contributingFactors.push("Engagement trending down")
  }
  if (signals.abandonmentRate > 0.4) {
    contributingFactors.push(`High cart abandonment (${Math.round(signals.abandonmentRate * 100)}%)`)
  }

  const { isHighValue } = getHighValueStatus(signals, config)
  if (isHighValue) {
    contributingFactors.push("High LTV or loyal customer prioritized for retention")
  }

  return {
    userId: "",
    churnProbability,
    riskLevel,
    signals,
    scores,
    contributingFactors,
    recommendedAction,
    suggestedDiscount: recommendedAction.discount,
    evaluatedAt: Timestamp.now(),
  }
}

/**
 * Fetch churn signals for a user from Firestore
 */
export async function fetchChurnSignals(
  userId: string,
  db: Firestore = adminDb,
): Promise<ChurnSignals> {
  const userDoc = await db.collection("users").doc(userId).get()
  const userData = userDoc.data() ?? {}

  const now = Date.now()
  const lastPurchaseAt =
    userData.lastPurchaseAt?.toDate?.() ??
    userData.lastOrderAt?.toDate?.() ??
    undefined
  const lastLoginAt =
    userData.lastLoginAt?.toDate?.() ??
    userData.lastActiveAt?.toDate?.() ??
    undefined

  const daysSinceLastPurchase = lastPurchaseAt
    ? daysBetween(now, lastPurchaseAt)
    : 999
  const daysSinceLastLogin = lastLoginAt ? daysBetween(now, lastLoginAt) : 999

  const orders = await db
    .collection("orders")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get()

  const orderTrends = calculateOrderTrends(orders.docs)
  const engagementTrend = calculateEngagementTrend(userData)
  const abandonmentRate = calculateAbandonmentRate(
    toNumber(userData.abandonedCarts),
    toNumber(userData.totalCartStarts),
  )

  const computedLtv =
    orders.docs.reduce((sum, doc) => sum + orderTotal(doc), 0) || 0

  return {
    daysSinceLastPurchase,
    daysSinceLastLogin,
    purchaseFrequencyTrend: orderTrends.purchaseFrequencyTrend,
    aovTrend: orderTrends.aovTrend,
    engagementTrend,
    abandonmentRate,
    ltv: toNumber(userData.ltv ?? userData.lifetimeValue ?? computedLtv),
    ordersCount: toNumber(userData.ordersCount ?? orders.size),
    averageOrderValue: orderTrends.averageOrderValue,
  }
}

/**
 * Run churn prediction for a user and trigger appropriate action
 */
export async function evaluateAndActOnChurn(
  userId: string,
  options: EvaluateOptions = {},
): Promise<ChurnPrediction> {
  const db = options.db ?? adminDb
  const config = options.config ?? DEFAULT_CONFIG
  const signals = options.signals ?? (await fetchChurnSignals(userId, db))
  const prediction = predictChurn(signals, config)
  prediction.userId = userId

  if (!options.dryRun) {
    await db.collection("churnPredictions").add({
      ...prediction,
      evaluatedAt: FieldValue.serverTimestamp(),
    })
  }

  if (
    prediction.recommendedAction.type !== "none" &&
    !options.skipQueue &&
    !options.dryRun
  ) {
    await queueChurnAction(userId, prediction, db)
    prediction.queued = true
  }

  return prediction
}

/**
 * Batch evaluation helper for scheduled jobs
 */
export async function evaluateChurnForUsers(
  userIds: string[],
  options: EvaluateOptions = {},
): Promise<ChurnPrediction[]> {
  const results: ChurnPrediction[] = []

  for (const userId of userIds) {
    try {
      const prediction = await evaluateAndActOnChurn(userId, options)
      results.push(prediction)
    } catch (error) {
      console.error(`Failed to evaluate churn for ${userId}:`, error)
    }
  }

  return results
}

/**
 * Queue churn action for messaging system
 */
async function queueChurnAction(
  userId: string,
  prediction: ChurnPrediction,
  db: Firestore,
): Promise<void> {
  const expiresAt = Timestamp.fromMillis(
    Date.now() + prediction.recommendedAction.validityDays * 86_400_000,
  )

  await db.collection("messageQueue").add({
    userId,
    type: "churn_intervention",
    messageType: "winback",
    action: prediction.recommendedAction,
    priority: prediction.recommendedAction.priority,
    riskLevel: prediction.riskLevel,
    churnProbability: prediction.churnProbability,
    signals: prediction.signals,
    contributingFactors: prediction.contributingFactors,
    validUntil: expiresAt,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    scheduledFor: FieldValue.serverTimestamp(),
  })
}

function calculateScores(signals: ChurnSignals, config: ChurnConfig): ChurnScores {
  return {
    purchaseRecency: recencyScore(
      signals.daysSinceLastPurchase,
      config.recency.purchaseHalfLife,
    ),
    loginRecency: recencyScore(
      signals.daysSinceLastLogin,
      config.recency.loginHalfLife,
    ),
    frequency: trendToRisk(signals.purchaseFrequencyTrend),
    aov: trendToRisk(signals.aovTrend),
    engagement: trendToRisk(signals.engagementTrend),
    abandonment: clamp(signals.abandonmentRate, 0, 1),
    reliefFromLtv: clamp(signals.ltv / config.highValue.vipLtv, 0, 1),
    reliefFromLoyalty: clamp(
      signals.ordersCount / config.highValue.loyaltyOrders,
      0,
      1,
    ),
  }
}

function getRiskLevel(
  probability: number,
  thresholds: ChurnConfig["thresholds"],
): RiskLevel {
  if (probability < thresholds.low) return "low"
  if (probability < thresholds.medium) return "medium"
  if (probability < thresholds.high) return "high"
  return "critical"
}

function getRecommendedAction(
  riskLevel: RiskLevel,
  signals: ChurnSignals,
  config: ChurnConfig,
): ChurnAction {
  const { isHighValue, isVip } = getHighValueStatus(signals, config)

  switch (riskLevel) {
    case "low":
      return {
        type: "none",
        priority: 0,
        template: "",
        discount: 0,
        validityDays: 0,
      }

    case "medium":
      return {
        type: "engagement_email",
        priority: 1,
        template: "winback_engagement",
        discount: config.actions.mediumDiscount,
        validityDays: 14,
        channel: "email",
        note: isHighValue ? "Include personalized recommendations" : undefined,
      }

    case "high":
      return {
        type: isHighValue ? "vip_rescue" : "win_back_offer",
        priority: 2,
        template: isHighValue ? "vip_we_miss_you" : "win_back_offer",
        discount: Math.min(
          config.actions.highDiscount + (isHighValue ? config.actions.vipBonus : 0),
          config.actions.maxDiscount,
        ),
        validityDays: 7,
        channel: "email",
        note: isHighValue ? "Escalate to concierge if unresponsive" : undefined,
      }

    case "critical":
      return {
        type: isHighValue || isVip ? "vip_rescue" : "win_back_offer",
        priority: 3,
        template: isHighValue || isVip ? "vip_last_chance" : "win_back_urgent",
        discount: Math.min(
          config.actions.criticalDiscount +
            (isHighValue || isVip ? config.actions.vipBonus : 0),
          config.actions.maxDiscount,
        ),
        validityDays: 3,
        channel: "email",
        note: isHighValue ? "Offer concierge callback + expedited support" : undefined,
      }

    default:
      return {
        type: "none",
        priority: 0,
        template: "",
        discount: 0,
        validityDays: 0,
      }
  }
}

function recencyScore(days: number, halfLife: number): number {
  if (!Number.isFinite(days) || days <= 0) return 0

  const score = 1 - Math.exp(-days / halfLife)
  return clamp(score, 0, 1)
}

function trendToRisk(trend: number): number {
  if (!Number.isFinite(trend)) return 0.5
  return clamp((1 - trend) / 2, 0, 1)
}

function calculateAbandonmentRate(abandoned: number, started: number): number {
  if (!Number.isFinite(started) || started <= 0) return 0
  const rate = abandoned / started
  return clamp(rate, 0, 1)
}

function calculateOrderTrends(orders: QueryDocumentSnapshot[]) {
  if (orders.length < 2) {
    return {
      purchaseFrequencyTrend: 0,
      aovTrend: 0,
      averageOrderValue: orders.length === 1 ? orderTotal(orders[0]) : 0,
    }
  }

  const mid = Math.floor(orders.length / 2)
  const recentOrders = orders.slice(0, mid)
  const olderOrders = orders.slice(mid)

  const recentAvgDays = calculateAvgDaysBetweenOrders(recentOrders)
  const olderAvgDays = calculateAvgDaysBetweenOrders(olderOrders)

  const frequencyChange =
    olderAvgDays === 0
      ? 0
      : (olderAvgDays - recentAvgDays) / Math.max(olderAvgDays, 1)

  const recentAOV =
    recentOrders.reduce((sum, doc) => sum + orderTotal(doc), 0) /
    Math.max(recentOrders.length, 1)

  const olderAOV =
    olderOrders.reduce((sum, doc) => sum + orderTotal(doc), 0) /
    Math.max(olderOrders.length, 1)

  const aovChange =
    olderAOV === 0 ? 0 : (recentAOV - olderAOV) / Math.max(olderAOV, 1)

  const averageOrderValue =
    orders.reduce((sum, doc) => sum + orderTotal(doc), 0) / orders.length

  return {
    purchaseFrequencyTrend: clamp(frequencyChange, -1, 1),
    aovTrend: clamp(aovChange, -1, 1),
    averageOrderValue,
  }
}

function calculateAvgDaysBetweenOrders(
  orders: QueryDocumentSnapshot[],
): number {
  if (orders.length < 2) return 0

  let totalDays = 0
  for (let i = 0; i < orders.length - 1; i++) {
    const current = orders[i].data().createdAt?.toDate?.()
    const next = orders[i + 1].data().createdAt?.toDate?.()
    if (current && next) {
      totalDays += (current.getTime() - next.getTime()) / 86_400_000
    }
  }

  return totalDays / Math.max(orders.length - 1, 1)
}

function calculateEngagementTrend(userData: Record<string, unknown>): number {
  const history = Array.isArray(userData.engagementScores)
    ? userData.engagementScores
        .map((value) => toNumber(value))
        .filter((value) => Number.isFinite(value))
    : []

  if (history.length >= 4) {
    return calculateTrendFromSeries(history)
  }

  const storedTrend = toNumber(userData.engagementTrend)
  return Number.isFinite(storedTrend) ? storedTrend : 0
}

function calculateTrendFromSeries(series: number[]): number {
  if (series.length < 2) return 0

  const mid = Math.floor(series.length / 2)
  const olderAverage = average(series.slice(0, mid))
  const recentAverage = average(series.slice(mid))

  if (olderAverage === 0) return 0

  const change = (recentAverage - olderAverage) / Math.abs(olderAverage)
  return clamp(change, -1, 1)
}

function orderTotal(doc: QueryDocumentSnapshot): number {
  const data = doc.data()
  return toNumber(
    data.total ?? data.amount ?? data.orderTotal ?? data.value ?? 0,
  )
}

function getHighValueStatus(
  signals: ChurnSignals,
  config: ChurnConfig,
): { isHighValue: boolean; isVip: boolean } {
  const isHighValue =
    signals.ltv >= config.highValue.ltv ||
    signals.ordersCount >= config.highValue.loyaltyOrders
  const isVip = signals.ltv >= config.highValue.vipLtv

  return { isHighValue, isVip }
}

function daysBetween(now: number, date: Date): number {
  return Math.floor((now - date.getTime()) / 86_400_000)
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((total, value) => total + value, 0)
  return sum / values.length
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
