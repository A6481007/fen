import { StackCompactIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

type InsightSeriesPreviewSelection = {
  title?: string;
  episodes?: unknown[] | null;
  coverImage?: unknown;
};

export const insightSeriesType = defineType({
  name: "insightSeries",
  title: "Insight Series",
  type: "document",
  icon: StackCompactIcon,
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        isUnique: (value, context) => context?.defaultIsUnique?.(value, context) ?? true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "episodes",
      title: "Episodes",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "insight" }],
          options: { disableNew: true },
        }),
      ],
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      episodes: "episodes",
      coverImage: "coverImage",
    },
    prepare({ title, episodes, coverImage }: InsightSeriesPreviewSelection) {
      const count = Array.isArray(episodes) ? episodes.length : 0;
      return {
        title,
        subtitle: `${count} episode${count === 1 ? "" : "s"}`,
        media: coverImage,
      };
    },
  },
});
