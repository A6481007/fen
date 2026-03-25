import 'server-only';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebaseAdmin';

export type AnomalySeverity = 'warning' | 'low' | 'medium' | 'high' | 'critical';
export type AnomalyType =
  | 'velocity_campaign'
  | 'velocity_user'
  | 'geographic_jump'
  | 'cart_gaming'
  | 'new_account'
  | 'device_fingerprint';

export type AnomalyAction =
  | 'allow'
  | 'flag_for_review'
  | 'require_verification'
  | 'block_transaction'
  | 'pause_promotion'
  | 'block_user';

export interface AnomalyCheckResult {
  isAnomaly: boolean;
  anomalyType: AnomalyType | null;
  severity: AnomalySeverity | null;
  details: string;
  action: AnomalyAction;
  shouldBlock: boolean;
}

export interface AnomalyFinding {
  type: AnomalyType;
  severity: AnomalySeverity;
  reason: string;
  evidence: Record<string, unknown>;
  action: AnomalyAction;
  shouldBlock: boolean;
  shouldPause: boolean;
}

export interface AggregateAnomalyResult {
  isAnomaly: boolean;
  findings: AnomalyFinding[];
  mostSevere: AnomalyFinding | null;
  shouldBlock: boolean;
  shouldPause: boolean;
  action: AnomalyAction;
}

export interface AnomalyConfig {
  velocity: {
    campaignPerMinuteWarning: number;
    campaignPerMinuteCritical: number;
    userPerHour: number;
    userPerDay: number;
  };
  geographic: {
    maxCountriesPerHour: number;
    flaggedCountries: string[];
  };
  cartGaming: {
    nearMinimumBuffer: number;
    windowMinutes: number;
    minEvents: number;
  };
  accountAge: {
    newAccountHours: number;
    highValuePromoThreshold: number;
  };
  deviceFingerprint: {
    uniqueUsersThreshold: number;
    windowHours: number;
  };
  actions: {
    pauseOnCritical: boolean;
  };
}

export interface RedemptionContext {
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
  promoValue?: number;
  appliedDiscountValue?: number;
  estimatedDiscountValue?: number;
  deviceFingerprint?: string;
  now?: Date;
}

const DEFAULT_CONFIG: AnomalyConfig = {
  velocity: {
    campaignPerMinuteWarning: 5,
    campaignPerMinuteCritical: 12,
    userPerHour: 6,
    userPerDay: 14,
  },
  geographic: {
    maxCountriesPerHour: 2,
    flaggedCountries: [],
  },
  cartGaming: {
    nearMinimumBuffer: 5,
    windowMinutes: 30,
    minEvents: 3,
  },
  accountAge: {
    newAccountHours: 24,
    highValuePromoThreshold: 50,
  },
  deviceFingerprint: {
    uniqueUsersThreshold: 3,
    windowHours: 24,
  },
  actions: {
    pauseOnCritical: true,
  },
};

const SEVERITY_ORDER: Record<AnomalySeverity, number> = {
  warning: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

/**
 * Main anomaly detection function exposed to callers.
 */
export async function checkForAnomalies(
  context: RedemptionContext,
  config: AnomalyConfig = DEFAULT_CONFIG
): Promise<AnomalyCheckResult> {
  const now = context.now ?? new Date();
  const aggregate = await evaluateAllChecks({ ...context, now }, config);

  if (!aggregate.isAnomaly || !aggregate.mostSevere) {
    return {
      isAnomaly: false,
      anomalyType: null,
      severity: null,
      details: 'No anomalies detected',
      action: 'allow',
      shouldBlock: false,
    };
  }

  await logAnomaly(context, aggregate, now);

  if (aggregate.shouldPause && config.actions.pauseOnCritical) {
    await autoPausePromotion(
      context.campaignId,
      `${aggregate.mostSevere.type} anomaly: ${aggregate.mostSevere.reason}`
    );
  }

  return {
    isAnomaly: true,
    anomalyType: aggregate.mostSevere.type,
    severity: aggregate.mostSevere.severity,
    details: aggregate.mostSevere.reason,
    action: aggregate.mostSevere.action,
    shouldBlock: aggregate.mostSevere.shouldBlock,
  };
}

/**
 * Evaluate the full anomaly suite and return all triggered findings.
 */
export async function evaluateAllChecks(
  context: RedemptionContext,
  config: AnomalyConfig = DEFAULT_CONFIG
): Promise<AggregateAnomalyResult> {
  const now = context.now ?? new Date();

  const findings: AnomalyFinding[] = [
    ...(await checkVelocityAnomaly(context, config, now)),
    ...(await checkGeographicAnomaly(context, config, now)),
    ...(await checkCartGaming(context, config, now)),
    ...(await checkAccountAge(context, config, now)),
    ...(await checkDeviceFingerprint(context, config, now)),
  ];

  const mostSevere = findings.reduce<AnomalyFinding | null>((current, candidate) => {
    if (!current) return candidate;
    return SEVERITY_ORDER[candidate.severity] > SEVERITY_ORDER[current.severity]
      ? candidate
      : current;
  }, null);

  const shouldPause =
    config.actions.pauseOnCritical &&
    findings.some((finding) => finding.shouldPause || finding.severity === 'critical');
  const shouldBlock = findings.some((finding) => finding.shouldBlock);

  return {
    isAnomaly: findings.length > 0,
    findings,
    mostSevere,
    shouldBlock,
    shouldPause,
    action: mostSevere?.action ?? 'allow',
  };
}

export async function checkVelocityAnomaly(
  context: RedemptionContext,
  config: AnomalyConfig,
  now: Date
): Promise<AnomalyFinding[]> {
  const minuteAgo = new Date(now.getTime() - 60_000);
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);

  const campaignMinuteCountSnapshot = await adminDb
    .collection('promotions')
    .doc(context.campaignId)
    .collection('interactions')
    .where('action', '==', 'purchase')
    .where('timestamp', '>=', Timestamp.fromDate(minuteAgo))
    .count()
    .get();

  const userHourCountSnapshot = await adminDb
    .collection('users')
    .doc(context.userId)
    .collection('promotions')
    .where('redeemedAt', '>=', Timestamp.fromDate(hourAgo))
    .count()
    .get();

  const userDayCountSnapshot = await adminDb
    .collection('users')
    .doc(context.userId)
    .collection('promotions')
    .where('redeemedAt', '>=', Timestamp.fromDate(dayAgo))
    .count()
    .get();

  const campaignMinuteCount = campaignMinuteCountSnapshot.data().count ?? 0;
  const userHourCount = userHourCountSnapshot.data().count ?? 0;
  const userDayCount = userDayCountSnapshot.data().count ?? 0;

  const findings: AnomalyFinding[] = [];

  if (campaignMinuteCount >= config.velocity.campaignPerMinuteCritical) {
    findings.push({
      type: 'velocity_campaign',
      severity: 'critical',
      reason: `${campaignMinuteCount} purchases in 60s (critical threshold: ${config.velocity.campaignPerMinuteCritical})`,
      evidence: {
        count: campaignMinuteCount,
        windowSeconds: 60,
      },
      action: 'pause_promotion',
      shouldBlock: true,
      shouldPause: true,
    });
  } else if (campaignMinuteCount >= config.velocity.campaignPerMinuteWarning) {
    findings.push({
      type: 'velocity_campaign',
      severity: 'warning',
      reason: `${campaignMinuteCount} purchases in 60s (warning threshold: ${config.velocity.campaignPerMinuteWarning})`,
      evidence: {
        count: campaignMinuteCount,
        windowSeconds: 60,
      },
      action: 'flag_for_review',
      shouldBlock: false,
      shouldPause: false,
    });
  }

  if (userHourCount >= config.velocity.userPerHour) {
    findings.push({
      type: 'velocity_user',
      severity: 'high',
      reason: `${userHourCount} purchases for user in 1h (threshold: ${config.velocity.userPerHour})`,
      evidence: {
        userHourCount,
        windowMinutes: 60,
      },
      action: 'block_transaction',
      shouldBlock: true,
      shouldPause: false,
    });
  } else if (userDayCount >= config.velocity.userPerDay) {
    findings.push({
      type: 'velocity_user',
      severity: 'medium',
      reason: `${userDayCount} purchases for user in 24h (threshold: ${config.velocity.userPerDay})`,
      evidence: {
        userDayCount,
        windowHours: 24,
      },
      action: 'flag_for_review',
      shouldBlock: false,
      shouldPause: false,
    });
  }

  return findings;
}

export async function checkGeographicAnomaly(
  context: RedemptionContext,
  config: AnomalyConfig,
  now: Date
): Promise<AnomalyFinding[]> {
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const countries = new Set<string>();
  countries.add(context.country);

  const sessionQuery = adminDb
    .collection('sessionRequests')
    .where('sessionId', '==', context.sessionId)
    .where('createdAt', '>=', Timestamp.fromDate(hourAgo));

  try {
    const sessionSnapshot = await sessionQuery.get();

    sessionSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { country?: string; createdAt?: unknown };
      const createdAt = toDate(data.createdAt) ?? now;
      if (createdAt >= hourAgo && data.country) {
        countries.add(data.country);
      }
    });
  } catch (error) {
    console.warn('[anomalyDetection] failed to evaluate geographic history', error);
  }

  const findings: AnomalyFinding[] = [];

  if (config.geographic.flaggedCountries.includes(context.country)) {
    findings.push({
      type: 'geographic_jump',
      severity: 'high',
      reason: `Redemption from flagged country ${context.country}`,
      evidence: { country: context.country },
      action: 'require_verification',
      shouldBlock: false,
      shouldPause: false,
    });
  }

  if (countries.size >= config.geographic.maxCountriesPerHour) {
    findings.push({
      type: 'geographic_jump',
      severity: 'high',
      reason: `Detected ${countries.size} countries within 1h session window`,
      evidence: {
        countries: Array.from(countries),
        windowMinutes: 60,
      },
      action: 'block_transaction',
      shouldBlock: true,
      shouldPause: false,
    });
  }

  return findings;
}

export async function checkCartGaming(
  context: RedemptionContext,
  config: AnomalyConfig,
  now: Date
): Promise<AnomalyFinding[]> {
  const windowStart = new Date(now.getTime() - config.cartGaming.windowMinutes * 60_000);
  const ordersSnapshot = await adminDb
    .collection('orders')
    .where('userId', '==', context.userId)
    .where('hasPromotion', '==', true)
    .where('createdAt', '>=', Timestamp.fromDate(windowStart))
    .get();

  const nearThresholdOrders = ordersSnapshot.docs.filter((doc) => {
    const data = doc.data() as { cartValue?: number; promoMinimum?: number; createdAt?: unknown };
    const createdAt = toDate(data.createdAt) ?? now;
    if (createdAt < windowStart) return false;

    const cartValue = toNumber(data.cartValue, 0);
    const promoMinimum = toNumber(data.promoMinimum, context.promoMinimum);
    const diff = cartValue - promoMinimum;

    return cartValue >= promoMinimum && diff >= 0 && diff <= config.cartGaming.nearMinimumBuffer;
  }).length;

  const currentDiff = context.cartValue - context.promoMinimum;
  const isCurrentNear =
    context.cartValue >= context.promoMinimum &&
    currentDiff >= 0 &&
    currentDiff <= config.cartGaming.nearMinimumBuffer;

  const totalNearThreshold = nearThresholdOrders + (isCurrentNear ? 1 : 0);

  if (totalNearThreshold >= config.cartGaming.minEvents) {
    return [
      {
        type: 'cart_gaming',
        severity: 'medium',
        reason: `${totalNearThreshold} carts within $${config.cartGaming.nearMinimumBuffer} of promo minimum in ${config.cartGaming.windowMinutes}m`,
        evidence: {
          recentNearThresholdOrders: nearThresholdOrders,
          currentIsNear: isCurrentNear,
          windowMinutes: config.cartGaming.windowMinutes,
        },
        action: 'flag_for_review',
        shouldBlock: false,
        shouldPause: false,
      },
    ];
  }

  return [];
}

export async function checkAccountAge(
  context: RedemptionContext,
  config: AnomalyConfig,
  now: Date
): Promise<AnomalyFinding[]> {
  const accountAgeHours = (now.getTime() - context.accountCreatedAt.getTime()) / (60 * 60_000);
  const promoValue = resolvePromoValue(context);

  if (
    accountAgeHours < config.accountAge.newAccountHours &&
    promoValue >= config.accountAge.highValuePromoThreshold
  ) {
    return [
      {
        type: 'new_account',
        severity: 'high',
        reason: `Account age ${accountAgeHours.toFixed(1)}h with high-value promo $${promoValue}`,
        evidence: {
          accountAgeHours,
          promoValue,
          threshold: config.accountAge.highValuePromoThreshold,
        },
        action: 'require_verification',
        shouldBlock: false,
        shouldPause: false,
      },
    ];
  }

  return [];
}

async function checkDeviceFingerprint(
  context: RedemptionContext,
  config: AnomalyConfig,
  now: Date
): Promise<AnomalyFinding[]> {
  if (!context.deviceFingerprint) {
    return [];
  }

  const windowStart = new Date(now.getTime() - config.deviceFingerprint.windowHours * 60 * 60_000);
  const userIds = new Set<string>();

  try {
    const fingerprintDoc = await adminDb
      .collection('deviceFingerprints')
      .doc(context.deviceFingerprint)
      .get();

    if (fingerprintDoc?.exists) {
      const data = fingerprintDoc.data() as {
        users?: Array<{ userId: string; lastSeen?: unknown }>;
        recentUserIds?: string[];
      };

      data?.users?.forEach((entry) => {
        const lastSeen = toDate(entry.lastSeen) ?? now;
        if (lastSeen >= windowStart) {
          userIds.add(entry.userId);
        }
      });

      data?.recentUserIds?.forEach((userId) => {
        userIds.add(userId);
      });
    }
  } catch (error) {
    console.warn('[anomalyDetection] failed to read device fingerprint document', error);
  }

  try {
    const sessionSnapshot = await adminDb
      .collection('sessionRequests')
      .where('deviceFingerprint', '==', context.deviceFingerprint)
      .where('createdAt', '>=', Timestamp.fromDate(windowStart))
      .get();

    sessionSnapshot.docs.forEach((doc) => {
      const data = doc.data() as { userId?: string; createdAt?: unknown };
      const createdAt = toDate(data.createdAt) ?? now;
      if (createdAt >= windowStart && data.userId) {
        userIds.add(data.userId);
      }
    });
  } catch (error) {
    console.warn('[anomalyDetection] failed to evaluate fingerprint sessions', error);
  }

  userIds.add(context.userId);

  if (userIds.size >= config.deviceFingerprint.uniqueUsersThreshold) {
    return [
      {
        type: 'device_fingerprint',
        severity: 'critical',
        reason: `Device fingerprint seen with ${userIds.size} users in ${config.deviceFingerprint.windowHours}h`,
        evidence: {
          deviceFingerprint: context.deviceFingerprint,
          uniqueUsers: Array.from(userIds),
          windowHours: config.deviceFingerprint.windowHours,
        },
        action: 'pause_promotion',
        shouldBlock: true,
        shouldPause: true,
      },
    ];
  }

  return [];
}

async function logAnomaly(
  context: RedemptionContext,
  aggregate: AggregateAnomalyResult,
  now: Date
): Promise<void> {
  if (!aggregate.isAnomaly) return;

  await adminDb.collection('anomalyLogs').add({
    userId: context.userId,
    campaignId: context.campaignId,
    anomalyType: aggregate.mostSevere?.type ?? null,
    severity: aggregate.mostSevere?.severity ?? null,
    action: aggregate.action,
    shouldBlock: aggregate.shouldBlock,
    shouldPause: aggregate.shouldPause,
    findings: aggregate.findings,
    context: {
      cartValue: context.cartValue,
      promoMinimum: context.promoMinimum,
      ipAddress: context.ipAddress,
      country: context.country,
      userAgent: context.userAgent,
      deviceFingerprint: context.deviceFingerprint ?? null,
      sessionId: context.sessionId,
    },
    accountAgeHours: (now.getTime() - context.accountCreatedAt.getTime()) / (60 * 60_000),
    ordersCount: context.ordersCount,
    createdAt: FieldValue.serverTimestamp(),
    observedAt: Timestamp.fromDate(now),
  });
}

export async function autoPausePromotion(campaignId: string, reason: string): Promise<void> {
  await adminDb.collection('promotions').doc(campaignId).update({
    status: 'paused',
    pausedAt: FieldValue.serverTimestamp(),
    pauseReason: reason,
    autoPaused: true,
  });

  console.warn(`ALERT: Promotion ${campaignId} auto-paused: ${reason}`);
}

function resolvePromoValue(context: RedemptionContext): number {
  if (typeof context.promoValue === 'number') return context.promoValue;
  if (typeof context.appliedDiscountValue === 'number') return context.appliedDiscountValue;
  if (typeof context.estimatedDiscountValue === 'number') return context.estimatedDiscountValue;

  const inferred = context.cartValue - context.promoMinimum;
  return inferred > 0 ? inferred : 0;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  return fallback;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

export { DEFAULT_CONFIG };
