import { adminDb } from "./firebaseAdminCli.ts";
import {
  evaluateAndActOnChurn,
  fetchChurnSignals,
  predictChurn,
  type ChurnPrediction,
  type RiskLevel,
} from "../lib/promotions/churnPrediction.ts";

type CliOptions = {
  limit: number;
  dryRun: boolean;
  userId?: string;
  minRisk?: RiskLevel;
};

const RISK_RANK: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const parseRisk = (value?: string): RiskLevel | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase() as RiskLevel;
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }
  return undefined;
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const getValue = (flag: string) => {
    const inline = args.find((arg) => arg.startsWith(`--${flag}=`));
    if (inline) return inline.split("=")[1];

    const index = args.findIndex((arg) => arg === `--${flag}`);
    if (index !== -1) return args[index + 1];

    return undefined;
  };

  const limit = Number(getValue("limit") ?? 200);

  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200,
    dryRun: args.includes("--dry-run") || args.includes("--dryRun"),
    userId: getValue("user") ?? getValue("userId"),
    minRisk: parseRisk(getValue("min-risk") ?? getValue("minRisk")),
  };
};

const riskLevelRank = (level: RiskLevel): number => RISK_RANK[level];

const formatProbability = (probability: number) =>
  `${(probability * 100).toFixed(1)}%`;

const fetchCandidateUsers = async (limit: number): Promise<string[]> => {
  const byInactivity = await adminDb
    .collection("users")
    .orderBy("lastLoginAt", "asc")
    .limit(limit)
    .get();

  if (!byInactivity.empty) {
    return byInactivity.docs.map((doc) => doc.id);
  }

  const fallback = await adminDb
    .collection("users")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return fallback.docs.map((doc) => doc.id);
};

const evaluateUser = async (
  userId: string,
  options: CliOptions,
): Promise<ChurnPrediction | null> => {
  const signals = await fetchChurnSignals(userId, adminDb);
  const prediction = predictChurn(signals);

  const meetsThreshold =
    !options.minRisk ||
    riskLevelRank(prediction.riskLevel) >= riskLevelRank(options.minRisk);

  const shouldSkipQueue = options.dryRun || !meetsThreshold;

  try {
    const persisted = await evaluateAndActOnChurn(userId, {
      db: adminDb,
      dryRun: options.dryRun,
      skipQueue: shouldSkipQueue,
      signals,
    });

    const tag = options.dryRun
      ? "[dry-run]"
      : shouldSkipQueue
        ? "[recorded]"
        : "[queued]";

    console.info(
      `${tag} ${userId} risk=${persisted.riskLevel} prob=${formatProbability(
        persisted.churnProbability,
      )} action=${persisted.recommendedAction.type}`,
    );

    return persisted;
  } catch (error) {
    console.error(`Failed to evaluate churn for ${userId}:`, error);
    return null;
  }
};

const main = async () => {
  const options = parseArgs();

  const userIds = options.userId
    ? [options.userId]
    : await fetchCandidateUsers(options.limit);

  if (userIds.length === 0) {
    console.info("No users found for churn evaluation.");
    return;
  }

  const summary: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const userId of userIds) {
    const result = await evaluateUser(userId, options);
    if (result) {
      summary[result.riskLevel] += 1;
    }
  }

  console.info(
    `Finished churn evaluation for ${userIds.length} user(s). dryRun=${options.dryRun ? "yes" : "no"}, minRisk=${options.minRisk ?? "none"}`,
  );
  console.info(
    `Breakdown → low:${summary.low} medium:${summary.medium} high:${summary.high} critical:${summary.critical}`,
  );
};

await main().catch((error) => {
  console.error("Churn evaluation failed:", error);
  process.exitCode = 1;
});
