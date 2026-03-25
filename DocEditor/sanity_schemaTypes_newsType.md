import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
import { buildBannerFields } from "./helpers/bannerSettings";

const attachmentFileTypes = [
  { title: "PDF", value: "pdf" },
  { title: "Image", value: "image" },
  { title: "Document", value: "document" },
  { title: "Link", value: "link" },
  { title: "Offline / In-person", value: "offline" },
  // Back-compat values for legacy content
  { title: "PDF (legacy)", value: "PDF" },
  { title: "Doc (legacy)", value: "doc" },
];

const validateAttachment = (attachment: Record<string, unknown>) => {
  const fileTypeRaw = (attachment?.fileType as string | undefined) || "";
  const fileType = fileTypeRaw.toLowerCase();
  const file = attachment?.file as { asset?: { _ref?: string } } | undefined;
  const hasAsset = Boolean(file?.asset?._ref);
  const linkUrl =
    (attachment?.linkUrl as string | undefined) || (attachment?.url as string | undefined);
  const offlineInstructions = (attachment?.offlineInstructions as string | undefined) || "";

  if (!fileType) {
    return "Choose a file type.";
  }

  if (fileType === "link" && !linkUrl) {
    return "Provide a link URL for link attachments.";
  }

  if (fileType === "offline" && !offlineInstructions.trim()) {
    return "Add pickup or offline access instructions.";
  }

  if (!["link", "offline"].includes(fileType) && !hasAsset) {
    return "Upload a file for this attachment.";
  }

  return true;
};

export const newsType = defineType({
  name: "news",
  title: "News",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "resources", title: "Resources" },
    { name: "seo", title: "SEO" },
    { name: "publishing", title: "Publishing" },
  ],
  fieldsets: [
    {
      name: "localization",
      title: "🌐 Thai localization",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "English headline. Add the Thai translation in Title (TH).",
      validation: (Rule) => Rule.required().min(8),
      group: "content",
    }),
    defineField({
      name: "titleTh",
      title: "Title (TH)",
      type: "string",
      description: "Optional Thai headline. If left blank, English will be shown.",
      fieldset: "localization",
      group: "content",
    }),
    defineField({
      name: "locale",
      title: "Locale",
      type: "reference",
      to: [{ type: "locale" }],
      validation: (Rule) => Rule.optional(),
      group: "content",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
      },
      validation: (Rule) => Rule.required(),
      group: "publishing",
    }),
    defineField({
      name: "publishDate",
      title: "Publish Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
      group: "publishing",
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      description: "Track major edits for bylines, SEO freshness, and update labels.",
      group: "publishing",
    }),
    defineField({
      name: "author",
      type: "reference",
      to: { type: "author" },
      group: "content",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      initialValue: "general",
      options: {
        list: [
          { title: "Announcement", value: "announcement" },
          { title: "Partnership", value: "partnership" },
          { title: "Event Announcement", value: "event_announcement" },
          { title: "General", value: "general" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "tags",
      title: "Tags / Topics",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
      description: "Help readers and search engines understand the topic (e.g., sustainability, retail tech).",
      options: { layout: "tags" },
      group: "content",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "Short blurb used in cards and SEO snippets. Falls back to the first paragraph.",
      group: "content",
    }),
    defineField({
      name: "excerptTh",
      title: "Excerpt (TH)",
      type: "text",
      rows: 3,
      description: "Optional Thai blurb used in cards and summaries.",
      fieldset: "localization",
      group: "content",
    }),
    defineField({
      name: "dek",
      title: "Dek / Standfirst",
      type: "text",
      rows: 2,
      description: "Optional secondary intro that appears under the headline.",
      group: "content",
    }),
    defineField({
      name: "dekTh",
      title: "Dek / Standfirst (TH)",
      type: "text",
      rows: 2,
      description: "Optional Thai secondary intro that appears under the headline.",
      fieldset: "localization",
      group: "content",
    }),
    defineField({
      name: "keyTakeaways",
      title: "Key Takeaways",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
      validation: (Rule) => Rule.max(6),
      description: "Short bullets that summarize what matters (ideal for skim readers).",
      group: "content",
    }),
    defineField({
      name: "keyTakeawaysTh",
      title: "Key Takeaways (TH)",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
        }),
      ],
      validation: (Rule) => Rule.max(6),
      description: "Optional Thai bullet summary for skim readers.",
      fieldset: "localization",
      group: "content",
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          validation: (Rule) => Rule.required().min(4),
        }),
        defineField({
          name: "caption",
          type: "text",
          rows: 2,
        }),
      ],
      group: "media",
    }),
    defineField({
      name: "heroLayout",
      title: "Hero Layout",
      type: "string",
      options: {
        list: [
          { title: "Standard", value: "standard" },
          { title: "Full bleed", value: "fullBleed" },
          { title: "Image left", value: "imageLeft" },
          { title: "Image right", value: "imageRight" },
          { title: "Banner", value: "banner" },
        ],
        layout: "radio",
      },
      initialValue: "standard",
      group: "media",
    }),
    defineField({
      name: "heroTheme",
      title: "Hero Theme",
      type: "string",
      options: {
        list: [
          { title: "Light", value: "light" },
          { title: "Dark", value: "dark" },
          { title: "Overlay", value: "overlay" },
        ],
        layout: "radio",
      },
      initialValue: "light",
      group: "media",
    }),
    defineField({
      name: "content",
      title: "Body",
      type: "blockContent",
      group: "content",
      description: "English body content. Add the Thai translation in Body (TH).",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "contentTh",
      title: "Body (TH)",
      type: "blockContent",
      description: "Optional Thai body content. If left blank, English will be shown.",
      fieldset: "localization",
      group: "content",
    }),
    defineField({
      name: "contentType",
      title: "Content Type",
      type: "string",
      description:
        "Classify the article for downstream routing and metadata. Choose “Event” for event-specific coverage.",
      options: {
        list: [
          { title: "News", value: "news" },
          { title: "Article", value: "article" },
          { title: "Event", value: "event" },
          { title: "Resource", value: "resource" },
          { title: "Download", value: "download" },
        ],
        layout: "radio",
      },
      initialValue: "news",
      group: "publishing",
    }),
    defineField({
      name: "isEvent",
      title: "Event Story",
      type: "boolean",
      description: "Flag if this article should be treated as an event announcement in the newsroom.",
      initialValue: false,
      group: "publishing",
    }),
    defineField({
      name: "isFeatured",
      title: "Feature in hero",
      type: "boolean",
      initialValue: false,
      description: "Use for top-story hero placement.",
      group: "publishing",
    }),
    defineField({
      name: "isPinned",
      title: "Pinned",
      type: "boolean",
      initialValue: false,
      description: "Keeps the story near the top of lists until manually unpinned.",
      group: "publishing",
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          validation: (Rule) => Rule.required().min(4),
        }),
        defineField({
          name: "caption",
          type: "text",
          rows: 2,
        }),
        defineField({
          name: "credit",
          title: "Credit / Source",
          type: "string",
        }),
      ],
      validation: (Rule) => Rule.required(),
      group: "media",
    }),
    defineField({
      name: "linkedEvent",
      title: "Linked Event",
      type: "reference",
      to: { type: "event" },
      description:
        "Attach an event to power event CTAs and locked attachments. Event must exist before linking.",
      group: "resources",
    }),
    defineField({
      name: "attachments",
      title: "Attachments & Resources",
      type: "array",
      of: [
        defineArrayMember({
          name: "attachment",
          title: "Attachment",
          type: "object",
          fields: [
            defineField({
              name: "fileType",
              title: "File Type",
              type: "string",
              options: { list: attachmentFileTypes },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "linkUrl",
              title: "Link URL",
              type: "url",
              description: "Required when the attachment is a link. External URLs only.",
              hidden: ({ parent }) => (parent?.fileType as string | undefined)?.toLowerCase() !== "link",
              validation: (Rule) =>
                Rule.uri({
                  allowRelative: false,
                  scheme: ["http", "https"],
                }),
            }),
            defineField({
              name: "offlineInstructions",
              title: "Offline / Pickup Instructions",
              type: "text",
              rows: 2,
              description: "Tell people how to get this resource in-person (booth, venue desk, etc.).",
              hidden: ({ parent }) =>
                (parent?.fileType as string | undefined)?.toLowerCase() !== "offline",
            }),
            defineField({
              name: "file",
              title: "File",
              type: "file",
              options: { storeOriginalFilename: true },
              hidden: ({ parent }) => {
                const fileType = (parent?.fileType as string | undefined)?.toLowerCase();
                return fileType === "link" || fileType === "offline";
              },
            }),
            defineField({
              name: "requiresRegistration",
              title: "Requires registration",
              type: "boolean",
              initialValue: false,
              description: "Marks the attachment as visible only for registered/attending users.",
            }),
            defineField({
              name: "availableFrom",
              title: "Available from",
              type: "datetime",
            }),
            defineField({
              name: "availableTo",
              title: "Available until",
              type: "datetime",
              validation: (Rule) =>
                Rule.custom((value, context) => {
                  const from = (context.parent as { availableFrom?: string } | undefined)?.availableFrom;
                  if (value && from && new Date(value) < new Date(from)) {
                    return "Available until must be after available from.";
                  }
                  return true;
                }),
            }),
            defineField({
              name: "status",
              title: "Access",
              type: "string",
              options: {
                list: [
                  { title: "Public", value: "public" },
                  { title: "Event Locked", value: "event_locked" },
                ],
              },
              initialValue: "public",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "Deprecated URL",
              type: "url",
              hidden: true,
              description: "Legacy field kept for backwards compatibility. Use linkUrl instead.",
            }),
          ],
          validation: (Rule) => Rule.custom((attachment) => validateAttachment(attachment as any)),
          preview: {
            select: {
              title: "title",
              fileType: "fileType",
              status: "status",
            },
            prepare({ title, fileType, status }) {
              const badgeParts = [
                fileType && typeof fileType === "string" ? fileType.toUpperCase() : null,
                status === "event_locked" ? "Locked" : "Public",
              ].filter(Boolean);
              return {
                title,
                subtitle: badgeParts.join(" • ") || undefined,
              };
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((attachments, context) => {
          if (!attachments || attachments.length === 0) {
            return true;
          }
          const document = context.document as { linkedEvent?: { _ref?: string } } | undefined;
          const hasLinkedEvent = Boolean(document?.linkedEvent);
          const hasLockedAttachment = (attachments as { status?: string }[]).some(
            (attachment) => attachment?.status === "event_locked"
          );
          if (hasLockedAttachment && !hasLinkedEvent) {
            return "Event-locked attachments require a linked event.";
          }
          return true;
        }),
      group: "resources",
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "seoMetadata",
      description: "Meta title, description, keywords, and social image for news detail pages.",
      group: "seo",
    }),
    ...buildBannerFields({ initialPlacement: "newspagehero", group: "publishing" }),
    defineField({
      name: "viewCount",
      title: "View Count",
      type: "number",
      description: "Tracks article popularity for sorting. Defaults to 0 when not set.",
      validation: (Rule) => Rule.min(0),
      initialValue: 0,
      group: "publishing",
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "publishDateDesc",
      by: [
        { field: "publishDate", direction: "desc" },
        { field: "_createdAt", direction: "desc" },
      ],
    },
    {
      title: "Oldest first",
      name: "publishDateAsc",
      by: [
        { field: "publishDate", direction: "asc" },
        { field: "_createdAt", direction: "asc" },
      ],
    },
    {
      title: "Most viewed",
      name: "mostViewed",
      by: [
        { field: "viewCount", direction: "desc" },
        { field: "publishDate", direction: "desc" },
      ],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      publishDate: "publishDate",
      attachments: "attachments",
      linkedEventTitle: "linkedEvent.title",
      viewCount: "viewCount",
      isFeatured: "isFeatured",
      isPinned: "isPinned",
    },
    prepare({ title, category, linkedEventTitle, publishDate, attachments, viewCount, isFeatured, isPinned }) {
      const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
      const hasLocked = Array.isArray(attachments)
        ? attachments.some((item) => item?.status === "event_locked")
        : false;
      const parts = [
        category,
        publishDate ? new Date(publishDate).toLocaleDateString() : null,
        linkedEventTitle ? `Linked: ${linkedEventTitle}` : null,
        attachmentCount ? `${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}` : null,
        hasLocked ? "Locked assets" : null,
        isFeatured ? "Featured" : null,
        isPinned ? "Pinned" : null,
        typeof viewCount === "number" && viewCount > 0 ? `${viewCount} views` : null,
      ].filter(Boolean);
      return {
        title,
        subtitle: parts.join(" • ") || undefined,
      };
    },
  },
});
