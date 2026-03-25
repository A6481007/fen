import { defineArrayMember, defineField, defineType } from "sanity";
import { createTaxonomyFields, LEVEL_OPTIONS } from "./helpers/taxonomy";

const LEARNING_DOC_TYPES = new Set([
  "article",
  "lesson",
  "series",
  "glossaryTerm",
  "faqEntry",
  "knowledgePack",
]);
const COMPANION_ELIGIBLE_TYPES = new Set(["article", "lesson"]);

const isLearningDoc = (doc?: { _type?: string } | null) =>
  doc?._type ? LEARNING_DOC_TYPES.has(doc._type) : false;

const isCompanionEligible = (doc?: { _type?: string } | null) =>
  doc?._type ? COMPANION_ELIGIBLE_TYPES.has(doc._type) : false;

const createSlugField = (source: string = "title") =>
  defineField({
    name: "slug",
    title: "Slug",
    type: "slug",
    options: { source, maxLength: 96 },
    validation: (Rule) => Rule.required(),
  });

const createMainImageField = (title = "Main image") =>
  defineField({
    name: "mainImage",
    title,
    type: "image",
    options: { hotspot: true },
  });

const createBodyField = (title = "Body") =>
  defineField({
    name: "body",
    title,
    type: "blockContent",
  });

const createSeoField = () =>
  defineField({
    name: "seo",
    title: "SEO",
    type: "seoMetadata",
  });

const createTeachingMetadataFields = (
  options: {
    requireLevel?: boolean;
    enforceObjectives?: boolean;
    requireObjectives?: boolean;
    includeCompanionPack?: boolean;
  } = {}
) => {
  const objectivesValidation =
    options.requireObjectives
      ? (Rule: any) => Rule.required().min(2).max(6)
      : options.enforceObjectives
      ? (Rule: any) => Rule.min(3).max(6).warning("Aim for 3–6 focused objectives.")
      : undefined;

  const takeawaysValidation =
    options.requireObjectives || options.enforceObjectives
      ? (Rule: any) => Rule.min(3).max(8).warning("3–8 concise takeaways keeps the scan clean.")
      : undefined;

  return [
    defineField({
      name: "whyItMatters",
      title: "Why it matters",
      type: "text",
      rows: 2,
      description: "Short framing statement shown near the top of the lesson/article.",
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "level",
      title: "Level",
      type: "string",
      options: {
        list: LEVEL_OPTIONS,
        layout: "radio",
      },
      validation: options.requireLevel ? (Rule) => Rule.required() : undefined,
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "timeToCompleteMinutes",
      title: "Time to complete (minutes)",
      type: "number",
      description: "Whole minutes; leave blank to fall back to reading time.",
      validation: (Rule) => Rule.min(1).integer().warning("Use whole minutes."),
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "prerequisites",
      title: "Prerequisites",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "lesson" }, { type: "article" }, { type: "knowledgePack" }],
        }),
        defineArrayMember({
          name: "prerequisiteNote",
          title: "Custom prerequisite",
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Description",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "Link (optional)",
              type: "url",
            }),
          ],
        }),
      ],
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "learningObjectives",
      title: "Learning objectives",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: objectivesValidation,
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "keyTakeaways",
      title: "Key takeaways",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: takeawaysValidation,
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "lastReviewedAt",
      title: "Last reviewed",
      type: "date",
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    defineField({
      name: "reviewedBy",
      title: "Reviewed by",
      type: "reference",
      to: [{ type: "author" }, { type: "insightAuthor" }],
      hidden: ({ document }) => !isLearningDoc(document as { _type?: string }),
    }),
    ...(options.includeCompanionPack
      ? [
          defineField({
            name: "companionPack",
            title: "Companion pack",
            type: "reference",
            to: [{ type: "knowledgePack" }],
            description: "Optional knowledge pack that pairs with this content.",
            hidden: ({ document }) => !isCompanionEligible(document as { _type?: string }),
          }),
        ]
      : []),
    // Legacy fields kept (hidden) to avoid data loss while migrating.
    defineField({
      name: "difficultyLevel",
      title: "Difficulty level (legacy)",
      type: "string",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
          { title: "Expert", value: "expert" },
        ],
        layout: "radio",
      },
      hidden: true,
    }),
    defineField({
      name: "estimatedTime",
      title: "Estimated time (legacy)",
      type: "string",
      hidden: true,
    }),
    defineField({
      name: "lastReviewed",
      title: "Last reviewed (legacy)",
      type: "date",
      hidden: true,
    }),
    defineField({
      name: "reviewer",
      title: "Reviewer (legacy)",
      type: "reference",
      to: [{ type: "author" }, { type: "insightAuthor" }],
      hidden: true,
    }),
  ];
};

// Editorial primitives
export const articleType = defineType({
  name: "article",
  title: "Article",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "article",
        format: "article",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField(),
    defineField({
      name: "series",
      title: "Part of series",
      type: "reference",
      to: [{ type: "series" }],
      description: "Series this article belongs to.",
    }),
    defineField({
      name: "knowledgePacks",
      title: "Related knowledge packs",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "knowledgePack" }] })],
    }),
    defineField({
      name: "solutionBundles",
      title: "Promoted solution bundles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "solutionBundle" }] })],
    }),
    defineField({
      name: "recommendedProducts",
      title: "Recommended products",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "learningProduct" }] })],
    }),
    defineField({
      name: "relatedLessons",
      title: "Related lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })],
    }),
    defineField({
      name: "relatedArticles",
      title: "Related articles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "article" }] })],
    }),
    defineField({
      name: "featuredKit",
      title: "Featured recommended kit",
      type: "reference",
      to: [{ type: "recommendedKitLink" }],
      description: "Used for inline CTAs in the body content.",
    }),
    ...createTeachingMetadataFields({
      requireLevel: true,
      enforceObjectives: true,
      includeCompanionPack: true,
    }),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const seriesType = defineType({
  name: "series",
  title: "Series",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "series",
        format: "series",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField("Series overview"),
    defineField({
      name: "entries",
      title: "Articles and lessons in this series",
      type: "array",
      of: [
        defineArrayMember({ type: "reference", to: [{ type: "article" }, { type: "lesson" }] }),
      ],
    }),
    defineField({
      name: "knowledgePack",
      title: "Primary knowledge pack",
      type: "reference",
      to: [{ type: "knowledgePack" }],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const lessonType = defineType({
  name: "lesson",
  title: "Lesson",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "lesson",
        format: "lesson",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField("Lesson body"),
    defineField({
      name: "series",
      title: "Series",
      type: "reference",
      to: [{ type: "series" }],
    }),
    defineField({
      name: "knowledgePack",
      title: "Knowledge pack",
      type: "reference",
      to: [{ type: "knowledgePack" }],
    }),
    defineField({
      name: "relatedGlossaryTerms",
      title: "Glossary terms",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "glossaryTerm" }] })],
    }),
    defineField({
      name: "relatedFaqs",
      title: "FAQs",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "faqEntry" }] })],
    }),
    defineField({
      name: "resources",
      title: "Resources",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "url", title: "URL", type: "url" }),
            defineField({ name: "file", title: "File", type: "file" }),
          ],
        }),
      ],
    }),
    ...createTeachingMetadataFields({
      requireLevel: true,
      requireObjectives: true,
      includeCompanionPack: true,
    }),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const glossaryTermType = defineType({
  name: "glossaryTerm",
  title: "Glossary term",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Term",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "shortDefinition",
      title: "Short definition",
      type: "text",
      rows: 2,
      validation: (Rule) => Rule.required(),
    }),
    createMainImageField("Illustration"),
    ...createTaxonomyFields({
      defaults: {
        contentType: "glossaryTerm",
        format: "glossary",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField("Extended definition"),
    defineField({
      name: "relatedLessons",
      title: "Related lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })],
    }),
    defineField({
      name: "relatedArticles",
      title: "Related articles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "article" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "shortDefinition",
      media: "mainImage",
    },
  },
});

export const faqEntryType = defineType({
  name: "faqEntry",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Question",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Summary",
      type: "string",
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(16)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField("Supporting image"),
    ...createTaxonomyFields({
      defaults: {
        contentType: "faq",
        format: "faq",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField("Answer"),
    defineField({
      name: "relatedKnowledgePacks",
      title: "Knowledge packs",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "knowledgePack" }] })],
    }),
    defineField({
      name: "relatedProducts",
      title: "Products",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "learningProduct" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const knowledgePackType = defineType({
  name: "knowledgePack",
  title: "Knowledge pack",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "knowledgePack",
        format: "knowledgePack",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "In stock / Available", value: "inStock" },
          { title: "Preorder", value: "preorder" },
          { title: "Coming soon", value: "comingSoon" },
          { title: "Retired", value: "retired" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "requiresAccess",
      title: "Gate this pack",
      type: "boolean",
      initialValue: false,
      description: "Enable lead capture or entitlement checks before download.",
    }),
    defineField({
      name: "accessType",
      title: "Gate type",
      type: "string",
      options: {
        list: [
          { title: "Email capture", value: "email" },
          { title: "Customer / partner only", value: "customer" },
          { title: "Internal only", value: "internal" },
        ],
        layout: "radio",
      },
      hidden: ({ parent }) => !parent?.requiresAccess,
    }),
    defineField({
      name: "accessMessage",
      title: "Access message",
      type: "text",
      rows: 2,
      description: "Short message that explains how to unlock the pack.",
      hidden: ({ parent }) => !parent?.requiresAccess,
    }),
    createBodyField("Overview and inclusions"),
    defineField({
      name: "whatsInside",
      title: "What's inside",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Item title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "kind",
              title: "Type",
              type: "string",
              options: {
                list: [
                  { title: "Lesson", value: "lesson" },
                  { title: "Article", value: "article" },
                  { title: "Checklist", value: "checklist" },
                  { title: "Template", value: "template" },
                  { title: "Video", value: "video" },
                  { title: "Other", value: "other" },
                ],
                layout: "tags",
              },
            }),
            defineField({
              name: "description",
              title: "Description",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "reference",
              title: "Linked content",
              type: "reference",
              to: [
                { type: "lesson" },
                { type: "article" },
                { type: "faqEntry" },
                { type: "glossaryTerm" },
              ],
            }),
            defineField({
              name: "link",
              title: "External link",
              type: "url",
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "kind" },
            prepare({ title, subtitle }) {
              return {
                title: title || "Pack item",
                subtitle: subtitle || "Resource",
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "lessons",
      title: "Included lessons",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lesson" }] })],
    }),
    defineField({
      name: "articles",
      title: "Included articles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "article" }] })],
    }),
    defineField({
      name: "faqs",
      title: "FAQ entries",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "faqEntry" }] })],
    }),
    defineField({
      name: "glossaryTerms",
      title: "Glossary terms",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "glossaryTerm" }] })],
    }),
    defineField({
      name: "recommendedProducts",
      title: "Recommended products",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "learningProduct" }] })],
    }),
    defineField({
      name: "bundles",
      title: "Solution bundles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "solutionBundle" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

// Event primitives
export const learningEventType = defineType({
  name: "learningEvent",
  title: "Event",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 180 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(24)
          .max(180)
          .warning("Keep summaries tight for cards and previews."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "event",
        format: "event",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
      description: "When this event page goes live.",
    }),
    defineField({
      name: "startDate",
      title: "Start date and time",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End date and time",
      type: "datetime",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value) return true;
          const start = (context?.document as { startDate?: string } | undefined)?.startDate;
          if (start && new Date(value) < new Date(start)) {
            return "End date must be after start date.";
          }
          return true;
        }),
    }),
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      initialValue: "UTC",
      description: "IANA timezone identifier.",
    }),
    defineField({
      name: "mode",
      title: "Mode",
      type: "string",
      options: {
        list: [
          { title: "Online", value: "online" },
          { title: "In-person", value: "inPerson" },
          { title: "Hybrid", value: "hybrid" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "locationNote",
      title: "Location label",
      type: "string",
    }),
    defineField({
      name: "venue",
      title: "Venue",
      type: "reference",
      to: [{ type: "venue" }],
    }),
    defineField({
      name: "sessions",
      title: "Sessions",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "session" }] })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "speakers",
      title: "Featured speakers",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
    }),
    defineField({
      name: "tickets",
      title: "Tickets",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "ticket" }] })],
    }),
    defineField({
      name: "recordings",
      title: "Recordings",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "recording" }] })],
    }),
    defineField({
      name: "startingPrice",
      title: "Starting price",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "On sale", value: "onSale" },
          { title: "Waitlist", value: "waitlist" },
          { title: "Sold out", value: "soldOut" },
          { title: "Archived", value: "archived" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "registrationUrl",
      title: "Registration URL",
      type: "url",
    }),
    createBodyField("Event description"),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "startDate",
      media: "mainImage",
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? new Date(subtitle as string).toLocaleString() : undefined,
        media,
      };
    },
  },
});

export const sessionType = defineType({
  name: "session",
  title: "Session",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(16)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField("Session image"),
    ...createTaxonomyFields({
      defaults: {
        contentType: "session",
        format: "event",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "startDate",
      title: "Start date and time",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "endDate",
      title: "End date and time",
      type: "datetime",
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (!value) return true;
          const start = (context?.document as { startDate?: string } | undefined)?.startDate;
          if (start && new Date(value) < new Date(start)) {
            return "End date must be after start date.";
          }
          return true;
        }),
    }),
    defineField({
      name: "event",
      title: "Parent event",
      type: "reference",
      to: [{ type: "learningEvent" }],
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
    }),
    defineField({
      name: "venue",
      title: "Venue override",
      type: "reference",
      to: [{ type: "venue" }],
    }),
    defineField({
      name: "recordings",
      title: "Recordings",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "recording" }] })],
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "Scheduled", value: "scheduled" },
          { title: "Live", value: "live" },
          { title: "Completed", value: "completed" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
    }),
    createBodyField("Session content"),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "event.title",
      media: "mainImage",
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `Event: ${subtitle}` : undefined,
        media,
      };
    },
  },
});

export const speakerType = defineType({
  name: "speaker",
  title: "Speaker",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField("title"),
    defineField({
      name: "description",
      title: "Headline / role",
      type: "string",
    }),
    createMainImageField("Headshot"),
    defineField({
      name: "publishDate",
      title: "Profile published",
      type: "datetime",
    }),
    createBodyField("Bio"),
    defineField({
      name: "organization",
      title: "Organization",
      type: "string",
    }),
    defineField({
      name: "links",
      title: "Links",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", title: "Label", type: "string" }),
            defineField({ name: "url", title: "URL", type: "url" }),
          ],
        }),
      ],
    }),
    defineField({
      name: "expertise",
      title: "Expertise",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "sessions",
      title: "Sessions",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "session" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const venueType = defineType({
  name: "venue",
  title: "Venue",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Venue name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    createMainImageField("Venue image"),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "address",
      title: "Address",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
    }),
    defineField({
      name: "country",
      title: "Country",
      type: "string",
    }),
    defineField({
      name: "geo",
      title: "Geo coordinates",
      type: "object",
      fields: [
        defineField({ name: "lat", title: "Latitude", type: "number" }),
        defineField({ name: "lng", title: "Longitude", type: "number" }),
      ],
    }),
    defineField({
      name: "mapUrl",
      title: "Map URL",
      type: "url",
    }),
    defineField({
      name: "capacity",
      title: "Capacity",
      type: "number",
    }),
    createBodyField("Venue details"),
    defineField({
      name: "events",
      title: "Events",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "learningEvent" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "city",
      media: "mainImage",
    },
  },
});

export const ticketType = defineType({
  name: "ticket",
  title: "Ticket",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    createMainImageField("Ticket image"),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "learningEvent" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "session",
      title: "Session (optional)",
      type: "reference",
      to: [{ type: "session" }],
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "currency",
      title: "Currency",
      type: "string",
      initialValue: "USD",
      options: {
        list: [
          { title: "USD", value: "USD" },
          { title: "THB", value: "THB" },
          { title: "EUR", value: "EUR" },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "On sale", value: "onSale" },
          { title: "Waitlist", value: "waitlist" },
          { title: "Sold out", value: "soldOut" },
          { title: "Off sale", value: "offSale" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "salesStart",
      title: "Sales start",
      type: "datetime",
    }),
    defineField({
      name: "salesEnd",
      title: "Sales end",
      type: "datetime",
    }),
    defineField({
      name: "quantityAvailable",
      title: "Quantity available",
      type: "number",
    }),
    createBodyField("Inclusions and fine print"),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "event.title",
      media: "mainImage",
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `Event: ${subtitle}` : undefined,
        media,
      };
    },
  },
});

export const recordingType = defineType({
  name: "recording",
  title: "Recording",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(16)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField("Poster / thumbnail"),
    ...createTaxonomyFields({
      defaults: {
        contentType: "recording",
        format: "recording",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "learningEvent" }],
    }),
    defineField({
      name: "session",
      title: "Session",
      type: "reference",
      to: [{ type: "session" }],
    }),
    defineField({
      name: "videoUrl",
      title: "Video URL",
      type: "url",
    }),
    defineField({
      name: "duration",
      title: "Duration (seconds)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "Public", value: "public" },
          { title: "Attendees only", value: "attendees" },
          { title: "Internal", value: "internal" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "transcript",
      title: "Transcript",
      type: "blockContent",
    }),
    createBodyField("Show notes"),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "event.title",
      media: "mainImage",
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `Event: ${subtitle}` : undefined,
        media,
      };
    },
  },
});

// Commerce primitives
export const learningProductType = defineType({
  name: "learningProduct",
  title: "Product",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "sku",
      title: "SKU",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(16)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    defineField({
      name: "gallery",
      title: "Gallery",
      type: "array",
      of: [defineArrayMember({ type: "image", options: { hotspot: true } })],
    }),
    ...createTaxonomyFields({
      defaults: {
        contentType: "product",
        format: "productSheet",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "price",
      title: "Price",
      type: "number",
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: "currency",
      title: "Currency",
      type: "string",
      initialValue: "USD",
      options: { list: ["USD", "THB", "EUR"] },
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "In stock", value: "inStock" },
          { title: "Backorder", value: "backorder" },
          { title: "Preorder", value: "preorder" },
          { title: "Discontinued", value: "discontinued" },
        ],
      },
    }),
    defineField({
      name: "body",
      title: "Details",
      type: "blockContent",
    }),
    defineField({
      name: "relatedKnowledgePacks",
      title: "Knowledge packs",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "knowledgePack" }] })],
    }),
    defineField({
      name: "solutionBundles",
      title: "Solution bundles",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "solutionBundle" }] })],
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const solutionBundleType = defineType({
  name: "solutionBundle",
  title: "Solution bundle",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description: "One-line card summary (max 160 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(16)
          .max(160)
          .warning("Keep summaries to a single, scannable line."),
    }),
    createMainImageField(),
    ...createTaxonomyFields({
      defaults: {
        contentType: "solutionBundle",
        format: "solutionOverview",
        availabilityStatus: "public",
      },
    }),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    defineField({
      name: "products",
      title: "Products",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "learningProduct" }] })],
    }),
    defineField({
      name: "knowledgePacks",
      title: "Knowledge packs",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "knowledgePack" }] })],
    }),
    defineField({
      name: "bundleValue",
      title: "Bundle value (MSRP)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "bundlePrice",
      title: "Bundle price",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Coming soon", value: "comingSoon" },
          { title: "Retired", value: "retired" },
        ],
        layout: "radio",
      },
    }),
    createBodyField("Bundle details"),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
      media: "mainImage",
    },
  },
});

export const recommendedKitLinkType = defineType({
  name: "recommendedKitLink",
  title: "Recommended kit link",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    createSlugField(),
    defineField({
      name: "ctaLabel",
      title: "CTA label",
      type: "string",
      description: "Label used when embedding this CTA inline.",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    createMainImageField("CTA image"),
    defineField({
      name: "publishDate",
      title: "Publish date",
      type: "datetime",
    }),
    createBodyField("Inline CTA copy"),
    defineField({
      name: "product",
      title: "Product",
      type: "reference",
      to: [{ type: "learningProduct" }],
    }),
    defineField({
      name: "solutionBundle",
      title: "Solution bundle",
      type: "reference",
      to: [{ type: "solutionBundle" }],
    }),
    defineField({
      name: "knowledgePack",
      title: "Knowledge pack",
      type: "reference",
      to: [{ type: "knowledgePack" }],
    }),
    defineField({
      name: "externalUrl",
      title: "External URL",
      type: "url",
      description: "Optional override when linking out of Sanity.",
    }),
    defineField({
      name: "badge",
      title: "Badge",
      type: "string",
      description: "Short badge for inline display (e.g., New, Best seller).",
    }),
    ...createTeachingMetadataFields(),
    createSeoField(),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "ctaLabel",
      media: "mainImage",
    },
  },
});
