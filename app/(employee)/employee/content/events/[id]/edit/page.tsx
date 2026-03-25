import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/actions/backoffice/eventsActions";
import EventForm from "@/components/admin/backoffice/events/EventForm";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { hasPermission, requirePermission } from "@/lib/authz";
import { isEventStatus } from "@/sanity/helpers/eventStatus";
import { saveEvent } from "@/app/(admin)/admin/content/events/actions";

export const metadata: Metadata = {
  title: "Edit Event | Content Management",
  description: "Edit event details",
};

export const dynamic = "force-dynamic";

type EventEditPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const EventEditPage = async ({ params }: EventEditPageProps) => {
  let canPublish = false;
  try {
    const ctx = await requirePermission("content.events.write");
    canPublish = hasPermission(ctx, "content.events.publish");
  } catch {
    redirect("/employee");
  }

  const resolvedParams = await params;
  const eventId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  if (!eventId) {
    redirect("/employee/content/events");
  }

  const result = await getEventById(eventId);

  if (!result.success) {
    return (
      <div className="p-6">
        <InlineErrorMessage
          message={result.message}
          fallbackKey="admin.content.events.errors.loadEvent"
        />
      </div>
    );
  }

  const event = result.data;

  if (!event) {
    return notFound();
  }

  return (
    <div className="p-6">
      <EventForm
        initialValues={{
          _id: event._id,
          title: event.title ?? "",
          slug: event.slug?.current ?? "",
          description: event.description ?? "",
          date: event.date ?? "",
          location: event.location ?? "",
          registrationOpen: event.registrationOpen ?? true,
          maxAttendees: event.maxAttendees,
          registrationDeadline: event.registrationDeadline ?? "",
          earlyBirdDeadline: event.earlyBirdDeadline ?? "",
          teamRegistrationEnabled: event.teamRegistrationEnabled ?? true,
          minTeamSize: event.minTeamSize,
          maxTeamSize: event.maxTeamSize,
          eventType: event.eventType ?? "",
          targetAudience: event.targetAudience ?? [],
          registrationFee: event.registrationFee,
          currency: event.currency ?? "THB",
          status: isEventStatus(event.status) ? event.status : "upcoming",
          statusOverride: isEventStatus(event.statusOverride) ? event.statusOverride : "",
          publishStatus: (event.publishStatus as "draft" | "review" | "published" | "archived") ?? "published",
          agenda: event.agenda ?? [],
          speakers: event.speakers ?? [],
          resources: event.resources ?? [],
          publishAsBanner: event.publishAsBanner ?? false,
          bannerSettings:
            event.bannerSettings && event.bannerSettings.bannerPlacement
              ? {
                  ...event.bannerSettings,
                  bannerPlacement: event.bannerSettings.bannerPlacement,
                  heroVariant:
                    event.bannerSettings.heroVariant === "dark" ? "dark" : "light",
                }
              : { bannerPlacement: "eventspagehero" },
        }}
        onSubmit={saveEvent}
        basePath="/employee/content/events"
        canPublish={canPublish}
      />
    </div>
  );
};

export default EventEditPage;
