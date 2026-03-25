import 'server-only';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebaseAdmin';

// Types
interface AnomalyCheckResult {
  isAnomaly: boolean;
  anomalyType: AnomalyType | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  details: string;
  action: AnomalyAction;
  shouldBlock: boolean;
}

type AnomalyType =
  | 'velocity_global'
  | 'velocity_user'
  | 'geographic'
  | 'new_account'
  | 'cart_gaming'
  | 'duplicate_payment'
  | 'referral_abuse';

type AnomalyAction =
  | 'allow'
  | 'flag_for_review'
  | 'require_verification'
  | 'block_transaction'
  | 'pause_promotion'
  | 'block_user';

interface AnomalyConfig {
  velocity: {
    maxGlobalPerMinute: number;
    maxUserPerHour: number;
    maxUserPerDay: number;
  };
  account: {
    minAgeForHighValuePromos: number; // Days
    minOrdersForVIPPromos: number;
  };
  geographic: {
    maxCountriesPerSession: number;
    flaggedCountries: string[];
  };
  cartGaming: {
    suspiciousThresholdRange: number; // Dollars above minimum
    maxNearThresholdInWindow: number;
  };
}

interface RedemptionContext {
  userId: string;
  campaignId: string;
  cartValue: number;
  promoMinimum: number;
  ipAddress: string;
  country: string;
  userAgent: string;
  accountCreatedAt: Date;
  ordersCount: number;
  sessionId: string;
}

// Default configuration
const DEFAULT_CONFIG: AnomalyConfig = {
  velocity: {
    maxGlobalPerMinute: 100,
    maxUserPerHour: 3,
    maxUserPerDay: 5,
  },
  account: {
    minAgeForHighValuePromos: 7,
    minOrdersForVIPPromos: 1,
  },
  geographic: {
    maxCountriesPerSession: 2,
    flaggedCountries: [], // Configure as needed
  },
  cartGaming: {
    suspiciousThresholdRange: 5, // Within $5 of minimum
    maxNearThresholdInWindow: 3,
  },
};

/**
 * Main anomaly detection function
 */
export async function checkForAnomalies(
  context: RedemptionContext,
  config: AnomalyConfig = DEFAULT_CONFIG
): Promise<AnomalyCheckResult> {
  const checks = await Promise.all([
    checkGlobalVelocity(context.campaignId, config),
    checkUserVelocity(context.userId, context.campaignId, config),
    checkAccountAge(context, config),
    checkCartGaming(context, config),
    checkGeographicAnomaly(context, config),
  ]);

  // Return the most severe anomaly found
  const anomalies = checks.filter((c) => c.isAnomaly);

  if (anomalies.length === 0) {
    return {
      isAnomaly: false,
      anomalyType: null,
      severity: null,
      details: 'No anomalies detected',
      action: 'allow',
      shouldBlock: false,
    };
  }

  // Sort by severity
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  anomalies.sort(
    (a, b) => severityOrder[b.severity || 'low'] - severityOrder[a.severity || 'low']
  );

  const worst = anomalies[0];

  // Log the anomaly
  await logAnomaly(context, worst);

  // Take automatic action if needed
  if (worst.action === 'pause_promotion') {
    await pausePromotion(context.campaignId, `Auto-paused due to ${worst.anomalyType}`);
  }

  return worst;
}

/**
 * Check global redemption velocity
 */
async function checkGlobalVelocity(
  campaignId: string,
  config: AnomalyConfig
): Promise<AnomalyCheckResult> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const recentRedemptions = await adminDb
    .collection('promotions')
    .doc(campaignId)
    .collection('interactions')
    .where('action', '==', 'purchase')
    .where('timestamp', '>=', Timestamp.fromDate(oneMinuteAgo))
    .count()
    .get();

  const count = recentRedemptions.data().count;

  if (count >= config.velocity.maxGlobalPerMinute) {
    return {
      isAnomaly: true,
      anomalyType: 'velocity_global',
      severity: 'critical',
      details: `${count} redemptions in last minute (threshold: ${config.velocity.maxGlobalPerMinute})`,
      action: 'pause_promotion',
      shouldBlock: true,
    };
  }

  if (count >= config.velocity.maxGlobalPerMinute * 0.8) {
    return {
      isAnomaly: true,
      anomalyType: 'velocity_global',
      severity: 'high',
      details: `${count} redemptions approaching threshold`,
      action: 'flag_for_review',
      shouldBlock: false,
    };
  }

  return {
    isAnomaly: false,
    anomalyType: null,
    severity: null,
    details: '',
    action: 'allow',
    shouldBlock: false,
  };
}

/**
 * Check user-level redemption velocity
 */
async function checkUserVelocity(
  userId: string,
  campaignId: string,
  config: AnomalyConfig
): Promise<AnomalyCheckResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check hourly
  const hourlyCount = await adminDb
    .collection('users')
    .doc(userId)
    .collection('promotions')
    .where('redeemedAt', '>=', Timestamp.fromDate(oneHourAgo))
    .count()
    .get();

  if (hourlyCount.data().count >= config.velocity.maxUserPerHour) {
    return {
      isAnomaly: true,
      anomalyType: 'velocity_user',
      severity: 'high',
      details: `User exceeded hourly limit (${hourlyCount.data().count} redemptions)`,
      action: 'block_transaction',
      shouldBlock: true,
    };
  }

  // Check daily
  const dailyCount = await adminDb
    .collection('users')
    .doc(userId)
    .collection('promotions')
    .where('redeemedAt', '>=', Timestamp.fromDate(oneDayAgo))
    .count()
    .get();

  if (dailyCount.data().count >= config.velocity.maxUserPerDay) {
    return {
      isAnomaly: true,
      anomalyType: 'velocity_user',
      severity: 'medium',
      details: `User exceeded daily limit (${dailyCount.data().count} redemptions)`,
      action: 'block_transaction',
      shouldBlock: true,
    };
  }

  return {
    isAnomaly: false,
    anomalyType: null,
    severity: null,
    details: '',
    action: 'allow',
    shouldBlock: false,
  };
}

/**
 * Check for new account abuse
 */
async function checkAccountAge(
  context: RedemptionContext,
  config: AnomalyConfig
): Promise<AnomalyCheckResult> {
  const accountAgeDays = Math.floor(
    (Date.now() - context.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // New account trying to use high-value promo
  if (accountAgeDays < config.account.minAgeForHighValuePromos) {
    // Check if this is a high-value promotion (>20% discount or >$20 off)
    const discountValue = context.promoMinimum * 0.2; // Simplified check

    if (discountValue > 20) {
      return {
        isAnomaly: true,
        anomalyType: 'new_account',
        severity: 'medium',
        details: `Account is ${accountAgeDays} days old (min: ${config.account.minAgeForHighValuePromos} for this promo)`,
        action: 'require_verification',
        shouldBlock: false,
      };
    }
  }

  return {
    isAnomaly: false,
    anomalyType: null,
    severity: null,
    details: '',
    action: 'allow',
    shouldBlock: false,
  };
}

/**
 * Check for cart value gaming (cart just above minimum)
 */
async function checkCartGaming(
  context: RedemptionContext,
  config: AnomalyConfig
): Promise<AnomalyCheckResult> {
  const aboveMinimum = context.cartValue - context.promoMinimum;

  // Check if cart is suspiciously close to minimum
  if (aboveMinimum >= 0 && aboveMinimum <= config.cartGaming.suspiciousThresholdRange) {
    // Check recent orders from this user for pattern
    const recentOrders = await adminDb
      .collection('orders')
      .where('userId', '==', context.userId)
      .where('hasPromotion', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const nearThresholdCount = recentOrders.docs.filter((doc) => {
      const data = doc.data();
      if (!data.promoMinimum) return false;
      const diff = data.cartValue - data.promoMinimum;
      return diff >= 0 && diff <= config.cartGaming.suspiciousThresholdRange;
    }).length;

    if (nearThresholdCount >= config.cartGaming.maxNearThresholdInWindow) {
      return {
        isAnomaly: true,
        anomalyType: 'cart_gaming',
        severity: 'low',
        details: `User has ${nearThresholdCount} orders just above promo minimums`,
        action: 'flag_for_review',
        shouldBlock: false,
      };
    }
  }

  return {
    isAnomaly: false,
    anomalyType: null,
    severity: null,
    details: '',
    action: 'allow',
    shouldBlock: false,
  };
}

/**
 * Check for geographic anomalies
 */
async function checkGeographicAnomaly(
  context: RedemptionContext,
  config: AnomalyConfig
): Promise<AnomalyCheckResult> {
  // Check if country is flagged
  if (config.geographic.flaggedCountries.includes(context.country)) {
    return {
      isAnomaly: true,
      anomalyType: 'geographic',
      severity: 'medium',
      details: `Request from flagged country: ${context.country}`,
      action: 'require_verification',
      shouldBlock: false,
    };
  }

  // Check for multiple countries in same session
  const sessionCountries = await getSessionCountries(context.sessionId);

  if (sessionCountries.length > config.geographic.maxCountriesPerSession) {
    return {
      isAnomaly: true,
      anomalyType: 'geographic',
      severity: 'high',
      details: `Session has requests from ${sessionCountries.length} countries`,
      action: 'block_transaction',
      shouldBlock: true,
    };
  }

  return {
    isAnomaly: false,
    anomalyType: null,
    severity: null,
    details: '',
    action: 'allow',
    shouldBlock: false,
  };
}

/**
 * Get countries from session
 */
async function getSessionCountries(sessionId: string): Promise<string[]> {
  const requests = await adminDb
    .collection('sessionRequests')
    .where('sessionId', '==', sessionId)
    .get();

  const countries = new Set<string>();
  requests.docs.forEach((doc) => {
    const country = doc.data().country;
    if (country) countries.add(country);
  });

  return Array.from(countries);
}

/**
 * Log detected anomaly
 */
async function logAnomaly(
  context: RedemptionContext,
  anomaly: AnomalyCheckResult
): Promise<void> {
  await adminDb.collection('anomalyLogs').add({
    userId: context.userId,
    campaignId: context.campaignId,
    anomalyType: anomaly.anomalyType,
    severity: anomaly.severity,
    details: anomaly.details,
    action: anomaly.action,
    context: {
      cartValue: context.cartValue,
      ipAddress: context.ipAddress,
      country: context.country,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Auto-pause promotion
 */
async function pausePromotion(campaignId: string, reason: string): Promise<void> {
  await adminDb.collection('promotions').doc(campaignId).update({
    status: 'paused',
    pausedAt: FieldValue.serverTimestamp(),
    pauseReason: reason,
    autoPaused: true,
  });

  // Alert admins (implementation depends on notification system)
  console.warn(`ALERT: Promotion ${campaignId} auto-paused: ${reason}`);
}

// Export types and functions
export type {
  AnomalyCheckResult,
  AnomalyType,
  AnomalyAction,
  AnomalyConfig,
  RedemptionContext,
};
