import { CalendarDays } from "lucide-react";
import { defineField, defineType } from "sanity";

export const eventRsvpType = defineType({
  name: "eventRsvp",
  title: "Event RSVPs",
  type: "document",
  icon: CalendarDays,
  fields: [
    defineField({
      name: "name",
      title: "Attendee Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2).max(120),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "eventId",
      title: "Event ID",
      type: "string",
      description: "Internal Sanity document ID for the event (if applicable).",
    }),
    defineField({
      name: "eventSlug",
      title: "Event Slug / Reference",
      type: "string",
      description: "Slug or human-friendly event identifier supplied by the attendee.",
    }),
    defineField({
      name: "guestsCount",
      title: "Guests Count",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1).max(10),
    }),
    defineField({
      name: "message",
      title: "Notes",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "newsletterOptIn",
      title: "Opted into Newsletter",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "New", value: "new" },
          { title: "Confirmed", value: "confirmed" },
          { title: "Contacted", value: "contacted" },
          { title: "Archived", value: "archived" },
        ],
      },
      initialValue: "new",
    }),
    defineField({
      name: "priority",
      title: "Priority",
      type: "string",
      options: {
        list: [
          { title: "Normal", value: "normal" },
          { title: "High", value: "high" },
        ],
      },
      initialValue: "normal",
    }),
    defineField({
      name: "submittedAt",
      title: "Submitted At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
    defineField({
      name: "ipAddress",
      title: "IP Address",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "userAgent",
      title: "User Agent",
      type: "text",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "eventSlug",
      email: "email",
      submittedAt: "submittedAt",
    },
    prepare({ title, subtitle, email, submittedAt }) {
      const date = submittedAt
        ? new Date(submittedAt).toLocaleDateString()
        : "Unknown date";
      return {
        title: `${title || "Unnamed"} - ${subtitle || "Event"}`,
        subtitle: `${email} • ${date}`,
      };
    },
  },
  orderings: [
    {
      title: "Newest",
      name: "submittedDesc",
      by: [{ field: "submittedAt", direction: "desc" }],
    },
    {
      title: "Oldest",
      name: "submittedAsc",
      by: [{ field: "submittedAt", direction: "asc" }],
    },
  ],
});
