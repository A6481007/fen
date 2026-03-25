import { TranslateIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const localeType = defineType({
  name: "locale",
  title: "Locale",
  type: "document",
  icon: TranslateIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Human-friendly label (e.g., English, Thai).",
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: "code",
      title: "Locale Code",
      type: "string",
      description: 'Locale code (e.g., "en", "th", "en-US").',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z]{2}(-[A-Z]{2})?$/, {
          name: "locale-code",
          invert: false,
        }),
    }),
    defineField({
      name: "isDefault",
      title: "Default Locale",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "code",
    },
  },
});
