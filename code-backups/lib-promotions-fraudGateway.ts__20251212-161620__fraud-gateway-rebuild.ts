import 'server-only';
import { checkRateLimit, RATE_LIMIT_CONFIGS, getClientIP } from '@/lib/rateLimit';
import { checkForAnomalies, type RedemptionContext } from './anomalyDetection';
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { NextRequest } from 'next/server';

// Types
interface FraudCheckInput {
  userId: string;
  sessionId: string;
  campaignId: string;
  cartValue: number;
  promoMinimum: number;
  request: NextRequest;
}

interface FraudCheckResult {
  decision: 'allow' | 'challenge' | 'block' | 'review';
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  checks: {
    rateLimit: { passed: boolean; details: string };
    anomaly: { passed: boolean; details: string };
    blocklist: { passed: boolean; details: string };
    verification: { passed: boolean; details: string };
    deviceTrust: { passed: boolean; details: string };
  };
  reasons: string[];
  recommendedAction: string;
  metadata: {
    ipAddress: string;
    country: string;
    deviceFingerprint: string;
    userAgent: string;
  };
}

interface FraudConfig {
  riskThresholds: {
    low: number; // Below this = low risk
    medium: number; // Below this = medium risk
    high: number; // Below this = high risk
    // Above = critical
  };
  decisions: {
    allowMaxScore: number; // Allow if score below
    challengeMaxScore: number; // Challenge if score below (else block)
  };
  weights: {
    rateLimit: number;
    anomaly: number;
    blocklist: number;
    verification: number;
    deviceTrust: number;
  };
}

// Default config
const DEFAULT_CONFIG: FraudConfig = {
  riskThresholds: {
    low: 20,
    medium: 40,
    high: 70,
  },
  decisions: {
    allowMaxScore: 30,
    challengeMaxScore: 70,
  },
  weights: {
    rateLimit: 25,
    anomaly: 30,
    blocklist: 100, // Blocklist is binary - instant block
    verification: 15,
    deviceTrust: 20,
  },
};

/**
 * Main fraud check gateway
 */
export async function checkFraud(
  input: FraudCheckInput,
  config: FraudConfig = DEFAULT_CONFIG
): Promise<FraudCheckResult> {
  const ip = getClientIP(input.request);
  const userAgent = input.request.headers.get('user-agent') || '';
  const country = input.request.headers.get('cf-ipcountry') || 'XX';
  const deviceFingerprint = input.request.headers.get('x-device-fingerprint') || '';

  const checks: FraudCheckResult['checks'] = {
    rateLimit: { passed: true, details: '' },
    anomaly: { passed: true, details: '' },
    blocklist: { passed: true, details: '' },
    verification: { passed: true, details: '' },
    deviceTrust: { passed: true, details: '' },
  };
  const reasons: string[] = [];
  let riskScore = 0;

  // 1. Rate limit check
  const rateLimitResult = await checkRateLimit(
    `fraud:${ip}:${input.userId}`,
    RATE_LIMIT_CONFIGS.redemption
  );
  if (!rateLimitResult.allowed) {
    checks.rateLimit = { passed: false, details: 'Rate limit exceeded' };
    reasons.push('Rate limit exceeded');
    riskScore += config.weights.rateLimit;
  }

  // 2. Blocklist check
  const blocklistResult = await checkBlocklist(input.userId, ip, deviceFingerprint);
  if (!blocklistResult.passed) {
    checks.blocklist = { passed: false, details: blocklistResult.reason };
    reasons.push(`Blocklisted: ${blocklistResult.reason}`);
    riskScore += config.weights.blocklist;
  }

  // 3. Anomaly detection
  const anomalyContext: RedemptionContext = {
    userId: input.userId,
    campaignId: input.campaignId,
    cartValue: input.cartValue,
    promoMinimum: input.promoMinimum,
    ipAddress: ip,
    country,
    userAgent,
    accountCreatedAt: await getAccountCreatedAt(input.userId),
    ordersCount: await getOrdersCount(input.userId),
    sessionId: input.sessionId,
  };

  const anomalyResult = await checkForAnomalies(anomalyContext);
  if (anomalyResult.isAnomaly) {
    checks.anomaly = { passed: false, details: anomalyResult.details };
    reasons.push(anomalyResult.details);
    // Scale anomaly score based on severity
    const severityMultiplier = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 1.0,
    }[anomalyResult.severity || 'medium'];
    riskScore += config.weights.anomaly * severityMultiplier;
  }

  // 4. User verification check
  const verificationResult = await checkUserVerification(input.userId);
  if (!verificationResult.verified) {
    checks.verification = { passed: false, details: verificationResult.reason };
    reasons.push(verificationResult.reason);
    riskScore += config.weights.verification;
  }

  // 5. Device trust check
  const deviceTrustResult = await checkDeviceTrust(input.userId, deviceFingerprint);
  if (!deviceTrustResult.trusted) {
    checks.deviceTrust = { passed: false, details: deviceTrustResult.reason };
    reasons.push(deviceTrustResult.reason);
    riskScore += config.weights.deviceTrust;
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  // Determine risk level
  const riskLevel = getRiskLevel(riskScore, config);

  // Determine decision
  const decision = getDecision(riskScore, checks, config);

  // Get recommended action
  const recommendedAction = getRecommendedAction(decision, riskLevel, checks);

  // Log the check
  await logFraudCheck(input, {
    decision,
    riskScore,
    riskLevel,
    checks,
    reasons,
    ip,
    country,
    deviceFingerprint,
  });

  return {
    decision,
    riskScore,
    riskLevel,
    checks,
    reasons,
    recommendedAction,
    metadata: {
      ipAddress: ip,
      country,
      deviceFingerprint,
      userAgent,
    },
  };
}

/**
 * Check if user, IP, or device is blocklisted
 */
async function checkBlocklist(
  userId: string,
  ip: string,
  deviceFingerprint: string
): Promise<{ passed: boolean; reason: string }> {
  const checks = await Promise.all([
    adminDb.collection('blocklist').doc(`user:${userId}`).get(),
    adminDb.collection('blocklist').doc(`ip:${ip}`).get(),
    deviceFingerprint
      ? adminDb.collection('blocklist').doc(`device:${deviceFingerprint}`).get()
      : Promise.resolve(null),
  ]);

  if (checks[0]?.exists) {
    return { passed: false, reason: 'User is blocklisted' };
  }
  if (checks[1]?.exists) {
    return { passed: false, reason: 'IP is blocklisted' };
  }
  if (checks[2]?.exists) {
    return { passed: false, reason: 'Device is blocklisted' };
  }

  return { passed: true, reason: '' };
}

/**
 * Check user verification status
 */
async function checkUserVerification(
  userId: string
): Promise<{ verified: boolean; reason: string }> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData) {
    return { verified: false, reason: 'User not found' };
  }

  if (!userData.emailVerified) {
    return { verified: false, reason: 'Email not verified' };
  }

  return { verified: true, reason: '' };
}

/**
 * Check if device is trusted for this user
 */
async function checkDeviceTrust(
  userId: string,
  deviceFingerprint: string
): Promise<{ trusted: boolean; reason: string }> {
  if (!deviceFingerprint) {
    return { trusted: false, reason: 'No device fingerprint' };
  }

  const trustedDevices = await adminDb
    .collection('users')
    .doc(userId)
    .collection('trustedDevices')
    .doc(deviceFingerprint)
    .get();

  if (!trustedDevices.exists) {
    return { trusted: false, reason: 'New/unknown device' };
  }

  return { trusted: true, reason: '' };
}

/**
 * Get account creation date
 */
async function getAccountCreatedAt(userId: string): Promise<Date> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const createdAt = userDoc.data()?.createdAt?.toDate();
  return createdAt || new Date();
}

/**
 * Get user's order count
 */
async function getOrdersCount(userId: string): Promise<number> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  return userDoc.data()?.ordersCount || 0;
}

/**
 * Get risk level from score
 */
function getRiskLevel(
  score: number,
  config: FraudConfig
): 'low' | 'medium' | 'high' | 'critical' {
  if (score < config.riskThresholds.low) return 'low';
  if (score < config.riskThresholds.medium) return 'medium';
  if (score < config.riskThresholds.high) return 'high';
  return 'critical';
}

/**
 * Get decision based on score and checks
 */
function getDecision(
  score: number,
  checks: FraudCheckResult['checks'],
  config: FraudConfig
): 'allow' | 'challenge' | 'block' | 'review' {
  // Blocklist is automatic block
  if (!checks.blocklist.passed) {
    return 'block';
  }

  if (score <= config.decisions.allowMaxScore) {
    // Low risk but failed some checks - review
    if (!checks.verification.passed || !checks.deviceTrust.passed) {
      return 'review';
    }
    return 'allow';
  }

  if (score <= config.decisions.challengeMaxScore) {
    return 'challenge';
  }

  return 'block';
}

/**
 * Get recommended action based on decision
 */
function getRecommendedAction(
  decision: string,
  riskLevel: string,
  checks: FraudCheckResult['checks']
): string {
  switch (decision) {
    case 'allow':
      return 'Process redemption normally';
    case 'review':
      return 'Allow but flag for manual review';
    case 'challenge':
      if (!checks.verification.passed) {
        return 'Require email verification before proceeding';
      }
      if (!checks.deviceTrust.passed) {
        return 'Require additional authentication (2FA)';
      }
      return 'Request additional verification';
    case 'block':
      if (!checks.blocklist.passed) {
        return 'Block - entity is blocklisted';
      }
      return `Block - risk score too high (${riskLevel})`;
    default:
      return 'Unknown action';
  }
}

/**
 * Log fraud check for analysis
 */
async function logFraudCheck(
  input: FraudCheckInput,
  result: any
): Promise<void> {
  await adminDb.collection('fraudLogs').add({
    userId: input.userId,
    campaignId: input.campaignId,
    ...result,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Add entity to blocklist
 */
export async function addToBlocklist(
  type: 'user' | 'ip' | 'device',
  identifier: string,
  reason: string,
  addedBy: string
): Promise<void> {
  await adminDb.collection('blocklist').doc(`${type}:${identifier}`).set({
    type,
    identifier,
    reason,
    addedBy,
    addedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Remove entity from blocklist
 */
export async function removeFromBlocklist(
  type: 'user' | 'ip' | 'device',
  identifier: string
): Promise<void> {
  await adminDb.collection('blocklist').doc(`${type}:${identifier}`).delete();
}

// Export types
export type { FraudCheckInput, FraudCheckResult, FraudConfig };
