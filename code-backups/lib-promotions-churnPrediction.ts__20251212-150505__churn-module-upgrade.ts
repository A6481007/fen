import "server-only"
import { adminDb, FieldValue } from "@/lib/firebaseAdmin"

// Types
interface ChurnSignals {
  daysSinceLastPurchase: number
  daysSinceLastLogin: number
  purchaseFrequencyTrend: number // -1 to 1 (negative = declining)
  aovTrend: number // -1 to 1
  engagementTrend: number // -1 to 1
  abandonmentRate: number // 0 to 1
  ltv: number
  ordersCount: number
}

interface ChurnPrediction {
  userId: string
  churnProbability: number // 0 to 1
  riskLevel: "low" | "medium" | "high" | "critical"
  signals: ChurnSignals
  contributingFactors: string[]
  recommendedAction: ChurnAction
  suggestedDiscount: number
}

interface ChurnAction {
  type: "none" | "engagement_email" | "win_back_offer" | "vip_rescue" | "exit_survey"
  priority: number
  template: string
  discount: number
  validityDays: number
}

interface ChurnConfig {
  thresholds: {
    lowRisk: number // Probability below this = low
    mediumRisk: number // Probability below this = medium
    highRisk: number // Probability below this = high
    // Above highRisk = critical
  }
  signals: {
    inactiveDaysWeight: number
    frequencyWeight: number
    aovWeight: number
    engagementWeight: number
    abandonmentWeight: number
  }
  actions: {
    mediumDiscount: number
    highDiscount: number
    criticalDiscount: number
    maxDiscount: number
  }
}

// Default configuration
const DEFAULT_CONFIG: ChurnConfig = {
  thresholds: {
    lowRisk: 0.25,
    mediumRisk: 0.5,
    highRisk: 0.75,
  },
  signals: {
    inactiveDaysWeight: 0.35,
    frequencyWeight: 0.25,
    aovWeight: 0.15,
    engagementWeight: 0.15,
    abandonmentWeight: 0.1,
  },
  actions: {
    mediumDiscount: 10,
    highDiscount: 15,
    criticalDiscount: 25,
    maxDiscount: 30,
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

  // Calculate component scores
  const inactivityScore = calculateInactivityScore(signals.daysSinceLastPurchase)
  const frequencyScore = calculateTrendScore(signals.purchaseFrequencyTrend)
  const aovScore = calculateTrendScore(signals.aovTrend)
  const engagementScore = calculateTrendScore(signals.engagementTrend)
  const abandonmentScore = signals.abandonmentRate

  // Build explanation
  if (signals.daysSinceLastPurchase > 60) {
    contributingFactors.push(`No purchase in ${signals.daysSinceLastPurchase} days`)
  }
  if (signals.purchaseFrequencyTrend < -0.3) {
    contributingFactors.push("Declining purchase frequency")
  }
  if (signals.aovTrend < -0.3) {
    contributingFactors.push("Declining order values")
  }
  if (signals.engagementTrend < -0.3) {
    contributingFactors.push("Reduced site engagement")
  }
  if (signals.abandonmentRate > 0.5) {
    contributingFactors.push("High cart abandonment rate")
  }

  // Calculate weighted probability
  const probability =
    inactivityScore * config.signals.inactiveDaysWeight +
    frequencyScore * config.signals.frequencyWeight +
    aovScore * config.signals.aovWeight +
    engagementScore * config.signals.engagementWeight +
    abandonmentScore * config.signals.abandonmentWeight

  // Clamp to 0-1
  const clampedProbability = Math.max(0, Math.min(1, probability))

  // Determine risk level
  const riskLevel = getRiskLevel(clampedProbability, config)

  // Determine recommended action
  const recommendedAction = getRecommendedAction(riskLevel, signals, config)

  return {
    userId: "", // Set by caller
    churnProbability: Math.round(clampedProbability * 100) / 100,
    riskLevel,
    signals,
    contributingFactors,
    recommendedAction,
    suggestedDiscount: recommendedAction.discount,
  }
}

/**
 * Calculate inactivity score (0-1, higher = more likely to churn)
 */
function calculateInactivityScore(daysSinceLastPurchase: number): number {
  // Exponential curve: 0 days = 0, 30 days = 0.3, 60 days = 0.6, 90 days = 0.8, 120+ = 0.95
  if (daysSinceLastPurchase <= 0) return 0
  if (daysSinceLastPurchase >= 120) return 0.95

  return 1 - Math.exp(-daysSinceLastPurchase / 50)
}

/**
 * Convert trend (-1 to 1) to churn score (0 to 1)
 */
function calculateTrendScore(trend: number): number {
  // Negative trend = higher churn probability
  // -1 (very declining) -> 1
  // 0 (stable) -> 0.5
  // 1 (growing) -> 0
  return (1 - trend) / 2
}

/**
 * Get risk level from probability
 */
function getRiskLevel(
  probability: number,
  config: ChurnConfig,
): "low" | "medium" | "high" | "critical" {
  if (probability < config.thresholds.lowRisk) return "low"
  if (probability < config.thresholds.mediumRisk) return "medium"
  if (probability < config.thresholds.highRisk) return "high"
  return "critical"
}

/**
 * Get recommended action based on risk level and user value
 */
function getRecommendedAction(
  riskLevel: string,
  signals: ChurnSignals,
  config: ChurnConfig,
): ChurnAction {
  // High LTV users get special treatment
  const isHighValue = signals.ltv > 500 || signals.ordersCount >= 5

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
        template: "engagement_reminder",
        discount: isHighValue ? config.actions.mediumDiscount + 5 : config.actions.mediumDiscount,
        validityDays: 14,
      }

    case "high":
      return {
        type: isHighValue ? "vip_rescue" : "win_back_offer",
        priority: 2,
        template: isHighValue ? "vip_we_miss_you" : "win_back_standard",
        discount: isHighValue ? config.actions.highDiscount + 10 : config.actions.highDiscount,
        validityDays: 7,
      }

    case "critical":
      return {
        type: isHighValue ? "vip_rescue" : "win_back_offer",
        priority: 3,
        template: isHighValue ? "vip_last_chance" : "win_back_urgent",
        discount: Math.min(
          isHighValue ? config.actions.criticalDiscount + 10 : config.actions.criticalDiscount,
          config.actions.maxDiscount,
        ),
        validityDays: 3,
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

/**
 * Fetch churn signals for a user
 */
export async function fetchChurnSignals(userId: string): Promise<ChurnSignals> {
  const userDoc = await adminDb.collection("users").doc(userId).get()
  const userData = userDoc.data()

  if (!userData) {
    return {
      daysSinceLastPurchase: 999,
      daysSinceLastLogin: 999,
      purchaseFrequencyTrend: 0,
      aovTrend: 0,
      engagementTrend: 0,
      abandonmentRate: 0,
      ltv: 0,
      ordersCount: 0,
    }
  }

  // Calculate days since last purchase
  const lastPurchaseAt = userData.lastPurchaseAt?.toDate()
  const daysSinceLastPurchase = lastPurchaseAt
    ? Math.floor((Date.now() - lastPurchaseAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Calculate days since last login
  const lastLoginAt = userData.lastLoginAt?.toDate()
  const daysSinceLastLogin = lastLoginAt
    ? Math.floor((Date.now() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Get order history for trend calculation
  const orders = await adminDb
    .collection("orders")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get()

  const purchaseFrequencyTrend = calculatePurchaseFrequencyTrend(orders.docs)
  const aovTrend = calculateAOVTrend(orders.docs)

  // Get engagement data
  const engagementTrend = userData.engagementTrend || 0

  // Calculate abandonment rate
  const abandonedCarts = userData.abandonedCarts || 0
  const totalCartStarts = userData.totalCartStarts || 1
  const abandonmentRate = abandonedCarts / totalCartStarts

  return {
    daysSinceLastPurchase,
    daysSinceLastLogin,
    purchaseFrequencyTrend,
    aovTrend,
    engagementTrend,
    abandonmentRate: Math.min(1, abandonmentRate),
    ltv: userData.ltv || 0,
    ordersCount: userData.ordersCount || 0,
  }
}

/**
 * Calculate purchase frequency trend from order history
 */
function calculatePurchaseFrequencyTrend(
  orders: FirebaseFirestore.QueryDocumentSnapshot[],
): number {
  if (orders.length < 4) return 0 // Not enough data

  // Compare recent half vs older half
  const mid = Math.floor(orders.length / 2)
  const recentOrders = orders.slice(0, mid)
  const olderOrders = orders.slice(mid)

  // Calculate average days between orders for each half
  const recentAvgDays = calculateAvgDaysBetweenOrders(recentOrders)
  const olderAvgDays = calculateAvgDaysBetweenOrders(olderOrders)

  if (olderAvgDays === 0) return 0

  // Negative trend = orders becoming less frequent (more days between)
  // Positive trend = orders becoming more frequent (fewer days between)
  const change = (olderAvgDays - recentAvgDays) / olderAvgDays
  return Math.max(-1, Math.min(1, change))
}

/**
 * Calculate average days between orders
 */
function calculateAvgDaysBetweenOrders(
  orders: FirebaseFirestore.QueryDocumentSnapshot[],
): number {
  if (orders.length < 2) return 0

  let totalDays = 0
  for (let i = 0; i < orders.length - 1; i++) {
    const current = orders[i].data().createdAt?.toDate()
    const next = orders[i + 1].data().createdAt?.toDate()
    if (current && next) {
      totalDays += (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
    }
  }

  return totalDays / (orders.length - 1)
}

/**
 * Calculate AOV trend from order history
 */
function calculateAOVTrend(orders: FirebaseFirestore.QueryDocumentSnapshot[]): number {
  if (orders.length < 4) return 0

  const mid = Math.floor(orders.length / 2)

  const recentAOV =
    orders.slice(0, mid).reduce((sum, doc) => sum + (doc.data().total || 0), 0) / mid

  const olderAOV =
    orders.slice(mid).reduce((sum, doc) => sum + (doc.data().total || 0), 0) /
    (orders.length - mid)

  if (olderAOV === 0) return 0

  const change = (recentAOV - olderAOV) / olderAOV
  return Math.max(-1, Math.min(1, change))
}

/**
 * Run churn prediction for a user and trigger appropriate action
 */
export async function evaluateAndActOnChurn(userId: string): Promise<ChurnPrediction> {
  const signals = await fetchChurnSignals(userId)
  const prediction = predictChurn(signals)
  prediction.userId = userId

  // Log prediction
  await adminDb.collection("churnPredictions").add({
    ...prediction,
    evaluatedAt: FieldValue.serverTimestamp(),
  })

  // Trigger action if needed
  if (prediction.recommendedAction.type !== "none") {
    await queueChurnAction(userId, prediction)
  }

  return prediction
}

/**
 * Queue churn action for messaging system
 */
async function queueChurnAction(userId: string, prediction: ChurnPrediction): Promise<void> {
  await adminDb.collection("messageQueue").add({
    userId,
    type: "churn_intervention",
    action: prediction.recommendedAction,
    priority: prediction.recommendedAction.priority,
    churnProbability: prediction.churnProbability,
    scheduledFor: FieldValue.serverTimestamp(),
    status: "pending",
  })
}

// Export types
export type { ChurnSignals, ChurnPrediction, ChurnAction, ChurnConfig }
