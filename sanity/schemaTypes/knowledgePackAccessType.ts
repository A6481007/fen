import { DownloadIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const knowledgePackAccessType = defineType({
  name: "knowledgePackAccess",
  title: "Knowledge Pack Access",
  type: "document",
  icon: DownloadIcon,
  fields: [
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
    }),
    defineField({
      name: "company",
      title: "Company",
      type: "string",
    }),
    defineField({
      name: "packSlug",
      title: "Pack slug / insight slug",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "packTitle",
      title: "Pack title",
      type: "string",
    }),
    defineField({
      name: "insightId",
      title: "Insight ID",
      type: "string",
    }),
    defineField({
      name: "downloadUrl",
      title: "Primary download URL",
      type: "url",
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Submitted", value: "submitted" },
          { title: "Unlocked", value: "unlocked" },
          { title: "Emailed", value: "emailed" },
        ],
      },
      initialValue: "submitted",
    }),
    defineField({
      name: "step",
      title: "Step",
      type: "string",
      description: "Which step the user completed (email or profile enrichment).",
      options: {
        list: [
          { title: "Email", value: "email" },
          { title: "Profile", value: "profile" },
          { title: "Download", value: "download" },
        ],
      },
    }),
    defineField({
      name: "source",
      title: "Source",
      type: "string",
      description: "Surface that captured the lead (knowledge pack page, inline card, etc.).",
    }),
    defineField({
      name: "clerkUserId",
      title: "Clerk user ID",
      type: "string",
    }),
    defineField({
      name: "createdAt",
      title: "Captured at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
    defineField({
      name: "ipAddress",
      title: "IP address",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "userAgent",
      title: "User agent",
      type: "text",
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: "email",
      subtitle: "packTitle",
      status: "status",
    },
    prepare({ title, subtitle, status }) {
      const statusLabel = status ? status.toUpperCase() : "SUBMITTED";
      return {
        title: `${title} • ${statusLabel}`,
        subtitle: subtitle || "Knowledge pack access",
      };
    },
  },
  orderings: [
    {
      title: "Newest",
      name: "newestFirst",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Oldest",
      name: "oldestFirst",
      by: [{ field: "createdAt", direction: "asc" }],
    },
  ],
});
