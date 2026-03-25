import { notFound } from "next/navigation";
import { getEventById } from "@/actions/backoffice/eventsActions";
import EventRsvpsClient from "./client";
import { fetchEventRsvps } from "../../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

type EventRsvpsPageProps = {
  params: { id: string } | Promise<{ id: string }>;
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

const EventRsvpsPage = async ({ params, searchParams }: EventRsvpsPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const statusParam = typeof resolvedSearchParams?.status === "string" ? resolvedSearchParams.status : "";
  const searchParam = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : "";
  const registrationTypeParam =
    typeof resolvedSearchParams?.registrationType === "string"
      ? resolvedSearchParams.registrationType
      : "";
  const priorityParam =
    typeof resolvedSearchParams?.priority === "string" ? resolvedSearchParams.priority : "";

  const eventResult = await getEventById(resolvedParams.id);

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

  const initialRsvps = await fetchEventRsvps(resolvedParams.id, {
    page: 1,
    pageSize: 20,
    status: statusParam || undefined,
    search: searchParam || undefined,
    registrationType: registrationTypeParam || undefined,
    priority: priorityParam || undefined,
  });

  return (
    <EventRsvpsClient
      eventId={resolvedParams.id}
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
    />
  );
};

export default EventRsvpsPage;
