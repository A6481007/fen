import { DownloadIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

// Deprecated legacy download doc; kept active for existing downloads routes during the News/Catalog transition.

export const downloadType = defineType({
  name: "download",
  title: "Download",
  type: "document",
  icon: DownloadIcon,
  description: "Deprecated legacy download doc; keep only for backoffice-admin workflows.",
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
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "draft",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Published", value: "published" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "file",
      title: "Asset File",
      description: "The file that will be downloadable from the News hub.",
      type: "file",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      description: "Short description of what this download provides.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "relatedProducts",
      title: "Related Products",
      description:
        "Product(s) this download matches so the front end can show contextual CTAs.",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
        }),
      ],
      validation: (Rule) => Rule.unique(),
    }),
  ],
  preview: {
    select: {
      title: "title",
      relatedProduct: "relatedProducts.0->name",
    },
    prepare({ title, relatedProduct }) {
      return {
        title,
        subtitle: relatedProduct
          ? `Download • Matches ${relatedProduct}`
          : "Download asset",
      };
    },
  },
});
