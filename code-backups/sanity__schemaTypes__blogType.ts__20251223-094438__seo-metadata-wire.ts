import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

// Deprecated legacy blog doc; retained for existing news/blog routes until new IA migrates—fields stay unchanged.

export const blogType = defineType({
  name: "blog",
  title: "Blog",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "title",
      },
    }),
    defineField({
      name: "author",
      type: "reference",
      to: { type: "author" },
    }),
    defineField({
      name: "mainImage",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "blogcategories",
      type: "array",
      of: [
        defineArrayMember({ type: "reference", to: { type: "blogcategory" } }),
      ],
    }),
    defineField({
      name: "publishedAt",
      type: "datetime",
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "Short description shown on cards and previews.",
    }),
    defineField({
      name: "contentType",
      title: "Content Type",
      description:
        "Classify this entry as a regular article, event, or resource.",
      type: "string",
      initialValue: "article",
      options: {
        list: [
          { title: "Article", value: "article" },
          { title: "Event", value: "event" },
          { title: "Resource", value: "resource" },
          { title: "Legacy Blog", value: "blog" },
          { title: "Legacy News", value: "news" },
          { title: "Legacy Download", value: "download" },
        ],
      },
    }),
    defineField({
      name: "isEvent",
      title: "Is Event?",
      description: "Convenience flag to treat this blog entry as an event.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isResource",
      title: "Is Resource?",
      description: "Convenience flag to treat this blog entry as a resource.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "eventDetails",
      title: "Event Details",
      description: "Optional structured metadata for event-type content.",
      type: "object",
      fields: [
        defineField({
          name: "date",
          title: "Event Date & Time",
          type: "datetime",
        }),
        defineField({
          name: "location",
          title: "Location",
          type: "string",
        }),
        defineField({
          name: "rsvpLimit",
          title: "RSVP Limit",
          type: "number",
        }),
      ],
      hidden: ({ parent }) =>
        parent?.contentType !== "event" && parent?.isEvent !== true,
    }),
    defineField({
      name: "resourceTopics",
      title: "Resource Topics",
      description: "Keywords or topics covered by this resource.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      hidden: ({ parent }) =>
        parent?.contentType !== "resource" && parent?.isResource !== true,
    }),
    defineField({
      name: "eventStartDate",
      title: "Event Start Date",
      type: "datetime",
      hidden: ({ parent }) =>
        parent?.contentType !== "event" && parent?.isEvent !== true,
    }),
    defineField({
      name: "eventEndDate",
      title: "Event End Date",
      type: "datetime",
      hidden: ({ parent }) =>
        parent?.contentType !== "event" && parent?.isEvent !== true,
    }),
    defineField({
      name: "eventLocation",
      title: "Event Location",
      type: "string",
      hidden: ({ parent }) =>
        parent?.contentType !== "event" && parent?.isEvent !== true,
    }),
    defineField({
      name: "eventRsvpUrl",
      title: "RSVP / Registration URL",
      type: "url",
      hidden: ({ parent }) =>
        parent?.contentType !== "event" && parent?.isEvent !== true,
    }),
    defineField({
      name: "downloadLabel",
      title: "Download Button Label",
      type: "string",
      hidden: ({ parent }) => parent?.contentType !== "download",
    }),
    defineField({
      name: "downloadUrl",
      title: "Download URL",
      type: "url",
      hidden: ({ parent }) => parent?.contentType !== "download",
    }),
    defineField({
      name: "downloadAsset",
      title: "Download Asset",
      type: "file",
      options: {
        storeOriginalFilename: true,
      },
      hidden: ({ parent }) => parent?.contentType !== "download",
    }),
    defineField({
      name: "resourceCategory",
      title: "Resource Category",
      type: "string",
      hidden: ({ parent }) =>
        parent?.contentType !== "resource" && parent?.isResource !== true,
    }),
    defineField({
      name: "resourceLink",
      title: "Resource Link",
      type: "url",
      hidden: ({ parent }) =>
        parent?.contentType !== "resource" && parent?.isResource !== true,
    }),
    defineField({
      name: "isLatest",
      title: "Latest Blog",
      type: "boolean",
      description: "Toggle to Latest on or off",
      initialValue: true,
    }),
    defineField({
      name: "body",
      type: "blockContent",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
      isLatest: "isLatest",
      contentType: "contentType",
    },
    prepare(selection) {
      const { author, isLatest, contentType } = selection;
      const badges: string[] = [];
      if (isLatest) {
        badges.push("Latest");
      }
      if (contentType) {
        badges.push(
          contentType.charAt(0).toUpperCase() + contentType.slice(1)
        );
      }
      const badgeText = badges.join(" • ");
      return {
        ...selection,
        subtitle: author
          ? `${badgeText ? `${badgeText} | ` : ""}By ${author}`
          : badgeText || undefined,
      };
    },
  },
});
