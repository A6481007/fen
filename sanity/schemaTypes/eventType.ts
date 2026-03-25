import { CalendarDays } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";
import { computeEventStatus, type EventStatus } from "../helpers/eventStatus";
import { createTaxonomyFields } from "./helpers/taxonomy";
import { buildBannerFields } from "./helpers/bannerSettings";

type EventPreviewSelection = {
  title?: string;
  date?: string;
  endDate?: string;
  status?: EventStatus | null;
  statusOverride?: EventStatus | null;
  publishStatus?: string | null;
  eventType?: string | null;
  registrationDeadline?: string | null;
  earlyBirdDeadline?: string | null;
  maxAttendees?: number | null;
  registrationOpen?: boolean | null;
  attendees?: unknown[] | null;
  resources?: { status?: string }[] | null;
  mode?: string | null;
};

const resourceFileTypes = [
  { title: "PDF", value: "pdf" },
  { title: "Image", value: "image" },
  { title: "Document", value: "document" },
  { title: "Link", value: "link" },
  { title: "Offline / In-person", value: "offline" },
  { title: "PDF (legacy)", value: "PDF" },
];

const normalizeMode = (mode?: string | null) => {
  const normalized = (mode || "").toLowerCase();
  if (normalized === "online" || normalized === "hybrid" || normalized === "offline") {
    return normalized;
  }
  return "offline";
};

const validateRegistrationWindow = (
  value: string | undefined,
  context: { document?: { date?: string; endDate?: string; registrationDeadline?: string; earlyBirdDeadline?: string } }
) => {
  const eventStart = context.document?.date ? new Date(context.document.date) : null;
  const eventEnd = context.document?.endDate ? new Date(context.document.endDate) : eventStart;
  const registrationDeadline = context.document?.registrationDeadline
    ? new Date(context.document.registrationDeadline)
    : null;

  if (value) {
    const dateValue = new Date(value);
    if (context.document?.registrationDeadline && registrationDeadline && dateValue > registrationDeadline) {
      return "Early bird deadline must be on or before the registration deadline.";
    }
    if (!context.document?.registrationDeadline && eventStart && dateValue > eventStart) {
      return "Early bird deadline must be on or before the event start.";
    }
  }

  if (context.document?.registrationDeadline && registrationDeadline && eventEnd) {
    if (registrationDeadline > eventEnd) {
      return "Registration deadline must be on or before the event end.";
    }
  }

  return true;
};

const validateResource = (resource: Record<string, unknown>) => {
  const fileTypeRaw = (resource?.fileType as string | undefined) || "";
  const fileType = fileTypeRaw.toLowerCase();
  const file = resource?.file as { asset?: { _ref?: string } } | undefined;
  const linkUrl =
    (resource?.linkUrl as string | undefined) || (resource?.url as string | undefined);
  const offlineInstructions = (resource?.offlineInstructions as string | undefined) || "";

  if (!fileType) return "Choose a file type.";
  if (fileType === "link" && !linkUrl) return "Link URL required.";
  if (fileType === "offline" && !offlineInstructions.trim()) return "Add offline instructions.";
  if (!["link", "offline"].includes(fileType) && !file?.asset?._ref) {
    return "Upload a file for this resource.";
  }
  return true;
};

export const eventType = defineType({
  name: "event",
  title: "Event",
  type: "document",
  icon: CalendarDays,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "registration", title: "Registration" },
    { name: "program", title: "Agenda & Speakers" },
    { name: "recording", title: "Recording" },
    { name: "resources", title: "Resources" },
    { name: "seo", title: "SEO" },
    { name: "publishing", title: "Publishing" },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "titleTh",
      title: "Title (TH)",
      type: "string",
      description: "Optional Thai headline. If left blank, English will be shown.",
      group: "content",
    }),
    defineField({
      name: "locale",
      title: "Locale",
      type: "reference",
      to: [{ type: "locale" }],
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
        slugify: (input: string) =>
          input
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 96),
      },
      validation: (Rule) =>
        Rule.required().custom((value) => {
          const slug = (value as { current?: string } | undefined)?.current?.trim();
          if (!slug) return "Slug is required.";
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            return "Use lowercase letters and numbers with hyphens (no spaces or uppercase).";
          }
          return true;
        }),
      group: "publishing",
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 3,
      group: "content",
      description: "One-line summary for cards and previews (max 180 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(180)
          .warning("Keep summaries to a single, scannable line."),
    }),
    defineField({
      name: "descriptionTh",
      title: "Description (TH)",
      type: "text",
      rows: 3,
      group: "content",
      description: "Optional Thai summary. If left blank, English will be shown.",
      validation: (Rule) => Rule.max(180),
    }),
    ...createTaxonomyFields({
      group: "content",
      defaults: {
        contentType: "event",
        format: "event",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "mode",
      title: "Mode",
      type: "string",
      initialValue: "offline",
      options: {
        list: [
          { title: "Offline / In-person", value: "offline" },
          { title: "Online", value: "online" },
          { title: "Hybrid", value: "hybrid" },
        ],
        layout: "radio",
      },
      description: "Online events require a join link; offline/hybrid events require a venue.",
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "date",
      title: "Start date & time",
      type: "datetime",
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "endDate",
      title: "End date & time",
      type: "datetime",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value) return true;
          const startDate = (context.document as { date?: string } | undefined)?.date;
          if (startDate && new Date(value) < new Date(startDate)) {
            return "End date must be after start date.";
          }
          return true;
        }),
      group: "content",
    }),
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      initialValue: "Asia/Bangkok",
      description: "IANA timezone name used for showing start/end times.",
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Venue name", type: "string" }),
        defineField({ name: "address", title: "Address", type: "text", rows: 2 }),
        defineField({
          name: "mapUrl",
          title: "Map URL",
          type: "url",
          description: "Google Maps or similar. Required for offline/hybrid events.",
        }),
        defineField({
          name: "geo",
          title: "Geo coordinates",
          type: "object",
          fields: [
            defineField({ name: "lat", title: "Latitude", type: "number" }),
            defineField({ name: "lng", title: "Longitude", type: "number" }),
          ],
        }),
      ],
      group: "content",
    }),
    defineField({
      name: "location",
      title: "Legacy location label",
      type: "string",
      description: "Optional freeform location kept for backwards compatibility.",
      group: "content",
    }),
    defineField({
      name: "onlineUrl",
      title: "Join / Stream URL",
      type: "url",
      description: "Required for online/hybrid events. Never expose gated assets here.",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const mode = normalizeMode((context.document as { mode?: string } | undefined)?.mode);
          if ((mode === "online" || mode === "hybrid") && !value) {
            return "Online or hybrid events need a join URL.";
          }
          return true;
        }),
      group: "content",
    }),
    defineField({
      name: "image",
      title: "Hero image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
          validation: (Rule) => Rule.required().min(4),
        }),
        defineField({
          name: "caption",
          type: "text",
          rows: 2,
        }),
        defineField({
          name: "credit",
          title: "Credit / Source",
          type: "string",
        }),
      ],
      validation: (Rule) => Rule.required(),
      group: "media",
    }),
    defineField({
      name: "eventType",
      title: "Event Type",
      type: "string",
      options: {
        list: [
          { title: "Seminar", value: "seminar" },
          { title: "Workshop", value: "workshop" },
          { title: "Webinar", value: "webinar" },
          { title: "Conference", value: "conference" },
          { title: "Training", value: "training" },
        ],
        layout: "radio",
      },
      group: "content",
    }),
    defineField({
      name: "topics",
      title: "Topics",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
          options: {
            list: [
              { title: "Product", value: "product" },
              { title: "Training", value: "training" },
              { title: "Enablement", value: "enablement" },
              { title: "Community", value: "community" },
              { title: "Operations", value: "operations" },
            ],
          },
        }),
      ],
      options: {
        layout: "tags",
      },
      description: "Subjects used for filtering (e.g., product, training, community).",
      group: "content",
    }),
    defineField({
      name: "experienceLevel",
      title: "Level",
      type: "string",
      options: {
        list: [
          { title: "All levels", value: "all" },
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
        layout: "radio",
      },
      initialValue: "all",
      description: "Expected audience expertise to power faceted filters.",
      group: "content",
    }),
    defineField({
      name: "targetAudience",
      title: "Target Audience",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
          options: {
            list: [
              { title: "Dealers", value: "dealers" },
              { title: "Distributors", value: "distributors" },
              { title: "Retailers", value: "retailers" },
              { title: "Manufacturers", value: "manufacturers" },
            ],
          },
        }),
      ],
      options: {
        layout: "tags",
      },
      group: "content",
    }),
    defineField({
      name: "publishStatus",
      title: "Publish status",
      type: "string",
      description: "Controls visibility on the public events page.",
      initialValue: "draft",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "In review", value: "review" },
          { title: "Published", value: "published" },
          { title: "Archived", value: "archived" },
        ],
      },
      group: "publishing",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Upcoming", value: "upcoming" },
          { title: "Ongoing", value: "ongoing" },
          { title: "Ended", value: "ended" },
        ],
      },
      initialValue: "upcoming",
      group: "publishing",
    }),
    defineField({
      name: "statusOverride",
      title: "Status Override",
      type: "string",
      description: "Manually override the status computed from the event dates; supersedes auto calculation.",
      options: {
        list: [
          { title: "Upcoming", value: "upcoming" },
          { title: "Ongoing", value: "ongoing" },
          { title: "Ended", value: "ended" },
        ],
      },
      group: "publishing",
    }),
    ...buildBannerFields({ initialPlacement: "eventspagehero", group: "publishing" }),
    defineField({
      name: "registrationOpen",
      title: "Registration Open",
      type: "boolean",
      initialValue: true,
      group: "registration",
    }),
    defineField({
      name: "registrationUrl",
      title: "Registration URL",
      type: "url",
      description:
        "Optional external registration or checkout link. If set, the primary CTA will point here instead of the in-product form.",
      group: "registration",
      validation: (Rule) =>
        Rule.uri({
          scheme: ["http", "https"],
          allowRelative: false,
        }).warning("Use a full https:// URL for external registration."),
    }),
    defineField({
      name: "registrationDeadline",
      title: "Registration Deadline",
      type: "datetime",
      description: "When registration closes.",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value) return true;
          const eventEnd = (context.document as { endDate?: string; date?: string } | undefined)
            ?.endDate;
          const startDate = (context.document as { date?: string } | undefined)?.date;
          const earlyBird = (context.document as { earlyBirdDeadline?: string } | undefined)
            ?.earlyBirdDeadline;

          const registrationDate = new Date(value);
          const eventEndValue = eventEnd || startDate;

          if (eventEndValue) {
            const eventDateValue = new Date(eventEndValue);
            if (registrationDate > eventDateValue) {
              return "Registration deadline must be on or before the event end.";
            }
          }

          if (earlyBird) {
            const earlyBirdDate = new Date(earlyBird);
            if (registrationDate < earlyBirdDate) {
              return "Registration deadline must be after the early bird cutoff.";
            }
          }

          return true;
        }),
      group: "registration",
    }),
    defineField({
      name: "earlyBirdDeadline",
      title: "Early Bird Deadline",
      type: "datetime",
      description: "Cutoff for early bird pricing.",
      validation: (Rule) =>
        Rule.custom((value, context) => validateRegistrationWindow(value as string | undefined, context)),
      group: "registration",
    }),
    defineField({
      name: "registrationFee",
      title: "Registration Fee",
      type: "number",
      description: "Optional registration fee amount.",
      validation: (Rule) => Rule.min(0),
      group: "registration",
    }),
    defineField({
      name: "currency",
      title: "Currency",
      type: "string",
      initialValue: "THB",
      description: "Three-letter ISO currency code (e.g., THB, USD, SGD).",
      options: {
        list: [
          { title: "THB", value: "THB" },
          { title: "USD", value: "USD" },
          { title: "SGD", value: "SGD" },
          { title: "EUR", value: "EUR" },
        ],
      },
      validation: (Rule) => Rule.required().regex(/^[A-Z]{3}$/, { name: "ISO-4217 code" }),
      group: "registration",
    }),
    defineField({
      name: "maxAttendees",
      title: "Maximum Attendees",
      type: "number",
      validation: (Rule) => Rule.min(1),
      group: "registration",
    }),
    defineField({
      name: "teamRegistrationEnabled",
      title: "Team Registration Enabled",
      type: "boolean",
      initialValue: true,
      description: "Allow bulk/team registrations.",
      group: "registration",
    }),
    defineField({
      name: "minTeamSize",
      title: "Minimum Team Size",
      type: "number",
      initialValue: 2,
      validation: (Rule) => Rule.min(1),
      group: "registration",
    }),
    defineField({
      name: "maxTeamSize",
      title: "Maximum Team Size",
      type: "number",
      initialValue: 20,
      validation: (Rule) =>
        Rule.min(1).custom((value, context) => {
          const minTeamSize = (context.document as { minTeamSize?: number } | undefined)?.minTeamSize;
          if (typeof value === "number" && typeof minTeamSize === "number" && value < minTeamSize) {
            return "Maximum team size must be greater than or equal to the minimum team size.";
          }
          return true;
        }),
      group: "registration",
    }),
    defineField({
      name: "agenda",
      title: "Agenda",
      type: "array",
      of: [
        defineArrayMember({
          name: "agendaItem",
          title: "Agenda Item",
          type: "object",
          fields: [
            defineField({
              name: "time",
              title: "Time",
              type: "string",
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "speaker",
              title: "Speaker",
              type: "string",
            }),
          ],
          preview: {
            select: {
              title: "title",
              time: "time",
              speaker: "speaker",
            },
            prepare({ title, time, speaker }) {
              const subtitleParts = [time, speaker].filter(Boolean);
              return {
                title: title || "Agenda item",
                subtitle: subtitleParts.join(" • ") || undefined,
              };
            },
          },
        }),
      ],
      group: "program",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      of: [
        defineArrayMember({
          name: "eventSpeaker",
          title: "Speaker",
          type: "object",
          fields: [
            defineField({
              name: "name",
              title: "Name",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "company",
              title: "Company",
              type: "string",
            }),
            defineField({
              name: "bio",
              title: "Bio",
              type: "text",
              rows: 3,
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: {
                hotspot: true,
              },
              fields: [
                defineField({
                  name: "alt",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
              ],
            }),
          ],
          preview: {
            select: {
              title: "name",
              subtitle: "company",
              media: "image",
            },
          },
        }),
      ],
      group: "program",
    }),
    defineField({
      name: "attendees",
      title: "Attendees",
      type: "array",
      of: [
        defineArrayMember({
          name: "attendee",
          title: "Attendee",
          type: "object",
          fields: [
            defineField({
              name: "name",
              type: "string",
            }),
            defineField({
              name: "email",
              type: "string",
            }),
            defineField({
              name: "phone",
              type: "string",
            }),
            defineField({
              name: "companyName",
              title: "Company Name",
              type: "string",
            }),
            defineField({
              name: "organization",
              title: "Organization",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "jobTitle",
              title: "Job Title",
              type: "string",
            }),
            defineField({
              name: "registrationType",
              title: "Registration Type",
              type: "string",
              options: {
                list: [
                  { title: "Individual", value: "individual" },
                  { title: "Team Lead", value: "team_lead" },
                  { title: "Team Member", value: "team_member" },
                ],
              },
              initialValue: "individual",
            }),
            defineField({
              name: "isTeamLead",
              title: "Is Team Lead",
              type: "boolean",
            }),
            defineField({
              name: "teamId",
              title: "Team ID",
              type: "string",
              description: "Links team members together.",
            }),
            defineField({
              name: "dietaryRequirements",
              title: "Dietary Requirements",
              type: "string",
            }),
            defineField({
              name: "accessibilityNeeds",
              title: "Accessibility Needs",
              type: "string",
            }),
            defineField({
              name: "notes",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "registrationDate",
              title: "Registration Date",
              type: "datetime",
              initialValue: () => new Date().toISOString(),
              readOnly: true,
            }),
            defineField({
              name: "clerkUserId",
              title: "Clerk User ID",
              type: "string",
            }),
            defineField({
              name: "userId",
              title: "Legacy User ID",
              type: "string",
            }),
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.custom((attendees, context) => {
          const document = context.document as { maxAttendees?: number } | undefined;
          const maxAttendees = document?.maxAttendees;
          if (!maxAttendees || !Array.isArray(attendees)) {
            return true;
          }
          if (attendees.length <= maxAttendees) {
            return true;
          }
          return `Attendees exceed max of ${maxAttendees}.`;
        }),
      group: "registration",
    }),
    defineField({
      name: "resources",
      title: "Resources",
      type: "array",
      of: [
        defineArrayMember({
          name: "resource",
          title: "Resource",
          type: "object",
          fields: [
            defineField({
              name: "fileType",
              title: "File Type",
              type: "string",
              options: { list: resourceFileTypes },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "linkUrl",
              title: "Link URL",
              type: "url",
              description: "Required when the resource is a link. Do not expose gated assets here.",
              hidden: ({ parent }) => (parent?.fileType as string | undefined)?.toLowerCase() !== "link",
              validation: (Rule) =>
                Rule.uri({
                  scheme: ["http", "https"],
                  allowRelative: false,
                }),
            }),
            defineField({
              name: "offlineInstructions",
              title: "Offline / Pickup Instructions",
              type: "text",
              rows: 2,
              hidden: ({ parent }) =>
                (parent?.fileType as string | undefined)?.toLowerCase() !== "offline",
            }),
            defineField({
              name: "file",
              title: "File",
              type: "file",
              options: {
                storeOriginalFilename: true,
              },
              hidden: ({ parent }) => {
                const fileType = (parent?.fileType as string | undefined)?.toLowerCase();
                return fileType === "link" || fileType === "offline";
              },
            }),
            defineField({
              name: "requiresRegistration",
              title: "Requires registration",
              type: "boolean",
              initialValue: false,
              description: "Marks the resource as visible only for registered/attending users.",
            }),
            defineField({
              name: "availableFrom",
              title: "Available from",
              type: "datetime",
            }),
            defineField({
              name: "availableTo",
              title: "Available until",
              type: "datetime",
              validation: (Rule) =>
                Rule.custom((value, context) => {
                  const from = (context.parent as { availableFrom?: string } | undefined)?.availableFrom;
                  if (value && from && new Date(value) < new Date(from)) {
                    return "Available until must be after available from.";
                  }
                  return true;
                }),
            }),
            defineField({
              name: "status",
              title: "Access",
              type: "string",
              options: {
                list: [
                  { title: "Public", value: "public" },
                  {
                    title: "Event Locked",
                    value: "event_locked",
                  },
                ],
              },
              description:
                "Public resources are visible to everyone. Event-locked resources only unlock for registered attendees.",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "Deprecated URL",
              type: "url",
              hidden: true,
              description: "Legacy field kept for backwards compatibility. Use linkUrl instead.",
            }),
      ],
      validation: (Rule) => Rule.custom((resource) => validateResource(resource as any)),
      preview: {
        select: {
          title: "title",
              fileType: "fileType",
              status: "status",
            },
            prepare({ title, fileType, status }) {
              const badgeParts = [fileType, status === "event_locked" ? "Locked" : "Public"].filter(
                Boolean
              );
              return {
                title,
                subtitle: badgeParts.join(" • ") || undefined,
              };
            },
          },
        }),
      ],
      group: "resources",
    }),
    defineField({
      name: "recording",
      title: "Recording",
      type: "object",
      group: "recording",
      fields: [
        defineField({
          name: "status",
          title: "Availability",
          type: "string",
          initialValue: "unavailable",
          options: {
            list: [
              { title: "Unavailable", value: "unavailable" },
              { title: "Processing", value: "processing" },
              { title: "Published", value: "published" },
            ],
            layout: "radio",
          },
        }),
        defineField({
          name: "title",
          title: "Recording title",
          type: "string",
          description: "Optional override for the recording title shown on the event page.",
        }),
        defineField({
          name: "videoUrl",
          title: "Video URL or embed link",
          type: "url",
          description: "YouTube, Vimeo, Mux, or a direct MP4 URL.",
        }),
        defineField({
          name: "platform",
          title: "Platform",
          type: "string",
          options: {
            list: [
              { title: "YouTube", value: "youtube" },
              { title: "Vimeo", value: "vimeo" },
              { title: "Mux", value: "mux" },
              { title: "Direct file / Other", value: "custom" },
            ],
            layout: "radio",
          },
          initialValue: "custom",
        }),
        defineField({
          name: "duration",
          title: "Duration (ISO 8601)",
          type: "string",
          description: "Example: PT45M or PT1H5M.",
          validation: (Rule) => Rule.regex(/^P(T(\d+H)?(\d+M)?(\d+S)?)?$/, { name: "ISO 8601 duration" }).warning(),
        }),
        defineField({
          name: "publishedAt",
          title: "Recording published at",
          type: "datetime",
        }),
        defineField({
          name: "downloadUrl",
          title: "Download URL",
          type: "url",
          description: "Optional downloadable copy for attendees.",
        }),
        defineField({
          name: "captionFile",
          title: "Captions (VTT/SRT)",
          type: "file",
          options: { storeOriginalFilename: true },
        }),
        defineField({
          name: "chapters",
          title: "Chapters",
          type: "array",
          of: [
            defineArrayMember({
              name: "chapter",
              title: "Chapter",
              type: "object",
              fields: [
                defineField({
                  name: "title",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "startsAt",
                  title: "Starts at (hh:mm:ss)",
                  type: "string",
                  description: "Use mm:ss or hh:mm:ss to mark the chapter start.",
                  validation: (Rule) =>
                    Rule.regex(/^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/, {
                      name: "timestamp",
                      invert: false,
                    }).warning("Use mm:ss or hh:mm:ss format."),
                }),
                defineField({
                  name: "speaker",
                  title: "Speaker",
                  type: "string",
                }),
                defineField({
                  name: "summary",
                  title: "Summary",
                  type: "text",
                  rows: 2,
                }),
              ],
              preview: {
                select: {
                  title: "title",
                  startsAt: "startsAt",
                  speaker: "speaker",
                },
                prepare({ title, startsAt, speaker }) {
                  const subtitleParts = [startsAt, speaker].filter(Boolean);
                  return {
                    title: title || "Chapter",
                    subtitle: subtitleParts.join(" • ") || undefined,
                  };
                },
              },
            }),
          ],
        }),
        defineField({
          name: "transcript",
          title: "Transcript",
          type: "blockContent",
          description: "Full transcript to surface for accessibility and SEO.",
        }),
      ],
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "seoMetadata",
      description: "Meta title, description, keywords, and social image for event detail pages.",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      date: "date",
      endDate: "endDate",
      status: "status",
      statusOverride: "statusOverride",
      publishStatus: "publishStatus",
      eventType: "eventType",
      registrationDeadline: "registrationDeadline",
      earlyBirdDeadline: "earlyBirdDeadline",
      maxAttendees: "maxAttendees",
      attendees: "attendees",
      resources: "resources",
      registrationOpen: "registrationOpen",
      mode: "mode",
    },
    prepare(selection: EventPreviewSelection) {
      const {
        title,
        date,
        endDate,
        status,
        statusOverride,
        publishStatus,
        eventType,
        registrationDeadline,
        earlyBirdDeadline,
        maxAttendees,
        attendees,
        resources,
        registrationOpen,
        mode,
      } = selection;
      const computedStatus = computeEventStatus({ date, status, statusOverride });
      const eventTypeLabel = eventType ? eventType.toUpperCase() : null;
      const dateLabel = date ? new Date(date).toLocaleString() : "No date";
      const publishLabel =
        publishStatus && publishStatus !== "published" ? `Status: ${publishStatus}` : null;
      const hasLockedResource = Array.isArray(resources)
        ? resources.some((resource) => resource?.status === "event_locked")
        : false;
      const attendeeCount = Array.isArray(attendees) ? attendees.length : 0;
      const registrationLabel = maxAttendees
        ? `Reg: ${attendeeCount}/${maxAttendees}`
        : `Reg: ${attendeeCount}`;
      const deadlineLabel = (() => {
        if (!registrationDeadline) return registrationOpen === false ? "Reg closed" : null;
        const deadlineDate = new Date(registrationDeadline);
        const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (Number.isNaN(diffDays)) {
          return null;
        }
        if (diffDays > 0) {
          return `${diffDays}d until deadline`;
        }
        if (diffDays === 0) {
          return "Deadline today";
        }
        return "Deadline passed";
      })();

      const subtitleParts = [
        eventTypeLabel,
        normalizeMode(mode),
        dateLabel,
        endDate ? `Ends ${new Date(endDate).toLocaleString()}` : null,
        publishLabel,
        computedStatus,
        registrationLabel,
        deadlineLabel,
        earlyBirdDeadline ? `EB: ${new Date(earlyBirdDeadline).toLocaleDateString()}` : null,
        hasLockedResource ? "Locked resources" : null,
      ].filter(Boolean);

      return {
        title: title || "Untitled event",
        subtitle: subtitleParts.join(" • ") || undefined,
        media: eventTypeLabel || CalendarDays,
      };
    },
  },
});
