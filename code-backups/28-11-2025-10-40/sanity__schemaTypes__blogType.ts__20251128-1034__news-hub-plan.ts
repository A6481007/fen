import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

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
      type: "string",
      initialValue: "blog",
      options: {
        layout: "radio",
        list: [
          { title: "Blog", value: "blog" },
          { title: "News", value: "news" },
          { title: "Event", value: "event" },
          { title: "Resource", value: "resource" },
          { title: "Download", value: "download" },
        ],
      },
    }),
    defineField({
      name: "eventStartDate",
      title: "Event Start Date",
      type: "datetime",
      hidden: ({ parent }) => parent?.contentType !== "event",
    }),
    defineField({
      name: "eventEndDate",
      title: "Event End Date",
      type: "datetime",
      hidden: ({ parent }) => parent?.contentType !== "event",
    }),
    defineField({
      name: "eventLocation",
      title: "Event Location",
      type: "string",
      hidden: ({ parent }) => parent?.contentType !== "event",
    }),
    defineField({
      name: "eventRsvpUrl",
      title: "RSVP / Registration URL",
      type: "url",
      hidden: ({ parent }) => parent?.contentType !== "event",
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
      hidden: ({ parent }) => parent?.contentType !== "resource",
    }),
    defineField({
      name: "resourceLink",
      title: "Resource Link",
      type: "url",
      hidden: ({ parent }) => parent?.contentType !== "resource",
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
    },
    prepare(selection) {
      const { author, isLatest } = selection;
      return {
        ...selection,
        subtitle: author && `${isLatest ? "Latest | " : ""} By ${author}`,
      };
    },
  },
});
