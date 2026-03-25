import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { fetchEventsTable } from "./actions";
import EventsPageClient from "./client";

const METADATA_BY_LOCALE = {
  en: {
    title: "Events",
    description: "Manage events and RSVPs.",
  },
  th: {
    title: "อีเวนต์",
    description: "จัดการอีเวนต์และการลงทะเบียน",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type EventsPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

const EventsPage = async ({ searchParams }: EventsPageProps) => {
  const resolvedSearchParams = await searchParams;

  const search = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : "";
  const status = typeof resolvedSearchParams?.status === "string" ? resolvedSearchParams.status : "";
  const eventType = typeof resolvedSearchParams?.eventType === "string" ? resolvedSearchParams.eventType : "";
  const page =
    typeof resolvedSearchParams?.page === "string" && Number.isFinite(Number(resolvedSearchParams.page))
      ? Number(resolvedSearchParams.page)
      : 1;

  const initialData = await fetchEventsTable({
    page,
    search: search || undefined,
    status: status || undefined,
    eventType: eventType || undefined,
  });

  return (
    <EventsPageClient
      initialData={initialData}
      initialSearch={search}
      initialStatus={status}
      initialEventType={eventType}
    />
  );
};

export default EventsPage;
