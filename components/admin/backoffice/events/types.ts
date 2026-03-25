import type {
  EventAgendaItemInput,
  EventPublishStatus,
  EventResourceInput,
  EventSpeakerInput,
} from "@/lib/events/types";
import type { BannerAnnounceState } from "@/components/admin/backoffice/banners/types";
import type { EventStatus } from "@/sanity/helpers/eventStatus";

export type EventFormState = {
  _id?: string;
  title: string;
  slug: string;
  locale: string;
  description?: string;
  date: string;
  location?: string;
  registrationOpen: boolean;
  maxAttendees?: number;
  registrationDeadline?: string;
  earlyBirdDeadline?: string;
  teamRegistrationEnabled: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  eventType?: string;
  targetAudience: string[];
  registrationFee?: number;
  currency?: string;
  status: EventStatus;
  statusOverride?: EventStatus | "";
  publishStatus: EventPublishStatus;
  agenda: EventAgendaItemInput[];
  speakers: EventSpeakerInput[];
  resources: EventResourceInput[];
  publishAsBanner?: boolean;
  bannerSettings?: BannerAnnounceState["bannerSettings"];
};
