import crypto from "node:crypto";
import { Queue, Worker, QueueScheduler, type Job, type JobsOptions } from "bullmq";
import IORedis, { type Redis } from "ioredis";
import {
  incrementPromotionMetric,
  recordPromotionSpend,
  trackUserPromoInteraction,
  type MetricType,
  type UserAction,
} from "@/lib/promotions/analytics";
import { drainFallbackJobs, persistFallbackJob } from "@/lib/queue/fallback-queue";
import { trackSessionPromoInteraction } from "@/lib/promotions/sessionAnalytics";

type AnalyticsTask =
  | {
      type: "record-spend";
      campaignId: string;
      discountAmount: number;
      orderValue: number;
    }
  | {
      type: "increment-metric";
      campaignId: string;
      metric: MetricType;
    }
  | {
      type: "track-user";
      campaignId: string;
      userId: string;
      action: UserAction;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "track-session";
      campaignId: string;
      sessionId: string;
      action: UserAction;
      metadata?: Record<string, unknown>;
    };

type AnalyticsJobData = {
  tasks: AnalyticsTask[];
  requestId?: string;
  completed?: number[];
};

type EnqueueResult = {
  queued: boolean;
  mode: "redis" | "fallback" | "inline";
};

const QUEUE_NAME = "promotion-analytics";
const DLQ_NAME = `${QUEUE_NAME}:dead-letter`;
const ENQUEUE_TIMEOUT_MS = 120;
const FALLBACK_DRAIN_INTERVAL_MS = 15_000;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 250 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 86_400, count: 500 },
};

const globalQueueState = globalThis as typeof globalThis & {
  __promotionAnalyticsQueue?: Queue<AnalyticsJobData>;
  __promotionAnalyticsWorker?: Worker<AnalyticsJobData>;
  __promotionAnalyticsScheduler?: QueueScheduler;
  __promotionAnalyticsDlq?: Queue<AnalyticsJobData>;
  __promotionQueueRedis?: Redis | null;
  __promotionQueueRedisErrored?: boolean;
  __promotionQueueFallbackWarned?: boolean;
  __promotionQueueInlineWarned?: boolean;
  __promotionFallbackDrainInFlight?: boolean;
  __promotionFallbackDrainTimer?: NodeJS.Timeout;
};

const logInlineFallbackWarning = (reason: unknown) => {
  if (globalQueueState.__promotionQueueInlineWarned) {
    return;
  }

  globalQueueState.__promotionQueueInlineWarned = true;
  console.warn("[promotions][queue] Falling back to inline analytics processing", {
    reason,
  });
};

const logDiskFallbackWarning = (reason: unknown) => {
  if (globalQueueState.__promotionQueueFallbackWarned) {
    return;
  }

  globalQueueState.__promotionQueueFallbackWarned = true;
  console.warn("[promotions][queue] Using disk fallback for analytics jobs", { reason });
};

const createRedisConnection = (): Redis | null => {
  if (globalQueueState.__promotionQueueRedis !== undefined) {
    return globalQueueState.__promotionQueueRedis;
  }

  const url = process.env.CACHE_REDIS_URL;
  if (!url) {
    globalQueueState.__promotionQueueRedis = null;
    return null;
  }

  const redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redis.on("error", (error) => {
    if (globalQueueState.__promotionQueueRedisErrored) {
      return;
    }

    globalQueueState.__promotionQueueRedisErrored = true;
    console.warn("[promotions][queue] Redis connection error", error);
  });

  redis.on("ready", () => {
    globalQueueState.__promotionQueueRedisErrored = false;
  });

  globalQueueState.__promotionQueueRedis = redis;
  return redis;
};

const isRedisReady = () => globalQueueState.__promotionQueueRedis?.status === "ready";

const buildJobOptions = (jobId?: string): JobsOptions => ({
  ...defaultJobOptions,
  jobId,
});

const enqueueWithTimeout = async (
  queue: Queue<AnalyticsJobData>,
  data: AnalyticsJobData
) => {
  const jobPromise = queue.add("promotion-analytics", data, buildJobOptions(data.requestId));
  let timeoutId: NodeJS.Timeout | null = null;
  let timedOut = false;

  try {
    const timed = Promise.race([
      jobPromise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          reject(new Error("enqueue-timeout"));
        }, ENQUEUE_TIMEOUT_MS);
      }),
    ]);

    return await timed;
  } finally {
    if (timedOut) {
      void jobPromise.catch(() => {});
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const drainFallbackToQueue = async (queue: Queue<AnalyticsJobData>) => {
  if (globalQueueState.__promotionFallbackDrainInFlight) {
    return;
  }

  if (!isRedisReady()) {
    return;
  }

  globalQueueState.__promotionFallbackDrainInFlight = true;
  try {
    const drained = await drainFallbackJobs<AnalyticsJobData>(QUEUE_NAME, async (job) => {
      try {
        await queue.add(
          "promotion-analytics",
          job.payload,
          buildJobOptions(job.requestId ?? job.id)
        );
      } catch (error) {
        const message = (error as { message?: string }).message ?? "";
        if (message.includes("already exists")) {
          return;
        }
        throw error;
      }
    });

    if (drained > 0) {
      console.info("[promotions][queue] Drained analytics fallback jobs", { drained });
    }
  } catch (error) {
    console.warn("[promotions][queue] Failed to drain fallback analytics jobs", error);
  } finally {
    globalQueueState.__promotionFallbackDrainInFlight = false;
  }
};

const getQueue = (): Queue<AnalyticsJobData> | null => {
  if (globalQueueState.__promotionAnalyticsQueue) {
    return globalQueueState.__promotionAnalyticsQueue;
  }

  const connection = createRedisConnection();
  if (!connection) {
    return null;
  }

  const queue = new Queue<AnalyticsJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions,
  });

  globalQueueState.__promotionAnalyticsScheduler = new QueueScheduler(QUEUE_NAME, {
    connection,
  });

  globalQueueState.__promotionAnalyticsDlq = new Queue<AnalyticsJobData>(DLQ_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  globalQueueState.__promotionAnalyticsWorker = new Worker<AnalyticsJobData>(
    QUEUE_NAME,
    (job) => processAnalyticsJob(job),
    { connection, concurrency: 5 }
  );

  globalQueueState.__promotionAnalyticsWorker.on("failed", async (job, error) => {
    if (!job) {
      return;
    }

    const attemptsAllowed = job.opts.attempts ?? defaultJobOptions.attempts ?? 1;
    if (job.attemptsMade < attemptsAllowed) {
      return;
    }

    try {
      await globalQueueState.__promotionAnalyticsDlq?.add(
        "failed-task",
        {
          ...job.data,
          failedReason: error?.message ?? "Unknown error",
          failedAt: new Date().toISOString(),
        },
        { removeOnComplete: false, removeOnFail: false }
      );
    } catch (dlqError) {
      console.error("[promotions][queue] Failed to move analytics job to DLQ", dlqError);
    }
  });

  globalQueueState.__promotionAnalyticsQueue = queue;
  if (!globalQueueState.__promotionFallbackDrainTimer) {
    globalQueueState.__promotionFallbackDrainTimer = setInterval(() => {
      const activeQueue = globalQueueState.__promotionAnalyticsQueue;
      if (activeQueue) {
        void drainFallbackToQueue(activeQueue);
      }
    }, FALLBACK_DRAIN_INTERVAL_MS);
  }

  void drainFallbackToQueue(queue);
  return queue;
};

const runAnalyticsTask = async (task: AnalyticsTask) => {
  switch (task.type) {
    case "record-spend": {
      const success = await recordPromotionSpend(
        task.campaignId,
        task.discountAmount,
        task.orderValue
      );
      if (!success) {
        throw new Error("recordPromotionSpend returned false");
      }
      return;
    }
    case "increment-metric": {
      const success = await incrementPromotionMetric(task.campaignId, task.metric);
      if (!success) {
        throw new Error("incrementPromotionMetric returned false");
      }
      return;
    }
    case "track-user": {
      const success = await trackUserPromoInteraction(
        task.userId,
        task.campaignId,
        task.action,
        task.metadata
      );
      if (!success) {
        throw new Error("trackUserPromoInteraction returned false");
      }
      return;
    }
    case "track-session": {
      const success = await trackSessionPromoInteraction(
        task.sessionId,
        task.campaignId,
        task.action,
        task.metadata
      );
      if (!success) {
        throw new Error("trackSessionPromoInteraction returned false");
      }
      return;
    }
    default:
      // Exhaustive check to satisfy TypeScript
      throw new Error(`Unhandled analytics task type ${(task as AnalyticsTask).type}`);
  }
};

const processAnalyticsJob = async (job: Job<AnalyticsJobData>) => {
  const tasks = job.data.tasks ?? [];
  const completed = new Set<number>(job.data.completed ?? []);

  for (let index = 0; index < tasks.length; index++) {
    if (completed.has(index)) {
      continue;
    }

    await runAnalyticsTask(tasks[index]);
    completed.add(index);
    await job.update({ ...job.data, completed: Array.from(completed) });
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const processInline = (tasks: AnalyticsTask[], requestId?: string) => {
  setTimeout(async () => {
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      let attempt = 0;
      let delay = 200;

      while (attempt < 3) {
        attempt += 1;

        try {
          await runAnalyticsTask(task);
          break;
        } catch (error) {
          if (attempt >= 3) {
            console.error("[promotions][queue] Inline analytics task failed", {
              requestId,
              index,
              task,
              error,
            });
            break;
          }

          await wait(delay);
          delay *= 2;
        }
      }
    }
  }, 0);
};

export const enqueueAnalyticsTasks = async (
  tasks: AnalyticsTask[],
  options?: { requestId?: string }
): Promise<EnqueueResult> => {
  if (tasks.length === 0) {
    return { queued: false, mode: "inline" };
  }

  const requestId = options?.requestId ?? crypto.randomUUID();
  const jobData: AnalyticsJobData = { tasks, requestId };
  const queue = getQueue();
  if (queue) {
    try {
      await enqueueWithTimeout(queue, jobData);
      void drainFallbackToQueue(queue);
      return { queued: true, mode: "redis" };
    } catch (error) {
      console.warn("[promotions][queue] Failed to enqueue analytics job", error);
      logDiskFallbackWarning(error);
    }
  } else {
    logDiskFallbackWarning("no redis queue available");
  }

  try {
    await persistFallbackJob<AnalyticsJobData>(QUEUE_NAME, jobData);
    return { queued: true, mode: "fallback" };
  } catch (error) {
    logInlineFallbackWarning(error);
  }

  processInline(tasks, requestId);
  return { queued: true, mode: "inline" };
};

export type { AnalyticsTask, AnalyticsJobData };
