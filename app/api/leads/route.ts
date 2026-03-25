import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";

import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const enqueueLeadNotification = async (leadId: string) => {
  try {
    const redisUrl = process.env.CACHE_REDIS_URL;
    if (!redisUrl) return;
    const queue = new Queue("notifications", {
      connection: { url: redisUrl },
    });
    await queue.add("lead-email", { leadId });
    await queue.close();
  } catch (error) {
    console.warn("[leads] Failed to enqueue lead notification", error);
  }
};

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { ok: false, error: "Lead capture unavailable" },
        { status: 503, headers: JSON_HEADERS }
      );
    }

    const body = await req.json();
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? body
        : { raw: body };

    const ref = await adminDb.collection("leads").add({
      ...payload,
      createdAt: Date.now(),
    });

    await enqueueLeadNotification(ref.id);

    return NextResponse.json(
      { ok: true, id: ref.id },
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (error) {
    console.error("[leads] Failed to create lead", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create lead" },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
