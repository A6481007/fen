import { NextResponse } from "next/server";

import { runAggregateAnalytics } from "@/scripts/aggregateAnalytics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await runAggregateAnalytics();
    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    console.error("[analytics] Cron aggregation failed", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
