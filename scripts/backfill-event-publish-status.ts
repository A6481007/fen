import { writeClient } from "../sanity/lib/client.ts";

type LegacyEvent = {
  _id: string;
  title?: string | null;
};

const EVENTS_MISSING_PUBLISH_STATUS_QUERY = `*[_type == "event" && !defined(publishStatus)]{
  _id,
  title
}`;

const parseArgs = () => ({
  dryRun: process.argv.includes("--dry-run") || process.argv.includes("--dryRun"),
  forcePublished:
    process.argv.includes("--force-published") || process.argv.includes("--all-published"),
});

const resolvePublishStatus = (id: string, forcePublished: boolean) => {
  if (forcePublished) return "published";
  return id.startsWith("drafts.") ? "draft" : "published";
};

async function backfillEventPublishStatus(dryRun = false, forcePublished = false) {
  console.log(
    `Starting event publishStatus backfill${dryRun ? " (dry run)" : ""}...`,
  );

  const events = await writeClient.fetch<LegacyEvent[]>(
    EVENTS_MISSING_PUBLISH_STATUS_QUERY,
  );

  if (!events || events.length === 0) {
    console.log("No events found without publishStatus.");
    return;
  }

  let updatedCount = 0;
  let failedCount = 0;

  for (const event of events) {
    const publishStatus = resolvePublishStatus(event._id, forcePublished);
    const label = event.title?.trim() || event._id;

    if (dryRun) {
      updatedCount += 1;
      console.log(`[dry-run] Would set ${label} -> ${publishStatus}`);
      continue;
    }

    try {
      await writeClient.patch(event._id).set({ publishStatus }).commit();
      updatedCount += 1;
      console.log(`Set ${label} -> ${publishStatus}`);
    } catch (error) {
      failedCount += 1;
      console.error(`Failed to update ${label}:`, error);
    }
  }

  console.log(
    `Backfill complete. Updated ${updatedCount} event(s).${dryRun ? " (dry run)" : ""}`,
  );
  if (failedCount > 0) {
    console.log(`Failed to update ${failedCount} event(s).`);
  }
}

const { dryRun, forcePublished } = parseArgs();

await backfillEventPublishStatus(dryRun, forcePublished).catch((error) => {
  console.error("Event publishStatus backfill failed:", error);
  process.exitCode = 1;
});
