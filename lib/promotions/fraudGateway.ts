import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { adminDb, FieldValue } from "@/lib/firebaseAdmin";
import { getClientIP, RATE_LIMIT_CONFIGS, checkRateLimit } from "@/lib/rateLimit";
import {
  DEFAULT_CONFIG as ANOMALY_DEFAULT_CONFIG,
  autoPausePromotion,
  evaluateAllChecks,
  type AnomalyFinding,
  type AnomalySeverity,
  type RedemptionContext,
} from "./anomalyDetection";

export type FraudDecision = "allow" | "challenge" | "deny";
type ChallengeType = "captcha" | "email_verification";
type FraudCheckName = "rateLimit" | "blocklist" | "accountAge" | "velocity" | "geographic" | "cartGaming";

export interface FraudCheckInput {
  userId: string;
  sessionId: string;
  campaignId: string;
  cartValue: number;
  promoMinimum: number;
  request: NextRequest;
  promoValue?: number;
  appliedDiscountValue?: number;
  estimatedDiscountValue?: number;
  deviceFingerprint?: string;
}

export interface FraudCheckDetail {
  weight: number;
  score: number;
  passed: boolean;
  reason: string;
  severity?: AnomalySeverity | "info";
  evidence?: Record<string, unknown>;
  action?: FraudDecision;
}

export interface DecisionThresholds {
  allow: number;
  challenge: number;
}

export interface FraudWeights {
  rateLimit: number;
  blocklist: number;
  accountAge: number;
  velocity: number;
  geographic: number;
  cartGaming: number;
}

export interface FraudGatewayConfig {
  thresholds: DecisionThresholds;
  weights: FraudWeights;
  severityMultipliers: Record<AnomalySeverity | "info" | "default", number>;
}

export interface FraudCheckResult {
  decision: FraudDecision;
  riskScore: number;
  thresholds: DecisionThresholds;
  checks: Record<FraudCheckName, FraudCheckDetail>;
  reasons: string[];
  recommendedAction: string;
  challenge?: { type: ChallengeType; reason: string };
  metadata: {
    userId: string;
    sessionId: string;
    campaignId: string;
    ipAddress: string;
    country: string;
    userAgent: string;
    deviceFingerprint: string;
  };
  findings: AnomalyFinding[];
}

export interface FraudMiddlewareOptions {
  deriveInput: (req: NextRequest) => Promise<Omit<FraudCheckInput, "request">> | Omit<FraudCheckInput, "request">;
  config?: Partial<FraudGatewayConfig>;
  onDecision?: (result: FraudCheckResult) => void | Promise<void>;
}

const DEFAULT_CONFIG: FraudGatewayConfig = {
  thresholds: {
    allow: 30,
    challenge: 60,
  },
  weights: {
    rateLimit: 30,
    blocklist: 100,
    accountAge: 15,
    velocity: 25,
    geographic: 20,
    cartGaming: 15,
  },
  severityMultipliers: {
    default: 1,
    info: 1,
    warning: 0.4,
    low: 0.6,
    medium: 0.8,
    high: 1,
    critical: 1,
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
 * Main fraud gateway entrypoint. Runs rate limit, blocklist, account age, and anomaly checks,
 * then returns a unified decision with scoring and recommended actions.
 */
export async function checkFraud(
  input: FraudCheckInput,
  overrides: Partial<FraudGatewayConfig> = {},
): Promise<FraudCheckResult> {
  const config = mergeConfig(overrides);
  const ip = getClientIP(input.request);
  const userAgent = input.request.headers.get("user-agent") ?? "";
  const country = input.request.headers.get("cf-ipcountry") ?? "XX";
  const deviceFingerprint =
    input.deviceFingerprint ?? input.request.headers.get("x-device-fingerprint") ?? "";
  const now = new Date();

  const checks = createInitialChecks(config.weights);
  const reasons: string[] = [];
  let riskScore = 0;

  // 1) Rate limit
  const rateLimitResult = await checkRateLimit(
    `fraud:${ip}:${input.userId}`,
    RATE_LIMIT_CONFIGS.redemption,
  );
  if (!rateLimitResult.allowed) {
    const added = failCheck(checks, "rateLimit", config, "Rate limit exceeded", "high", {
      retryAfter: rateLimitResult.retryAfter,
      remaining: rateLimitResult.remaining,
      limit: (RATE_LIMIT_CONFIGS.redemption as { maxRequests?: number; limit?: number }).maxRequests
        ?? (RATE_LIMIT_CONFIGS.redemption as { limit?: number }).limit,
    });
    riskScore += added;
    reasons.push("Rate limit exceeded");
  }

  // 2) Blocklist
  const blocklist = await checkBlocklist(input.userId, ip, deviceFingerprint);
  if (!blocklist.passed) {
    const added = failCheck(checks, "blocklist", config, blocklist.reason, "critical", blocklist.evidence, "deny");
    riskScore += added;
    reasons.push(blocklist.reason);
  }

  // 3) Account profile
  const profile = await getUserProfile(input.userId);
  const accountAgeHours = hoursBetween(profile.createdAt, now);
  const accountAgeThreshold = ANOMALY_DEFAULT_CONFIG.accountAge.newAccountHours ?? 24;
  if (accountAgeHours < accountAgeThreshold) {
    const added = failCheck(
      checks,
      "accountAge",
      config,
      `Account age ${accountAgeHours.toFixed(1)}h under ${accountAgeThreshold}h threshold`,
      "medium",
      { accountAgeHours },
      "challenge",
    );
    riskScore += added;
    reasons.push(`Account age under ${accountAgeThreshold}h`);
  }

  // 4) Anomaly checks (velocity, geo, cart gaming, new account)
  const anomalyContext: RedemptionContext = {
    userId: input.userId,
    campaignId: input.campaignId,
    cartValue: input.cartValue,
    promoMinimum: input.promoMinimum,
    ipAddress: ip,
    country,
    userAgent,
    accountCreatedAt: profile.createdAt,
    ordersCount: profile.ordersCount,
    sessionId: input.sessionId,
    promoValue: input.promoValue,
    appliedDiscountValue: input.appliedDiscountValue,
    estimatedDiscountValue: input.estimatedDiscountValue,
    deviceFingerprint,
    now,
  };

  const anomalyAggregate = await evaluateAllChecks(anomalyContext, ANOMALY_DEFAULT_CONFIG);
  if (anomalyAggregate.shouldPause && anomalyAggregate.mostSevere) {
    await autoPausePromotion(
      input.campaignId,
      `Fraud gateway autopause: ${anomalyAggregate.mostSevere.reason}`,
    );
  }

  riskScore += applyFindingCheck(
    checks,
    "velocity",
    config,
    anomalyAggregate.findings.filter(
      (finding) => finding.type === "velocity_campaign" || finding.type === "velocity_user",
    ),
    reasons,
  );
  riskScore += applyFindingCheck(
    checks,
    "geographic",
    config,
    anomalyAggregate.findings.filter((finding) => finding.type === "geographic_jump"),
    reasons,
  );
  riskScore += applyFindingCheck(
    checks,
    "cartGaming",
    config,
    anomalyAggregate.findings.filter((finding) => finding.type === "cart_gaming"),
    reasons,
  );
  riskScore += applyFindingCheck(
    checks,
    "accountAge",
    config,
    anomalyAggregate.findings.filter((finding) => finding.type === "new_account"),
    reasons,
  );

  riskScore = Math.min(100, Math.round(riskScore));

  // 5) Decision
  let decision: FraudDecision;
  if (!checks.blocklist.passed || anomalyAggregate.shouldBlock) {
    decision = "deny";
  } else if (riskScore <= config.thresholds.allow) {
    decision = checks.rateLimit.passed ? "allow" : "challenge";
  } else if (riskScore <= config.thresholds.challenge) {
    decision = "challenge";
  } else {
    decision = "deny";
  }

  const hasChallengeFlag = Object.values(checks).some((check) => check.action === "challenge");
  if (decision === "allow" && hasChallengeFlag) {
    decision = "challenge";
  }

  const challenge = decision === "challenge" ? buildChallenge(checks, profile.emailVerified) : undefined;
  const recommendedAction = buildRecommendedAction(decision, checks, challenge);

  const result: FraudCheckResult = {
    decision,
    riskScore,
    thresholds: config.thresholds,
    checks,
    reasons,
    recommendedAction,
    challenge,
    metadata: {
      userId: input.userId,
      sessionId: input.sessionId,
      campaignId: input.campaignId,
      ipAddress: ip,
      country,
      userAgent,
      deviceFingerprint,
    },
    findings: anomalyAggregate.findings,
  };

  await logFraudEvent(input, result, anomalyAggregate.findings);

  return result;
}

/**
 * API middleware helper to run fraud checks before handling a request.
 */
export function withFraudCheck(
  handler: (req: NextRequest, fraud: FraudCheckResult) => Promise<Response> | Response,
  options: FraudMiddlewareOptions,
) {
  return async function fraudCheckedHandler(req: NextRequest): Promise<Response> {
    if (!options?.deriveInput) {
      throw new Error("withFraudCheck requires a deriveInput function");
    }

    const derived = await options.deriveInput(req);
    const fraud = await checkFraud({ ...derived, request: req }, options.config);
    if (options.onDecision) {
      await options.onDecision(fraud);
    }

    if (fraud.decision === "deny") {
      return NextResponse.json(
        {
          error: "fraud_denied",
          score: fraud.riskScore,
          reasons: fraud.reasons,
          decision: fraud.decision,
        },
        { status: 403 },
      );
    }

    if (fraud.decision === "challenge") {
      return NextResponse.json(
        {
          error: "fraud_challenge",
          score: fraud.riskScore,
          challenge: fraud.challenge,
          reasons: fraud.reasons,
          decision: fraud.decision,
        },
        { status: 401 },
      );
    }

    const response = await handler(req, fraud);
    const nextResponse =
      response instanceof NextResponse
        ? response
        : new NextResponse(response.body, {
            status: response.status,
            headers: response.headers,
          });

    nextResponse.headers.set("X-Fraud-Score", String(fraud.riskScore));
    nextResponse.headers.set("X-Fraud-Decision", fraud.decision);
    return nextResponse;
  };
}

export async function addToBlocklist(
  type: "user" | "ip" | "device",
  identifier: string,
  reason: string,
  addedBy: string,
): Promise<void> {
  await adminDb.collection("blocklist").doc(`${type}:${identifier}`).set({
    type,
    identifier,
    reason,
    addedBy,
    addedAt: FieldValue.serverTimestamp(),
  });
}

export async function removeFromBlocklist(
  type: "user" | "ip" | "device",
  identifier: string,
): Promise<void> {
  await adminDb.collection("blocklist").doc(`${type}:${identifier}`).delete();
}

function mergeConfig(overrides: Partial<FraudGatewayConfig>): FraudGatewayConfig {
  return {
    thresholds: {
      allow: overrides.thresholds?.allow ?? DEFAULT_CONFIG.thresholds.allow,
      challenge: overrides.thresholds?.challenge ?? DEFAULT_CONFIG.thresholds.challenge,
    },
    weights: {
      rateLimit: overrides.weights?.rateLimit ?? DEFAULT_CONFIG.weights.rateLimit,
      blocklist: overrides.weights?.blocklist ?? DEFAULT_CONFIG.weights.blocklist,
      accountAge: overrides.weights?.accountAge ?? DEFAULT_CONFIG.weights.accountAge,
      velocity: overrides.weights?.velocity ?? DEFAULT_CONFIG.weights.velocity,
      geographic: overrides.weights?.geographic ?? DEFAULT_CONFIG.weights.geographic,
      cartGaming: overrides.weights?.cartGaming ?? DEFAULT_CONFIG.weights.cartGaming,
    },
    severityMultipliers: {
      ...DEFAULT_CONFIG.severityMultipliers,
      ...(overrides.severityMultipliers ?? {}),
    },
  };
}

function createInitialChecks(weights: FraudWeights): Record<FraudCheckName, FraudCheckDetail> {
  return {
    rateLimit: { weight: weights.rateLimit, score: 0, passed: true, reason: "" },
    blocklist: { weight: weights.blocklist, score: 0, passed: true, reason: "" },
    accountAge: { weight: weights.accountAge, score: 0, passed: true, reason: "" },
    velocity: { weight: weights.velocity, score: 0, passed: true, reason: "" },
    geographic: { weight: weights.geographic, score: 0, passed: true, reason: "" },
    cartGaming: { weight: weights.cartGaming, score: 0, passed: true, reason: "" },
  };
}

function scoreForSeverity(
  weight: number,
  severity: AnomalySeverity | "info" | undefined,
  multipliers: FraudGatewayConfig["severityMultipliers"],
): number {
  const multiplier = severity ? multipliers[severity] ?? multipliers.default : multipliers.default;
  return Math.min(weight, Math.round(weight * multiplier));
}

function failCheck(
  checks: Record<FraudCheckName, FraudCheckDetail>,
  name: FraudCheckName,
  config: FraudGatewayConfig,
  reason: string,
  severity: AnomalySeverity | "info" | undefined,
  evidence?: Record<string, unknown>,
  action?: FraudDecision,
): number {
  const current = checks[name];
  const scored = scoreForSeverity(current.weight, severity, config.severityMultipliers);
  const appliedScore = Math.max(current.score, scored);
  const added = appliedScore - current.score;

  checks[name] = {
    ...current,
    passed: false,
    score: appliedScore,
    reason,
    severity,
    evidence: evidence ?? current.evidence,
    action: action ?? current.action,
  };

  return added > 0 ? added : 0;
}

function applyFindingCheck(
  checks: Record<FraudCheckName, FraudCheckDetail>,
  name: FraudCheckName,
  config: FraudGatewayConfig,
  findings: AnomalyFinding[],
  reasons: string[],
): number {
  if (!findings.length) return 0;
  const top = selectTopFinding(findings);
  const added = failCheck(
    checks,
    name,
    config,
    top.reason,
    top.severity ?? "medium",
    top.evidence,
    top.shouldBlock ? "deny" : top.action === "require_verification" ? "challenge" : undefined,
  );
  reasons.push(top.reason);
  return added;
}

function selectTopFinding(findings: AnomalyFinding[]): AnomalyFinding {
  return findings.reduce((current, candidate) => {
    const currentScore = current ? SEVERITY_ORDER[current.severity] ?? 0 : -1;
    const candidateScore = SEVERITY_ORDER[candidate.severity] ?? 0;
    return candidateScore > currentScore ? candidate : current;
  });
}

function buildChallenge(
  checks: Record<FraudCheckName, FraudCheckDetail>,
  emailVerified: boolean,
): { type: ChallengeType; reason: string } {
  if (!emailVerified || !checks.accountAge.passed) {
    return {
      type: "email_verification",
      reason: checks.accountAge.reason || "Verify account ownership",
    };
  }

  if (!checks.geographic.passed || !checks.velocity.passed) {
    const reason = !checks.geographic.passed
      ? checks.geographic.reason
      : checks.velocity.reason;
    return {
      type: "captcha",
      reason: reason || "Complete verification challenge",
    };
  }

  return {
    type: "captcha",
    reason: "Complete verification challenge",
  };
}

function buildRecommendedAction(
  decision: FraudDecision,
  checks: Record<FraudCheckName, FraudCheckDetail>,
  challenge: { type: ChallengeType; reason: string } | undefined,
): string {
  if (decision === "allow") {
    return "Process redemption normally";
  }

  if (decision === "challenge") {
    if (challenge?.type === "email_verification") {
      return "Require email verification before processing";
    }
    return "Present CAPTCHA or device challenge before processing";
  }

  const firstFailure =
    Object.values(checks).find((check) => !check.passed)?.reason ??
    "Fraud score exceeded policy threshold";
  return `Block request: ${firstFailure}`;
}

async function logFraudEvent(
  input: FraudCheckInput,
  result: FraudCheckResult,
  findings: AnomalyFinding[],
): Promise<void> {
  if (result.decision === "allow") return;

  try {
    await adminDb.collection("fraudLogs").add({
      userId: input.userId,
      sessionId: input.sessionId,
      campaignId: input.campaignId,
      decision: result.decision,
      riskScore: result.riskScore,
      reasons: result.reasons,
      checks: result.checks,
      findings,
      metadata: result.metadata,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("[fraudGateway] failed to log fraud event", error);
  }
}

async function checkBlocklist(
  userId: string,
  ip: string,
  deviceFingerprint: string,
): Promise<{ passed: boolean; reason: string; evidence?: Record<string, unknown> }> {
  const checks = await Promise.all([
    adminDb.collection("blocklist").doc(`user:${userId}`).get(),
    adminDb.collection("blocklist").doc(`ip:${ip}`).get(),
    deviceFingerprint
      ? adminDb.collection("blocklist").doc(`device:${deviceFingerprint}`).get()
      : Promise.resolve(null),
  ]);

  if (checks[0]?.exists) {
    return { passed: false, reason: "User is blocklisted", evidence: { userId } };
  }
  if (checks[1]?.exists) {
    return { passed: false, reason: "IP is blocklisted", evidence: { ip } };
  }
  if (checks[2]?.exists) {
    return {
      passed: false,
      reason: "Device fingerprint is blocklisted",
      evidence: { deviceFingerprint },
    };
  }

  return { passed: true, reason: "" };
}

async function getUserProfile(userId: string): Promise<{
  createdAt: Date;
  ordersCount: number;
  emailVerified: boolean;
}> {
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const data = userDoc?.data?.() ?? {};

  return {
    createdAt: toDate(data.createdAt) ?? new Date(0),
    ordersCount: typeof data.ordersCount === "number" ? data.ordersCount : 0,
    emailVerified: Boolean(data.emailVerified),
  };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function hoursBetween(older: Date, newer: Date): number {
  return (newer.getTime() - older.getTime()) / (60 * 60_000);
}

export { DEFAULT_CONFIG };
