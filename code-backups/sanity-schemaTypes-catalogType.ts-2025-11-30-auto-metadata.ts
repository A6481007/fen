import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

const CATALOG_PLACEHOLDER_PATH = "/images/catalog/cover-placeholder.png";

const formatFileSize = (size?: number) => {
  if (typeof size !== "number" || Number.isNaN(size)) {
    return null;
  }
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const catalogType = defineType({
  name: "catalog",
  title: "Catalog",
  type: "document",
  icon: DocumentTextIcon,
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
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishDate",
      title: "Publish Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "file",
      title: "Catalog File",
      description:
        "Upload the asset for this catalog item. Large files may delay cover generation; we store the original filename and derive type/size automatically.",
      type: "file",
      options: {
        storeOriginalFilename: true,
      },
      validation: (Rule) =>
        Rule.required().custom((file) => {
          const hasAsset = Boolean(
            (file as { asset?: { _ref?: string } } | undefined)?.asset?._ref
          );
          return hasAsset || "File upload with an asset is required.";
        }),
    }),
    defineField({
      name: "metadata",
      title: "Metadata",
      type: "object",
      description:
        "Classification and derived file details. fileSize/fileType come from the uploaded asset and are read-only.",
      fields: [
        defineField({
          name: "category",
          title: "Category",
          type: "string",
          options: {
            layout: "dropdown",
          },
        }),
        defineField({
          name: "tags",
          title: "Tags",
          type: "array",
          of: [defineArrayMember({ type: "string" })],
          options: {
            layout: "tags",
          },
        }),
        defineField({
          name: "version",
          title: "Version",
          type: "string",
        }),
        defineField({
          name: "fileSize",
          title: "File Size",
          type: "number",
          readOnly: true,
          description: "Auto-derived from the file asset metadata; do not edit manually.",
        }),
        defineField({
          name: "fileType",
          title: "File Type",
          type: "string",
          readOnly: true,
          description: "Auto-derived from the uploaded file MIME type; do not edit manually.",
        }),
      ],
    }),
    defineField({
      name: "relatedDownloads",
      title: "Related Downloads",
      description: "Downloads to surface alongside this catalog item.",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "download" }],
        }),
      ],
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "object",
      description:
        "Use a custom cover or auto-generate from the uploaded file. A stable placeholder is used if generation fails or the file is too small.",
      fields: [
        defineField({
          name: "useAutoGeneration",
          title: "Use Auto Generation",
          type: "boolean",
          initialValue: true,
          description: "Toggle auto-generation from the first page or thumbnail of the file.",
        }),
        defineField({
          name: "customCover",
          title: "Custom Cover",
          type: "image",
          options: {
            hotspot: true,
          },
          description: "Optional manual cover image. Large files may benefit from pre-cropped covers.",
        }),
        defineField({
          name: "generatedFromFile",
          title: "Generated From File",
          type: "string",
          readOnly: true,
          description:
            "Automatically set by the generator to note which file or page produced the cover. Not editable.",
        }),
        defineField({
          name: "placeholderPath",
          title: "Placeholder Path",
          type: "string",
          readOnly: true,
          initialValue: CATALOG_PLACEHOLDER_PATH,
          description: "Stable fallback used when cover generation fails. Keep this path consistent.",
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "metadata.category",
      version: "metadata.version",
      fileType: "metadata.fileType",
      fileSize: "metadata.fileSize",
    },
    prepare({ title, category, version, fileType, fileSize }) {
      const primaryBadges = [category, version ? `v${version}` : null].filter(Boolean);
      const fallbackBadges = [fileType, formatFileSize(fileSize)].filter(Boolean);

      return {
        title,
        subtitle: primaryBadges.length > 0
          ? primaryBadges.join(" • ")
          : fallbackBadges.join(" • ") || "Catalog item",
      };
    },
  },
});
