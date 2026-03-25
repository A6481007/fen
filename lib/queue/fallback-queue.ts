import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type FallbackJob<T> = {
  id: string;
  createdAt: string;
  payload: T;
  requestId?: string;
};

const BASE_DIR = path.join(process.cwd(), "tmp", "queue-fallback");
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

const getQueueDir = (queueName: string) => path.join(BASE_DIR, queueName);

const ensureQueueDir = async (queueName: string) => {
  const dir = getQueueDir(queueName);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const persistFallbackJob = async <T extends { requestId?: string }>(
  queueName: string,
  payload: T
): Promise<FallbackJob<T>> => {
  const dir = await ensureQueueDir(queueName);
  const id = crypto.randomUUID();
  const job: FallbackJob<T> = {
    id,
    createdAt: new Date().toISOString(),
    payload,
    requestId: payload.requestId,
  };

  const filePath = path.join(dir, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(job), "utf8");

  return job;
};

export const drainFallbackJobs = async <T>(
  queueName: string,
  handler: (job: FallbackJob<T>) => Promise<void>,
  options?: { batchSize?: number; maxAgeMs?: number }
): Promise<number> => {
  const dir = getQueueDir(queueName);
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "ENOENT") {
      return 0;
    }
    throw error;
  }

  const jobFiles = files.filter((file) => file.endsWith(".json")).sort();
  const now = Date.now();
  let processed = 0;

  for (const file of jobFiles.slice(0, batchSize)) {
    const filePath = path.join(dir, file);
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    let job: FallbackJob<T> | null = null;
    try {
      job = JSON.parse(content) as FallbackJob<T>;
    } catch (error) {
      console.warn("[promotions][fallback-queue] Skipping unreadable job", {
        queueName,
        file,
        error,
      });
      await fs.unlink(filePath).catch(() => {});
      continue;
    }

    if (now - Date.parse(job.createdAt) > maxAgeMs) {
      await fs.unlink(filePath).catch(() => {});
      continue;
    }

    try {
      await handler(job);
      await fs.unlink(filePath).catch(() => {});
      processed += 1;
    } catch (error) {
      console.warn("[promotions][fallback-queue] Failed to handle fallback job", {
        queueName,
        file,
        error,
      });
    }
  }

  return processed;
};

export type { FallbackJob };
