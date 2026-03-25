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
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "event" }],
      description: "Reference to the event this RSVP is for",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "eventSlug",
      title: "Event Slug / Reference",
      type: "string",
      description: "Slug or human-friendly event identifier supplied by the attendee.",
    }),
    defineField({
      name: "organization",
      title: "Organization",
      type: "string",
      description: "Company or organization name provided by the attendee",
      validation: (Rule) => Rule.required().min(2).max(200),
    }),
    defineField({
      name: "jobTitle",
      title: "Job Title",
      type: "string",
      validation: (Rule) => Rule.max(120),
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
        layout: "radio",
      },
      initialValue: "individual",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "teamId",
      title: "Team ID",
      type: "string",
      description: "Shared identifier linking team members (UUID format)",
      validation: (Rule) =>
        Rule.custom((teamId, context) => {
          const registrationType = context.document?.registrationType;
          const requiresTeam =
            registrationType === "team_lead" || registrationType === "team_member";

          if (!requiresTeam && !teamId) return true;
          if (requiresTeam && !teamId) {
            return "Team registrations must include a team ID";
          }

          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(teamId) ? true : "Team ID must be a valid UUID";
        }),
    }),
    defineField({
      name: "teamLeadEmail",
      title: "Team Lead Email",
      type: "string",
      description: "For team members, provide the team lead's email address",
      validation: (Rule) =>
        Rule.email().custom((email, context) => {
          const registrationType = context.document?.registrationType;
          if (registrationType === "team_member" && !email) {
            return "Team members must include the team lead's email";
          }
          return true;
        }),
    }),
    defineField({
      name: "teamMembers",
      title: "Team Members",
      type: "array",
      description: "For team leads, list team members included in this registration",
      of: [
        defineField({
          name: "teamMember",
          title: "Team Member",
          type: "object",
          fields: [
            defineField({
              name: "name",
              title: "Name",
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
              name: "jobTitle",
              title: "Job Title",
              type: "string",
              validation: (Rule) => Rule.max(120),
            }),
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.custom((teamMembers, context) => {
          const registrationType = context.document?.registrationType;

          if (registrationType === "team_lead" && (!teamMembers || teamMembers.length === 0)) {
            return "Team leads must provide at least one team member";
          }

          if (registrationType !== "team_lead" && teamMembers?.length) {
            return "Only team leads can add team members";
          }

          return true;
        }).max(20),
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
      name: "dietaryRequirements",
      title: "Dietary Requirements",
      type: "string",
      validation: (Rule) => Rule.max(500),
    }),
    defineField({
      name: "accessibilityNeeds",
      title: "Accessibility Needs",
      type: "string",
      validation: (Rule) => Rule.max(500),
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
          { title: "Waitlisted", value: "waitlisted" },
          { title: "Confirmed", value: "confirmed" },
          { title: "Checked In", value: "checked_in" },
          { title: "Contacted", value: "contacted" },
          { title: "Cancelled", value: "cancelled" },
          { title: "Archived", value: "archived" },
        ],
      },
      initialValue: "new",
      validation: (Rule) => Rule.required(),
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
      name: "confirmedAt",
      title: "Confirmed At",
      type: "datetime",
      description: "Timestamp when the attendee confirmed their registration",
    }),
    defineField({
      name: "reminder24hSentAt",
      title: "24h Reminder Sent At",
      type: "datetime",
      description: "Timestamp when the 24-hour reminder email was sent",
      readOnly: true,
    }),
    defineField({
      name: "reminder7dSentAt",
      title: "7-day Reminder Sent At",
      type: "datetime",
      description: "Timestamp when the 7-day reminder email was sent",
      readOnly: true,
    }),
    defineField({
      name: "reminder1hSentAt",
      title: "1h Reminder Sent At",
      type: "datetime",
      description: "Timestamp when the 1-hour reminder email was sent",
      readOnly: true,
    }),
    defineField({
      name: "checkedInAt",
      title: "Checked In At",
      type: "datetime",
      description: "Timestamp when the attendee was checked in",
    }),
    defineField({
      name: "cancellationReason",
      title: "Cancellation Reason",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.max(1000),
    }),
    defineField({
      name: "cancelledAt",
      title: "Cancelled At",
      type: "datetime",
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
      organization: "organization",
      registrationType: "registrationType",
      submittedAt: "submittedAt",
    },
    prepare({ title, subtitle, email, organization, registrationType, submittedAt }) {
      const date = submittedAt
        ? new Date(submittedAt).toLocaleDateString()
        : "Unknown date";
      const orgDisplay = organization || "No organization";
      const registrationLabel = registrationType
        ? registrationType
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "Individual";
      const emailDisplay = email || "No email";

      return {
        title: `${title || "Unnamed"} — ${orgDisplay}`,
        subtitle: `${registrationLabel} • ${emailDisplay} • ${subtitle || "Event"} • ${date}`,
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
