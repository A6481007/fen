import { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hasPermission, requirePermission } from "@/lib/authz";
import EventsPageClient from "@/app/(admin)/admin/content/events/client";
import { fetchEventsTable } from "@/app/(admin)/admin/content/events/actions";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Events | Content Management",
    description: "Manage events and registrations",
  },
  th: {
    title: "กิจกรรม | จัดการเนื้อหา",
    description: "จัดการกิจกรรมและการลงทะเบียน",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type EmployeeEventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const searchParamsSchema = z.object({
  page: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (Array.isArray(value) ? value[0] : value))
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    }),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (Array.isArray(value) ? value[0] : value ?? "")),
  publishStatus: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (Array.isArray(value) ? value[0] : value ?? "")),
  eventType: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (Array.isArray(value) ? value[0] : value ?? "")),
  search: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (Array.isArray(value) ? value[0] : value ?? "")),
});

export default async function EventsListPage({ searchParams }: EmployeeEventsPageProps) {
  let canPublish = false;
  try {
    const ctx = await requirePermission("content.events.read");
    canPublish = hasPermission(ctx, "content.events.publish");
  } catch {
    redirect("/employee");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const parsed = searchParamsSchema.safeParse(resolvedSearchParams ?? {});
  const params: z.infer<typeof searchParamsSchema> = parsed.success
    ? parsed.data
    : { page: undefined, status: "", publishStatus: "", eventType: "", search: "" };

  const pageParam = params.page ?? 1;
  const statusParam = typeof params.status === "string" ? params.status : "";
  const publishStatusParam = typeof params.publishStatus === "string" ? params.publishStatus : "";
  const eventTypeParam = typeof params.eventType === "string" ? params.eventType : "";
  const searchParam = typeof params.search === "string" ? params.search : "";

  const initialData = await fetchEventsTable({
    page: pageParam,
    pageSize: 10,
    status: statusParam || undefined,
    publishStatus: publishStatusParam || undefined,
    eventType: eventTypeParam || undefined,
    search: searchParam || undefined,
  });

  return (
    <EventsPageClient
      initialData={initialData}
      initialStatus={statusParam}
      initialPublishStatus={publishStatusParam}
      initialEventType={eventTypeParam}
      initialSearch={searchParam}
      basePath="/employee/content/events"
      canPublish={canPublish}
    />
  );
}
