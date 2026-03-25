import { ImageIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

export const blockContentType = defineType({
  title: "Block Content",
  name: "blockContent",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal", value: "normal" },
        { title: "H1", value: "h1" },
        { title: "H2", value: "h2" },
        { title: "H3", value: "h3" },
        { title: "H4", value: "h4" },
        { title: "Quote", value: "blockquote" },
        { title: "Code", value: "code" },
      ],
      lists: [
        { title: "Bullet", value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Strong", value: "strong" },
          { title: "Emphasis", value: "em" },
          { title: "Underline", value: "underline" },
          { title: "Strike", value: "strike" },
          { title: "Code", value: "code" },
          { title: "Highlight", value: "highlight" },
        ],
        annotations: [
          {
            title: "URL",
            name: "link",
            type: "object",
            fields: [
              defineField({
                title: "URL",
                name: "href",
                type: "url",
                validation: (Rule) =>
                  Rule.uri({
                    allowRelative: false,
                    scheme: ["http", "https"],
                  }),
              }),
              defineField({
                name: "openInNewTab",
                title: "Open in new tab",
                type: "boolean",
                initialValue: true,
              }),
            ],
          },
          {
            title: "Recommended kit link",
            name: "recommendedKitLink",
            type: "object",
            fields: [
              defineField({
                name: "kit",
                title: "Recommended kit",
                type: "reference",
                to: [{ type: "recommendedKitLink" }],
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "label",
                title: "Override label",
                type: "string",
                description: "Optional text to display instead of the CTA label on the kit.",
              }),
            ],
            preview: {
              select: {
                title: "kit.title",
                subtitle: "label",
              },
              prepare({ title, subtitle }) {
                return {
                  title: title || "Recommended kit",
                  subtitle: subtitle || "Inline CTA",
                };
              },
            },
          },
        ],
      },
    }),
    defineArrayMember({
      name: "inlineImage",
      title: "Image with caption",
      type: "image",
      icon: ImageIcon,
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alternative Text",
          validation: (Rule) =>
            Rule.required().warning("Images need alt text for accessibility"),
        }),
        defineField({
          name: "caption",
          type: "string",
          title: "Caption",
        }),
        defineField({
          name: "credit",
          type: "string",
          title: "Credit / Source",
        }),
      ],
    }),
    defineArrayMember({
      name: "blockImage",
      title: "Inline image (layout controls)",
      type: "object",
      icon: ImageIcon,
      fields: [
        defineField({
          name: "image",
          title: "Image",
          type: "image",
          options: { hotspot: true },
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Required unless the image is decorative.",
          validation: (Rule) =>
            Rule.custom((value, context) => {
              const isDecorative = Boolean((context.parent as { isDecorative?: boolean })?.isDecorative);
              if (isDecorative) return true;
              return value && value.trim().length > 0 ? true : "Add alt text or mark as decorative.";
            }),
        }),
        defineField({
          name: "isDecorative",
          title: "Decorative image",
          type: "boolean",
          initialValue: false,
          description: "If checked, alt text will be empty for accessibility.",
        }),
        defineField({
          name: "caption",
          title: "Caption",
          type: "string",
        }),
        defineField({
          name: "alignment",
          title: "Alignment",
          type: "string",
          options: {
            list: [
              { title: "Full bleed", value: "full" },
              { title: "Wide", value: "wide" },
              { title: "Center", value: "center" },
              { title: "Left", value: "left" },
              { title: "Right", value: "right" },
            ],
            layout: "radio",
          },
          initialValue: "center",
        }),
        defineField({
          name: "width",
          title: "Width",
          type: "string",
          description: "Choose a relative width for the image block.",
          options: {
            list: [
              { title: "Small", value: "small" },
              { title: "Medium", value: "medium" },
              { title: "Large", value: "large" },
            ],
            layout: "radio",
          },
          initialValue: "large",
        }),
      ],
      preview: {
        select: {
          title: "caption",
          media: "image",
          alignment: "alignment",
          width: "width",
        },
        prepare({ title, media, alignment, width }) {
          return {
            title: title || "Image",
            subtitle: [alignment || "center", width || "medium"].filter(Boolean).join(" · "),
            media: media || ImageIcon,
          };
        },
      },
    }),
    defineArrayMember({
      name: "break",
      title: "Divider",
      type: "object",
      fields: [
        defineField({
          name: "label",
          title: "Label",
          type: "string",
          hidden: true,
          initialValue: "divider",
        }),
      ],
      preview: {
        prepare() {
          return {
            title: "Divider",
            subtitle: "Horizontal rule",
          };
        },
      },
    }),
    defineArrayMember({
      name: "callout",
      title: "Callout",
      type: "object",
      fields: [
        defineField({
          name: "variant",
          title: "Variant",
          type: "string",
          options: {
            list: [
              { title: "Note", value: "note" },
              { title: "Tip", value: "tip" },
              { title: "Warning", value: "warning" },
              { title: "Example", value: "example" },
              { title: "Definition", value: "definition" },
            ],
            layout: "radio",
          },
          initialValue: "note",
        }),
        defineField({
          name: "title",
          title: "Title",
          type: "string",
        }),
        defineField({
          name: "body",
          title: "Body",
          type: "array",
          of: [defineArrayMember({ type: "block" })],
        }),
      ],
      preview: {
        select: {
          title: "title",
          variant: "variant",
        },
        prepare({ title, variant }) {
          return {
            title: title || "Callout",
            subtitle: (variant as string) || "note",
          };
        },
      },
    }),
    defineArrayMember({
      name: "figure",
      title: "Figure",
      type: "object",
      fields: [
        defineField({
          name: "image",
          title: "Image",
          type: "image",
          options: { hotspot: true },
          validation: (Rule) => Rule.required(),
          fields: [
            defineField({
              name: "alt",
              type: "string",
              title: "Alternative Text",
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: "caption", type: "string", title: "Caption" }),
            defineField({ name: "credit", type: "string", title: "Credit / Source" }),
          ],
        }),
        defineField({
          name: "enableZoom",
          title: "Enable zoom link",
          type: "boolean",
          description: "Adds a link to open the full-size image in a new tab.",
          initialValue: false,
        }),
      ],
      preview: {
        select: {
          title: "image.caption",
          subtitle: "image.credit",
          media: "image",
        },
        prepare({ title, subtitle, media }) {
          return {
            title: title || "Figure",
            subtitle: subtitle || "Image + caption",
            media: media || ImageIcon,
          };
        },
      },
    }),
    defineArrayMember({
      name: "videoEmbed",
      title: "Video Embed",
      type: "object",
      fields: [
        defineField({
          name: "title",
          title: "Title",
          type: "string",
        }),
        defineField({
          name: "url",
          title: "Video URL (YouTube, Vimeo, or mp4)",
          type: "url",
          validation: (Rule) =>
            Rule.uri({
              allowRelative: false,
              scheme: ["http", "https"],
            }).required(),
        }),
        defineField({
          name: "poster",
          title: "Poster Image",
          type: "image",
          options: { hotspot: true },
        }),
        defineField({
          name: "transcript",
          title: "Transcript",
          type: "text",
          rows: 4,
        }),
      ],
      preview: {
        select: {
          title: "title",
          url: "url",
          media: "poster",
        },
        prepare({ title, url, media }) {
          return {
            title: title || "Video",
            subtitle: url,
            media: media || ImageIcon,
          };
        },
      },
    }),
    defineArrayMember({
      name: "videoBlock",
      title: "Video",
      type: "object",
      fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({
          name: "url",
          title: "Video URL (YouTube, Vimeo, or mp4)",
          type: "url",
          validation: (Rule) =>
            Rule.uri({
              allowRelative: false,
              scheme: ["http", "https"],
            }).required(),
        }),
        defineField({
          name: "transcriptUrl",
          title: "Transcript URL",
          type: "url",
          validation: (Rule) =>
            Rule.uri({
              allowRelative: false,
              scheme: ["http", "https"],
            }),
        }),
        defineField({
          name: "poster",
          title: "Poster Image",
          type: "image",
          options: { hotspot: true },
        }),
        defineField({
          name: "keyMoments",
          title: "Key moments",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "keyMoment",
              title: "Key moment",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "timestamp",
                  title: "Timestamp",
                  type: "string",
                  description: "mm:ss or hh:mm:ss",
                  validation: (Rule) =>
                    Rule.regex(/^[0-9]{1,2}:[0-5][0-9](?::[0-5][0-9])?$/, {
                      name: "timestamp",
                      invert: false,
                    }).warning("Use mm:ss or hh:mm:ss"),
                }),
                defineField({
                  name: "description",
                  title: "Description",
                  type: "text",
                  rows: 2,
                }),
              ],
              preview: {
                select: { title: "label", subtitle: "timestamp" },
              },
            }),
          ],
        }),
      ],
      preview: {
        select: {
          title: "title",
          url: "url",
          media: "poster",
        },
        prepare({ title, url, media }) {
          return {
            title: title || "Video",
            subtitle: url,
            media: media || ImageIcon,
          };
        },
      },
    }),
    defineArrayMember({
      name: "stepList",
      title: "Step-by-step",
      type: "object",
      fields: [
        defineField({
          name: "title",
          title: "Section Title",
          type: "string",
        }),
        defineField({
          name: "steps",
          title: "Steps",
          type: "array",
          of: [
            defineArrayMember({
              name: "step",
              title: "Step",
              type: "object",
              fields: [
                defineField({
                  name: "title",
                  title: "Title",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "description",
                  title: "Description",
                  type: "text",
                  rows: 3,
                }),
                defineField({
                  name: "duration",
                  title: "Duration / Effort",
                  type: "string",
                  description: 'e.g., "5 min" or "2 hours"',
                }),
              ],
              preview: {
                select: {
                  title: "title",
                  subtitle: "duration",
                },
              },
            }),
          ],
          validation: (Rule) => Rule.required().min(1),
        }),
      ],
      preview: {
        select: {
          title: "title",
          steps: "steps",
        },
        prepare({ title, steps }) {
          const count = Array.isArray(steps) ? steps.length : 0;
          return {
            title: title || "Step list",
            subtitle: `${count} step${count === 1 ? "" : "s"}`,
          };
        },
      },
    }),
    defineArrayMember({
      name: "stepByStep",
      title: "Step-by-step (detailed)",
      type: "object",
      fields: [
        defineField({
          name: "title",
          title: "Section Title",
          type: "string",
        }),
        defineField({
          name: "steps",
          title: "Steps",
          type: "array",
          of: [
            defineArrayMember({
              name: "step",
              title: "Step",
              type: "object",
              fields: [
                defineField({
                  name: "title",
                  title: "Title",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "body",
                  title: "Body",
                  type: "array",
                  of: [defineArrayMember({ type: "block" })],
                }),
                defineField({
                  name: "media",
                  title: "Supporting image",
                  type: "image",
                  options: { hotspot: true },
                }),
                defineField({
                  name: "duration",
                  title: "Duration / Effort",
                  type: "string",
                  description: 'e.g., "5 min" or "2 hours"',
                }),
              ],
              preview: {
                select: {
                  title: "title",
                  subtitle: "duration",
                  media: "media",
                },
              },
            }),
          ],
          validation: (Rule) => Rule.required().min(1),
        }),
      ],
      preview: {
        select: {
          title: "title",
          steps: "steps",
        },
        prepare({ title, steps }) {
          const count = Array.isArray(steps) ? steps.length : 0;
          return {
            title: title || "Step-by-step",
            subtitle: `${count} step${count === 1 ? "" : "s"}`,
          };
        },
      },
    }),
    defineArrayMember({
      name: "knowledgeCheck",
      title: "Knowledge Check",
      type: "object",
      fields: [
        defineField({
          name: "question",
          title: "Question",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "options",
          title: "Options",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              fields: [
                defineField({
                  name: "text",
                  title: "Answer option",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "isCorrect",
                  title: "Correct answer",
                  type: "boolean",
                  initialValue: false,
                }),
              ],
              preview: {
                select: {
                  title: "text",
                  isCorrect: "isCorrect",
                },
                prepare({ title, isCorrect }) {
                  return {
                    title: title || "Answer",
                    subtitle: isCorrect ? "Correct" : "Distractor",
                  };
                },
              },
            }),
          ],
          validation: (Rule) =>
            Rule.required()
              .min(2)
              .error("Add at least two answer options for a knowledge check"),
        }),
        defineField({
          name: "explanation",
          title: "Explanation",
          type: "text",
          rows: 3,
        }),
      ],
      preview: {
        select: {
          title: "question",
        },
        prepare({ title }) {
          return {
            title: title || "Knowledge check",
            subtitle: "Quiz",
          };
        },
      },
    }),
    defineArrayMember({
      name: "quiz",
      title: "Quiz",
      type: "object",
      fields: [
        defineField({
          name: "question",
          title: "Question",
          type: "text",
          rows: 2,
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "answers",
          title: "Answers",
          type: "array",
          of: [defineArrayMember({ type: "string" })],
          validation: (Rule) => Rule.required().min(2),
        }),
        defineField({
          name: "correctAnswerIndex",
          title: "Correct answer (index)",
          type: "number",
          validation: (Rule) =>
            Rule.required()
              .min(0)
              .custom((value, context) => {
                const answers = (context.parent as { answers?: unknown[] } | undefined)?.answers;
                if (!Array.isArray(answers) || typeof value !== "number") return true;
                return value >= 0 && value < answers.length
                  ? true
                  : "Select the index of one of the answers above";
              }),
        }),
        defineField({
          name: "explanation",
          title: "Explanation",
          type: "text",
          rows: 3,
        }),
        defineField({
          name: "linksToSections",
          title: "Links to sections",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "targetId",
                  title: "Section ID or URL",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
              ],
              preview: {
                select: { title: "label", subtitle: "targetId" },
              },
            }),
          ],
        }),
      ],
      preview: {
        select: {
          title: "question",
        },
        prepare({ title }) {
          return {
            title: title || "Quiz",
            subtitle: "Multiple choice",
          };
        },
      },
    }),
    defineArrayMember({
      name: "comparisonTable",
      title: "Comparison table",
      type: "object",
      fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({
          name: "description",
          title: "Description",
          type: "text",
          rows: 3,
        }),
        defineField({
          name: "columns",
          title: "Columns",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "column",
              fields: [
                defineField({
                  name: "key",
                  title: "Key",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "align",
                  title: "Alignment",
                  type: "string",
                  options: {
                    list: [
                      { title: "Left", value: "left" },
                      { title: "Center", value: "center" },
                      { title: "Right", value: "right" },
                    ],
                    layout: "radio",
                  },
                  initialValue: "left",
                }),
              ],
            }),
          ],
          validation: (Rule) => Rule.required().min(2),
        }),
        defineField({
          name: "rows",
          title: "Rows",
          type: "array",
          of: [
            defineArrayMember({
              type: "object",
              name: "row",
              fields: [
                defineField({
                  name: "key",
                  title: "Row key",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "label",
                  title: "Row label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "cells",
                  title: "Cells",
                  type: "array",
                  of: [
                    defineArrayMember({
                      type: "object",
                      fields: [
                        defineField({
                          name: "columnKey",
                          title: "Column key",
                          type: "string",
                          validation: (Rule) => Rule.required(),
                        }),
                        defineField({
                          name: "value",
                          title: "Value",
                          type: "string",
                        }),
                        defineField({
                          name: "emphasis",
                          title: "Emphasis",
                          type: "string",
                          description: "Optional tag shown under the cell.",
                        }),
                      ],
                    }),
                  ],
                }),
                defineField({
                  name: "highlight",
                  title: "Highlight row",
                  type: "boolean",
                  initialValue: false,
                }),
              ],
            }),
          ],
          validation: (Rule) => Rule.required().min(1),
        }),
        defineField({
          name: "footnote",
          title: "Footnote",
          type: "string",
        }),
      ],
      preview: {
        select: {
          title: "title",
          rows: "rows",
        },
        prepare({ title, rows }) {
          const count = Array.isArray(rows) ? rows.length : 0;
          return {
            title: title || "Comparison table",
            subtitle: `${count} row${count === 1 ? "" : "s"}`,
          };
        },
      },
    }),
    defineArrayMember({
      name: "resourcePackEmbed",
      title: "Resource pack embed",
      type: "object",
      fields: [
        defineField({
          name: "knowledgePack",
          title: "Knowledge pack",
          type: "reference",
          to: [{ type: "knowledgePack" }],
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "ctaLabel",
          title: "CTA label",
          type: "string",
          initialValue: "View resources",
        }),
      ],
      preview: {
        select: {
          title: "knowledgePack.title",
          subtitle: "ctaLabel",
          media: "knowledgePack.mainImage",
        },
        prepare({ title, subtitle, media }) {
          return {
            title: title || "Resource pack",
            subtitle: subtitle || "Knowledge pack embed",
            media: media || ImageIcon,
          };
        },
      },
    }),
    defineArrayMember({
      name: "productInlineCta",
      title: "Product or bundle CTA",
      type: "object",
      fields: [
        defineField({
          name: "target",
          title: "Product or solution bundle",
          type: "reference",
          to: [{ type: "product" }, { type: "solutionBundle" }],
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "ctaLabel",
          title: "CTA label",
          type: "string",
          initialValue: "View details",
        }),
        defineField({
          name: "eyebrow",
          title: "Eyebrow",
          type: "string",
        }),
        defineField({
          name: "body",
          title: "Body",
          type: "text",
          rows: 3,
        }),
      ],
      preview: {
        select: {
          title: "ctaLabel",
          targetTitle: "target.title",
        },
        prepare({ title, targetTitle }) {
          return {
            title: title || "Product CTA",
            subtitle: targetTitle || "Product or bundle",
          };
        },
      },
    }),
  ],
});
