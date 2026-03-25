import { getEventById } from "@/actions/backoffice/eventsActions";
import EventForm from "@/components/admin/backoffice/events/EventForm";
import { isEventStatus } from "@/sanity/helpers/eventStatus";
import Link from "next/link";
import { saveEvent } from "../actions";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { getBackofficeContext, hasPermission } from "@/lib/authz";
import type { BannerAnnounceState } from "@/components/admin/backoffice/banners/types";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const EventDetailPage = async ({ params }: EventDetailPageProps) => {
  const resolvedParams = await params;
  const eventId = typeof resolvedParams?.id === "string" ? resolvedParams.id.trim() : "";
  if (!eventId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Event id is missing.{" "}
          <Link href="/admin/content/events" className="underline">
            Back to list
          </Link>
        </div>
      </div>
    );
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
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Event not found.{" "}
          <Link href="/admin/content/events" className="underline">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const bannerSettings: BannerAnnounceState["bannerSettings"] | undefined =
    event.bannerSettings && typeof event.bannerSettings.bannerPlacement === "string"
      ? {
          ...event.bannerSettings,
          bannerPlacement: event.bannerSettings.bannerPlacement,
          heroVariant: event.bannerSettings.heroVariant === "dark" ? "dark" : "light",
        }
      : undefined;

  const ctx = await getBackofficeContext();
  const canPublish = hasPermission(ctx, "content.events.publish");

  return (
    <div className="p-6">
      <EventForm
        initialValues={{
          _id: event._id,
          title: event.title ?? "",
          slug: event.slug?.current ?? "",
          locale: event.locale?.code ?? "en",
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
          bannerSettings,
        }}
        onSubmit={saveEvent}
        canPublish={canPublish}
      />
    </div>
  );
};

export default EventDetailPage;
