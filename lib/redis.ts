import "server-only";

import IORedis, { type Redis } from "ioredis";

const globalRedisState = globalThis as typeof globalThis & {
  __insightsRedisClient?: Redis | null;
  __insightsRedisWarned?: boolean;
};

const logRedisWarning = (message: string, error: unknown) => {
  if (globalRedisState.__insightsRedisWarned) return;
  globalRedisState.__insightsRedisWarned = true;
  console.warn(message, error);
};

const createRedisClient = (): Redis | null => {
  if (globalRedisState.__insightsRedisClient !== undefined) {
    return globalRedisState.__insightsRedisClient;
  }

  const url = process.env.CACHE_REDIS_URL;
  if (!url) {
    globalRedisState.__insightsRedisClient = null;
    return null;
  }

  try {
    const client = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on("error", (error) => {
      logRedisWarning("[redis] Insights Redis connection error", error);
      globalRedisState.__insightsRedisClient = null;
    });

    client.on("ready", () => {
      globalRedisState.__insightsRedisWarned = false;
    });

    globalRedisState.__insightsRedisClient = client;
    return client;
  } catch (error) {
    logRedisWarning("[redis] Failed to initialize insights Redis client", error);
    globalRedisState.__insightsRedisClient = null;
    return null;
  }
};

const getRedisClient = () =>
  globalRedisState.__insightsRedisClient ?? createRedisClient();

export const redis = getRedisClient();

export const trackInsightView = async (id: string) => {
  if (!id) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.zincrby("insights:views", 1, id);
  } catch (error) {
    logRedisWarning("[redis] Failed to increment insight view count", error);
  }
};

export const getInsightViewCounts = async (ids: string[]) => {
  const client = getRedisClient();
  if (!client || !ids.length) return {} as Record<string, number>;

  try {
    const pipeline = client.multi();
    ids.forEach((id) => pipeline.zscore("insights:views", id));
    const results = await pipeline.exec();

    return ids.reduce<Record<string, number>>((acc, id, index) => {
      const result = results?.[index];
      const score = result ? Number(result[1]) : NaN;
      if (Number.isFinite(score)) {
        acc[id] = score;
      }
      return acc;
    }, {});
  } catch (error) {
    logRedisWarning("[redis] Failed to read insight view counts", error);
    return {} as Record<string, number>;
  }
};

export const getMostViewedInsights = async (limit = 10) => {
  const client = getRedisClient();
  if (!client || limit <= 0) return [] as string[];

  try {
    return await client.zrevrange("insights:views", 0, Math.max(0, limit - 1));
  } catch (error) {
    logRedisWarning("[redis] Failed to fetch most viewed insights", error);
    return [] as string[];
  }
};
