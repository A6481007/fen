import { CalendarDays } from "lucide-react";
import { defineArrayMember, defineField, defineType } from "sanity";

type EventStatus = "upcoming" | "ongoing" | "ended";

type EventDocument = {
  status?: EventStatus;
  statusOverride?: EventStatus;
  date?: string;
  resources?: { status?: string }[];
};

const computeStatus = (document: EventDocument): EventStatus => {
  const override = document?.statusOverride;
  if (override) {
    return override;
  }

  const eventDateValue = document?.date;
  if (!eventDateValue) {
    return "upcoming";
  }

  const eventDate = new Date(eventDateValue);
  if (Number.isNaN(eventDate.getTime())) {
    return "upcoming";
  }

  const nowIso = new Date().toISOString();
  const eventIso = eventDate.toISOString();

  if (eventIso > nowIso) {
    return "upcoming";
  }

  const sameDay = eventIso.slice(0, 10) === nowIso.slice(0, 10);
  if (sameDay) {
    return "ongoing";
  }

  return "ended";
};

export const eventType = defineType({
  name: "event",
  title: "Event",
  type: "document",
  icon: CalendarDays,
  fields: [
    defineField({
      name: "title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "location",
      type: "string",
    }),
    defineField({
      name: "image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "registrationOpen",
      title: "Registration Open",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "maxAttendees",
      title: "Maximum Attendees",
      type: "number",
      validation: (Rule) => Rule.min(1),
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
    }),
    defineField({
      name: "statusOverride",
      title: "Status Override",
      type: "string",
      description: "Manually override the computed status when needed.",
      options: {
        list: [
          { title: "Upcoming", value: "upcoming" },
          { title: "Ongoing", value: "ongoing" },
          { title: "Ended", value: "ended" },
        ],
      },
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
              name: "file",
              title: "File",
              type: "file",
              options: {
                storeOriginalFilename: true,
              },
              validation: (Rule) =>
                Rule.custom((file, context) => {
                  const parent = context.parent as { fileType?: string } | undefined;
                  const fileType = parent?.fileType;
                  if (!fileType || fileType === "link") {
                    return true;
                  }
                  const hasAsset = Boolean(
                    (file as { asset?: { _ref?: string } } | undefined)?.asset?._ref
                  );
                  if (hasAsset) {
                    return true;
                  }
                  return "File upload with an asset is required for non-link resources.";
                }),
            }),
            defineField({
              name: "fileType",
              title: "File Type",
              type: "string",
              options: {
                list: [
                  { title: "PDF", value: "PDF" },
                  { title: "Image", value: "image" },
                  { title: "Document", value: "document" },
                  { title: "Link", value: "link" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "status",
              title: "Access",
              type: "string",
              options: {
                list: [
                  { title: "Public", value: "public" },
                  { title: "Event Locked", value: "event_locked" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
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
    }),
  ],
  preview: {
    select: {
      title: "title",
      date: "date",
      statusOverride: "statusOverride",
      resources: "resources",
    },
    prepare({ title, date, statusOverride, resources }) {
      const computedStatus = computeStatus({ statusOverride, date });
      const dateLabel = date ? new Date(date).toLocaleString() : "No date";
      const hasLockedResource = Array.isArray(resources)
        ? resources.some((resource) => resource?.status === "event_locked")
        : false;

      const subtitleParts = [
        dateLabel,
        computedStatus,
        hasLockedResource ? "Locked resources" : null,
      ].filter(Boolean);

      return {
        title: title || "Untitled event",
        subtitle: subtitleParts.join(" • ") || undefined,
      };
    },
  },
});
