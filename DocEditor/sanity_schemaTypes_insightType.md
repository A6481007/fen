import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";
import { buildBannerFields } from "./helpers/bannerSettings";

const knowledgeInsightTypes = new Set([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

const solutionInsightTypes = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const isSolutionInsight = (parent?: { insightType?: string | null }) =>
  solutionInsightTypes.has(parent?.insightType ?? "");

const isKnowledgeInsight = (parent?: { insightType?: string | null }) =>
  knowledgeInsightTypes.has(parent?.insightType ?? "");

const insightTypeLabels: Record<string, string> = {
  productKnowledge: "Product Knowledge",
  generalKnowledge: "General Knowledge",
  problemKnowledge: "Problem Knowledge",
  comparison: "Comparison Article",
  caseStudy: "Case Study (Proven)",
  validatedSolution: "Validated Solution (Tested)",
  theoreticalSolution: "Theoretical Solution (Emerging)",
};

const knowledgePackValidation = (value: unknown) => {
  if (!value || typeof value !== "object") return true;
  const pack = value as {
    title?: string | null;
    assets?: { label?: string | null; file?: unknown }[] | null;
    links?: { label?: string | null; url?: string | null }[] | null;
  };

  const hasAssets = Array.isArray(pack.assets) && pack.assets.length > 0;
  const hasLinks = Array.isArray(pack.links) && pack.links.length > 0;

  if (!hasAssets && !hasLinks && !pack.title) {
    return true;
  }

  if (!hasAssets && !hasLinks) {
    return "Add at least one asset or external link to publish a knowledge pack";
  }

  if (hasAssets) {
    const invalidAsset = pack.assets?.find(
      (asset) => !asset?.label || !asset?.file
    );
    if (invalidAsset) {
      return "Each asset needs a label and file";
    }
  }

  if (hasLinks) {
    const invalidLink = pack.links?.find((link) => !link?.label || !link?.url);
    if (invalidLink) {
      return "Each link needs a label and URL";
    }
  }

  return true;
};

const normalizeId = (id?: string | null) =>
  typeof id === "string" ? id.replace(/^drafts\./, "") : "";

const resolveLocaleRef = (doc: { locale?: { _ref?: string } | string } | null | undefined) =>
  typeof doc?.locale === "string" ? doc?.locale : doc?.locale?._ref;

const isUniquePerLocale = async (
  value: { current?: string } | undefined,
  context: {
    document?: { _id?: string; _type?: string; locale?: { _ref?: string } | string } | null;
    getClient: (options: { apiVersion: string }) => {
      fetch: (query: string, params: Record<string, unknown>) => Promise<boolean>;
    };
    defaultIsUnique?: (value: { current?: string } | undefined, context: any) => boolean | Promise<boolean>;
  }
) => {
  const slug = value?.current;
  if (!slug) return true;

  const localeRef = resolveLocaleRef(context.document ?? null);
  if (!localeRef) {
    return context.defaultIsUnique?.(value, context) ?? true;
  }

  const id = normalizeId(context.document?._id);
  const client = context.getClient({ apiVersion: "2023-10-01" });
  const query =
    '!defined(*[_type == $type && slug.current == $slug && locale._ref == $locale && !(_id in [$draftId, $publishedId])][0]._id)';

  return client.fetch(query, {
    type: context.document?._type || "insight",
    slug,
    locale: localeRef,
    draftId: `drafts.${id}`,
    publishedId: id,
  });
};

export const insightType = defineType({
  name: "insight",
  title: "Insight",
  type: "document",
  icon: DocumentTextIcon,
  fieldsets: [
    { name: "content", title: "📝 Content", options: { collapsible: false } },
    {
      name: "education",
      title: "🎓 Learning Design",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "resources",
      title: "📦 Resources & Knowledge Pack",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "metadata",
      title: "📋 Metadata & Quality",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "relationships",
      title: "🔗 Relationships",
      options: { collapsible: true, collapsed: false },
    },
    {
      name: "seo",
      title: "🔍 SEO & Keywords",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "solutions",
      title: "💼 Solution Details",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      fieldset: "content",
      validation: (Rule) => Rule.required().min(8),
    }),
    defineField({
      name: "titleTh",
      title: "Title (TH)",
      type: "string",
      fieldset: "content",
      description: "Thai headline for this insight.",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "locale",
      title: "Locale",
      type: "reference",
      fieldset: "content",
      to: [{ type: "locale" }],
      validation: (Rule) => Rule.optional(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      fieldset: "content",
      options: {
        source: "title",
        isUnique: isUniquePerLocale,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "insightType",
      title: "Insight Type",
      type: "string",
      fieldset: "content",
      options: {
        list: [
          { title: "Product Knowledge", value: "productKnowledge" },
          { title: "General Knowledge", value: "generalKnowledge" },
          { title: "Problem Knowledge", value: "problemKnowledge" },
          { title: "Comparison Article", value: "comparison" },
          { title: "Case Study (Proven)", value: "caseStudy" },
          { title: "Validated Solution (Tested)", value: "validatedSolution" },
          { title: "Theoretical Solution (Emerging)", value: "theoreticalSolution" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      fieldset: "content",
      rows: 3,
      description:
        "Short description shown on cards and previews (60-300 characters).",
      validation: (Rule) =>
        Rule.required()
          .min(60)
          .max(300)
          .warning("Aim for 1-2 concise sentences"),
    }),
    defineField({
      name: "summaryTh",
      title: "Summary (TH)",
      type: "text",
      fieldset: "content",
      rows: 3,
      description: "Thai summary shown on cards/previews when viewing TH.",
    }),
    defineField({
      name: "mainImage",
      title: "Main Image",
      type: "image",
      fieldset: "content",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      fieldset: "content",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "heroLayout",
      title: "Hero Layout",
      type: "string",
      fieldset: "content",
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
    }),
    defineField({
      name: "heroTheme",
      title: "Hero Theme",
      type: "string",
      fieldset: "content",
      options: {
        list: [
          { title: "Light", value: "light" },
          { title: "Dark", value: "dark" },
          { title: "Overlay", value: "overlay" },
        ],
        layout: "radio",
      },
      initialValue: "light",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent",
      fieldset: "content",
    }),
    defineField({
      name: "bodyTh",
      title: "Body (TH)",
      type: "blockContent",
      fieldset: "content",
      description: "Thai body content. Optional; falls back to English if empty.",
    }),
    defineField({
      name: "whyItMatters",
      title: "Why it matters",
      type: "text",
      rows: 2,
      fieldset: "education",
      description: "One to two sentences that explain the stakes and payoff.",
    }),
    defineField({
      name: "level",
      title: "Level",
      type: "string",
      fieldset: "education",
      description: "Preferred label for learning scaffolding; falls back to Difficulty.",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
        layout: "radio",
      },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const doc = context.document as { insightType?: string; difficulty?: string } | undefined;
          if (!isKnowledgeInsight(doc)) return true;
          if (value || doc?.difficulty) return true;
          return "Select a level (or set Difficulty) for knowledge articles.";
        }),
    }),
    defineField({
      name: "timeToCompleteMinutes",
      title: "Time to complete (minutes)",
      type: "number",
      fieldset: "education",
      description: "Whole minutes; leave blank to fall back to calculated reading time.",
      validation: (Rule) => Rule.min(1).integer().warning("Use whole minutes."),
    }),
    defineField({
      name: "difficulty",
      title: "Difficulty",
      type: "string",
      fieldset: "education",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
        layout: "radio",
      },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const type = (context.document as { insightType?: string } | undefined)
            ?.insightType;
          if (!knowledgeInsightTypes.has(type || "")) return true;
          if (value) return true;
          const level = (context.document as { level?: string } | undefined)?.level;
          return level ? true : "Difficulty or Level is required for knowledge articles";
        }),
      description:
        "Difficulty is required for knowledge article types (product knowledge, comparisons, problem knowledge). If Level is set, that value is preferred.",
    }),
    defineField({
      name: "estimatedTime",
      title: "Estimated Time",
      type: "string",
      fieldset: "education",
      description: "Total time for the learner (e.g., “30–45 min”).",
    }),
    defineField({
      name: "readingTime",
      title: "Reading Time (minutes)",
      type: "number",
      fieldset: "education",
      description: "Estimated minutes to read.",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "learningObjectives",
      title: "Learning Objectives",
      type: "array",
      fieldset: "education",
      of: [defineArrayMember({ type: "string" })],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const type = (context.document as { insightType?: string } | undefined)
            ?.insightType;
          if (!knowledgeInsightTypes.has(type || "")) return true;
          if (!Array.isArray(value) || value.length === 0) {
            return "Add at least one learning objective for knowledge articles";
          }
          return true;
        }),
    }),
    defineField({
      name: "prerequisites",
      title: "Prerequisites",
      type: "array",
      fieldset: "education",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "keyTakeaways",
      title: "Key Takeaways",
      type: "array",
      fieldset: "education",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "faq",
      title: "FAQ",
      type: "array",
      fieldset: "education",
      of: [
        defineArrayMember({
          name: "faqItem",
          title: "FAQ Item",
          type: "object",
          fields: [
            defineField({
              name: "question",
              title: "Question",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "answer",
              title: "Answer",
              type: "text",
              rows: 3,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "question",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "glossary",
      title: "Glossary",
      type: "array",
      fieldset: "education",
      of: [
        defineArrayMember({
          name: "glossaryItem",
          title: "Term",
          type: "object",
          fields: [
            defineField({
              name: "term",
              title: "Term",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "definition",
              title: "Definition",
              type: "text",
              rows: 2,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "term",
              subtitle: "definition",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "references",
      title: "References / Sources",
      type: "array",
      fieldset: "education",
      of: [
        defineArrayMember({
          name: "referenceItem",
          title: "Reference",
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Title / Label",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "publisher",
              title: "Publisher",
              type: "string",
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (Rule) =>
                Rule.uri({
                  allowRelative: false,
                  scheme: ["http", "https"],
                }),
            }),
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "publisher",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "knowledgePack",
      title: "Knowledge Pack",
      type: "object",
      fieldset: "resources",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "title",
          title: "Pack Title",
          type: "string",
        }),
        defineField({
          name: "description",
          title: "Description",
          type: "text",
          rows: 3,
        }),
        defineField({
          name: "isFree",
          title: "Free download",
          type: "boolean",
          initialValue: true,
        }),
        defineField({
          name: "requireEmail",
          title: "Require email to access",
          type: "boolean",
          initialValue: false,
          description: "Default is ungated.",
        }),
        defineField({
          name: "assets",
          title: "Assets (PDF, ZIP, templates)",
          type: "array",
          of: [
            defineArrayMember({
              name: "packAsset",
              title: "Asset",
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "file",
                  title: "File",
                  type: "file",
                  options: { storeOriginalFilename: true },
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: {
                  title: "label",
                  file: "file.asset.originalFilename",
                },
                prepare({ title, file }) {
                  return {
                    title: title || file || "Asset",
                    subtitle: file,
                  };
                },
              },
            }),
          ],
        }),
        defineField({
          name: "links",
          title: "External resources",
          type: "array",
          of: [
            defineArrayMember({
              name: "packLink",
              title: "Resource",
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "url",
                  title: "URL",
                  type: "url",
                  validation: (Rule) =>
                    Rule.uri({ allowRelative: false, scheme: ["http", "https"] }).required(),
                }),
                defineField({
                  name: "publisher",
                  title: "Publisher",
                  type: "string",
                }),
              ],
              preview: {
                select: {
                  title: "label",
                  subtitle: "url",
                },
              },
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.custom(knowledgePackValidation),
    }),
    defineField({
      name: "companionPack",
      title: "Companion knowledge pack",
      type: "reference",
      fieldset: "resources",
      to: [{ type: "knowledgePack" }],
      description: "Optional pack promoted alongside this insight.",
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      fieldset: "metadata",
      to: [{ type: "insightAuthor" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "reviewer",
      title: "Reviewer",
      type: "reference",
      fieldset: "metadata",
      to: [{ type: "insightAuthor" }],
      description: "Optional reviewer for quality signals.",
    }),
    defineField({
      name: "lastReviewedAt",
      title: "Last Reviewed At",
      type: "datetime",
      fieldset: "metadata",
    }),
    defineField({
      name: "nextReviewDate",
      title: "Next Review Date",
      type: "datetime",
      fieldset: "metadata",
      description: "Schedule refresh for freshness tracking.",
    }),
    defineField({
      name: "reviewCadence",
      title: "Review Cadence",
      type: "string",
      fieldset: "metadata",
      description: 'e.g., "Quarterly", "Annual", or "On release".',
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      fieldset: "metadata",
      initialValue: "draft",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Published", value: "published" },
          { title: "Archived", value: "archived" },
        ],
      },
    }),
    defineField({
      name: "editorialStatus",
      title: "Editorial Status",
      type: "string",
      fieldset: "metadata",
      options: {
        list: [
          { title: "Needs Review", value: "needsReview" },
          { title: "Fact Checked", value: "factChecked" },
          { title: "Evergreen", value: "evergreen" },
        ],
      },
    }),
    defineField({
      name: "accuracyNotes",
      title: "Accuracy Notes",
      type: "text",
      rows: 3,
      fieldset: "metadata",
      description: "Internal notes on precision, assumptions, or caveats.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      fieldset: "metadata",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      fieldset: "metadata",
    }),
    ...buildBannerFields({ initialPlacement: "insightpagehero", fieldset: "metadata" }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      fieldset: "relationships",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "insightCategory" }],
          options: { disableNew: true },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((value) => {
          if (!Array.isArray(value) || value.length === 0) {
            return "Select at least one category";
          }
          return true;
        }),
    }),
    defineField({
      name: "primaryCategory",
      title: "Primary Category",
      type: "reference",
      fieldset: "relationships",
      to: [{ type: "insightCategory" }],
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      fieldset: "relationships",
      of: [defineArrayMember({ type: "string" })],
      validation: (Rule) => Rule.max(5),
      options: {
        layout: "tags",
      },
      description: "Controlled vocabulary; limit to 5 tags.",
    }),
    defineField({
      name: "linkedProducts",
      title: "Linked Products",
      type: "array",
      fieldset: "relationships",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
          options: { disableNew: true },
        }),
      ],
      description: "Products mentioned or featured in the insight.",
    }),
    defineField({
      name: "linkedInsights",
      title: "Linked Insights",
      type: "array",
      fieldset: "relationships",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "insight" }],
          options: { disableNew: true },
        }),
      ],
      description: "Manual cross-links to related insights.",
    }),
    defineField({
      name: "pillarPage",
      title: "Pillar Page",
      type: "reference",
      fieldset: "relationships",
      to: [{ type: "insight" }],
      options: { disableNew: true },
      description: "Optional pillar page this insight supports.",
    }),
    defineField({
      name: "primaryKeyword",
      title: "Primary Keyword",
      type: "string",
      fieldset: "seo",
    }),
    defineField({
      name: "primaryKeywordVolume",
      title: "Primary Keyword Volume",
      type: "number",
      fieldset: "seo",
    }),
    defineField({
      name: "primaryKeywordDifficulty",
      title: "Primary Keyword Difficulty",
      type: "number",
      fieldset: "seo",
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: "secondaryKeywords",
      title: "Secondary Keywords",
      type: "array",
      fieldset: "seo",
      of: [
        defineArrayMember({
          name: "secondaryKeyword",
          title: "Secondary Keyword",
          type: "object",
          fields: [
            defineField({
              name: "keyword",
              title: "Keyword",
              type: "string",
            }),
            defineField({
              name: "volume",
              title: "Search Volume",
              type: "number",
            }),
            defineField({
              name: "difficulty",
              title: "Keyword Difficulty",
              type: "number",
              validation: (Rule) => Rule.min(0).max(100),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "seoMetadata",
      title: "SEO Metadata",
      type: "reference",
      fieldset: "seo",
      to: [{ type: "seoMetadata" }],
    }),
    defineField({
      name: "solutionMaturity",
      title: "Solution Maturity",
      type: "string",
      fieldset: "solutions",
      options: {
        list: [
          { title: "Proven", value: "proven" },
          { title: "Tested", value: "tested" },
          { title: "Emerging", value: "emerging" },
        ],
      },
      hidden: ({ parent }) => !isSolutionInsight(parent),
    }),
    defineField({
      name: "solutionComplexity",
      title: "Solution Complexity",
      type: "string",
      fieldset: "solutions",
      options: {
        list: [
          { title: "Quick Win", value: "quickWin" },
          { title: "Standard", value: "standard" },
          { title: "Enterprise", value: "enterprise" },
        ],
      },
      hidden: ({ parent }) => !isSolutionInsight(parent),
    }),
    defineField({
      name: "implementationTimeline",
      title: "Implementation Timeline",
      type: "string",
      fieldset: "solutions",
      description: 'e.g., "4-8 weeks"',
      hidden: ({ parent }) => !isSolutionInsight(parent),
    }),
    defineField({
      name: "clientContext",
      title: "Client Context",
      type: "object",
      fieldset: "solutions",
      hidden: ({ parent }) => !isSolutionInsight(parent),
      fields: [
        defineField({
          name: "clientName",
          title: "Client Name",
          type: "string",
        }),
        defineField({
          name: "industry",
          title: "Industry",
          type: "string",
        }),
        defineField({
          name: "challengeDescription",
          title: "Challenge Description",
          type: "text",
          rows: 3,
        }),
        defineField({
          name: "solutionDescription",
          title: "Solution Description",
          type: "text",
          rows: 3,
        }),
      ],
    }),
    defineField({
      name: "metrics",
      title: "Metrics",
      type: "array",
      fieldset: "solutions",
      hidden: ({ parent }) => !isSolutionInsight(parent),
      of: [
        defineArrayMember({
          name: "metric",
          title: "Metric",
          type: "object",
          fields: [
            defineField({
              name: "metricLabel",
              title: "Metric Label",
              type: "string",
              description: 'e.g., "ROI"',
            }),
            defineField({
              name: "metricValue",
              title: "Metric Value",
              type: "string",
              description: 'e.g., "240%"',
            }),
            defineField({
              name: "metricDescription",
              title: "Metric Description",
              type: "string",
            }),
          ],
          preview: {
            select: {
              title: "metricLabel",
              subtitle: "metricValue",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "solutionProducts",
      title: "Solution Products",
      type: "array",
      fieldset: "solutions",
      hidden: ({ parent }) => !isSolutionInsight(parent),
      of: [
        defineArrayMember({
          name: "solutionProduct",
          title: "Solution Product",
          type: "object",
          fields: [
            defineField({
              name: "product",
              title: "Product",
              type: "reference",
              to: [{ type: "product" }],
              options: { disableNew: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "quantity",
              title: "Quantity",
              type: "number",
              initialValue: 1,
              validation: (Rule) => Rule.min(1),
            }),
            defineField({
              name: "isRequired",
              title: "Required?",
              type: "boolean",
              initialValue: true,
              description: "Required vs optional in the bundle.",
            }),
            defineField({
              name: "notes",
              title: "Notes",
              type: "string",
              description: "Implementation notes or special considerations.",
            }),
          ],
          preview: {
            select: {
              title: "product.title",
              subtitle: "notes",
            },
          },
        }),
      ],
      description: "Products included in this solution bundle.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      insightType: "insightType",
      author: "author.name",
      media: "mainImage",
      status: "status",
      knowledgePackTitle: "knowledgePack.title",
      knowledgePackAssets: "knowledgePack.assets",
    },
    prepare(selection) {
      const {
        title,
        insightType,
        author,
        media,
        status,
        knowledgePackTitle,
        knowledgePackAssets,
      } = selection;
      const badgeLabel = insightType
        ? insightTypeLabels[insightType] ?? insightType
        : "Unclassified";
      const statusLabel = status ? status.charAt(0).toUpperCase() + status.slice(1) : null;
      const hasPack =
        Boolean(knowledgePackTitle) ||
        (Array.isArray(knowledgePackAssets) && knowledgePackAssets.length > 0);
      const badgeParts = [badgeLabel, statusLabel, hasPack ? "🎁 Pack" : null].filter(Boolean);

      return {
        title: title || "Untitled Insight",
        subtitle: author
          ? `${badgeParts.length ? `${badgeParts.join(" • ")} | ` : ""}By ${author}`
          : badgeParts.join(" • ") || undefined,
        media,
      };
    },
  },
});
