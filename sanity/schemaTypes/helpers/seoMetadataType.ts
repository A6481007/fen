import { defineField, defineType } from "sanity";

export const seoMetadataType = defineType({
  name: "seoMetadata",
  title: "SEO Metadata",
  type: "object",
  fields: [
    defineField({
      name: "metaTitle",
      title: "Meta Title",
      type: "string",
      description: "Page title for search engines (50-60 chars)",
      validation: (Rule) =>
        Rule.max(70).warning("Titles over 60 characters may be truncated"),
    }),
    defineField({
      name: "metaDescription",
      title: "Meta Description",
      type: "text",
      rows: 3,
      description: "Page description for search engines (150-160 chars)",
      validation: (Rule) =>
        Rule.max(200).warning("Descriptions over 160 characters may be truncated"),
    }),
    defineField({
      name: "keywords",
      title: "Keywords (language-independent)",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "These keywords are shared across all locales and used in meta tags globally.",
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL",
      type: "url",
      description: "Specify if this content has a primary URL elsewhere",
    }),
    defineField({
      name: "noIndex",
      title: "Hide from Search Engines",
      type: "boolean",
      initialValue: false,
      description: "Enable to prevent search engines from indexing this page",
    }),
    defineField({
      name: "ogImage",
      title: "Social Share Image",
      type: "image",
      description: "Image displayed when shared on social media",
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: {
      title: "metaTitle",
      subtitle: "metaDescription",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "No meta title set",
        subtitle: subtitle?.substring(0, 50) + "..." || "No description",
      };
    },
  },
});
