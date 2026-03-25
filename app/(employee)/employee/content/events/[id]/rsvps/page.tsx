import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import { getEventById } from "@/actions/backoffice/eventsActions";
import EventRsvpsClient from "@/app/(admin)/admin/content/events/[id]/rsvps/client";
import { fetchEventRsvps } from "@/app/(admin)/admin/content/events/actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

export const dynamic = "force-dynamic";

type EventRsvpsPageProps = {
  params: { id: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

const EventRsvpsPage = async ({ params, searchParams }: EventRsvpsPageProps) => {
  try {
    await requirePermission("content.events.rsvps.manage");
  } catch {
    redirect("/employee");
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  const statusParam = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const searchParam = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const registrationTypeParam =
    typeof resolvedSearchParams.registrationType === "string" ? resolvedSearchParams.registrationType : "";
  const priorityParam = typeof resolvedSearchParams.priority === "string" ? resolvedSearchParams.priority : "";

  const eventResult = await getEventById(params.id);

  if (!eventResult.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={eventResult.message}
          fallbackKey="admin.content.events.errors.loadEvent"
        />
      </div>
    );
  }

  const event = eventResult.data;

  if (!event) {
    return notFound();
  }

  const initialRsvps = await fetchEventRsvps(params.id, {
    page: 1,
    pageSize: 20,
    status: statusParam || undefined,
    search: searchParam || undefined,
    registrationType: registrationTypeParam || undefined,
    priority: priorityParam || undefined,
  });

  return (
    <EventRsvpsClient
      eventId={params.id}
      eventTitle={event.title ?? ""}
      eventSlug={event.slug?.current ?? ""}
      eventDate={event.date ?? ""}
      eventStatus={event.computedStatus ?? event.status}
      attendeeCount={event.attendeeCount ?? 0}
      initialData={initialRsvps}
      initialStatus={statusParam}
      initialSearch={searchParam}
      initialRegistrationType={registrationTypeParam}
      initialPriority={priorityParam}
      basePath="/employee/content/events"
    />
  );
};

export default EventRsvpsPage;
