import { DocumentTextIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const footerSettingsType = defineType({
  name: "footerSettings",
  title: "Footer Settings",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "brandName",
      title: "Brand Name",
      type: "string",
    }),
    defineField({
      name: "brandDescription",
      title: "Brand Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "contactLabels",
      title: "Contact Labels",
      type: "object",
      fields: [
        defineField({ name: "visitUs", title: "Visit Us", type: "string" }),
        defineField({ name: "callUs", title: "Call Us", type: "string" }),
        defineField({ name: "workingHours", title: "Working Hours", type: "string" }),
        defineField({ name: "emailUs", title: "Email Us", type: "string" }),
      ],
    }),
    defineField({
      name: "quickLinksTitle",
      title: "Quick Links Title",
      type: "string",
    }),
    defineField({
      name: "quickLinks",
      title: "Quick Links",
      type: "array",
      of: [
        defineField({
          name: "link",
          title: "Link",
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({
              name: "titleKey",
              title: "Translation Key",
              type: "string",
              description: "Optional i18n.js key (e.g., client.footer.links.news).",
            }),
            defineField({ name: "href", title: "Href", type: "string" }),
            defineField({
              name: "external",
              title: "External Link",
              type: "boolean",
              initialValue: false,
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "categoriesTitle",
      title: "Categories Title",
      type: "string",
    }),
    defineField({
      name: "newsletterTitle",
      title: "Newsletter Title",
      type: "string",
    }),
    defineField({
      name: "newsletterDescription",
      title: "Newsletter Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "newsletterPlaceholder",
      title: "Newsletter Placeholder",
      type: "string",
    }),
    defineField({
      name: "newsletterButtonLabel",
      title: "Newsletter Button Label",
      type: "string",
    }),
    defineField({
      name: "newsletterLoadingLabel",
      title: "Newsletter Loading Label",
      type: "string",
    }),
    defineField({
      name: "copyrightText",
      title: "Copyright Text",
      type: "string",
      description: "Use {{year}} and {{brand}} placeholders.",
    }),
  ],
  preview: {
    select: {
      title: "brandName",
      subtitle: "brandDescription",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Footer settings",
        subtitle: subtitle || "Configure footer content",
      };
    },
  },
});
