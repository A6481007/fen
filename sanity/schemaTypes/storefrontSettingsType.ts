import { HomeIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const storefrontSettingsType = defineType({
  name: "storefrontSettings",
  title: "Storefront Settings",
  type: "document",
  icon: HomeIcon,
  fields: [
    defineField({
      name: "heroBannerSlider",
      title: "Homepage Hero Banner Slider",
      type: "object",
      description:
        "Full-bleed collage hero for the storefront homepage. Configure slides, accent colors, and product cutout positions.",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "slides",
          title: "Slides",
          type: "array",
          description:
            "3–6 is ideal. Uses category slug to build links automatically. Overflow of product pins is intentionally clipped on small screens.",
          validation: (Rule) => Rule.min(1).max(8),
          of: [
            defineField({
              name: "slide",
              title: "Slide",
              type: "object",
              fields: [
                defineField({
                  name: "categoryTitle",
                  title: "Category Title",
                  type: "string",
                  description: "Shown in uppercase with wide tracking (e.g., NETWORKING).",
                  validation: (Rule) => Rule.required().min(2).max(80),
                }),
                defineField({
                  name: "categorySlug",
                  title: "Category Slug",
                  type: "slug",
                  description:
                    "Slug used to build the category URL (/catelog/product-category/{slug}). Link is derived automatically.",
                  validation: (Rule) => Rule.required(),
                  options: {
                    source: "categoryTitle",
                    maxLength: 96,
                  },
                }),
                defineField({
                  name: "accentHex",
                  title: "Accent Background Hex",
                  type: "string",
                  description: "Strong accent background color (e.g., #E60023).",
                  validation: (Rule) => Rule.required().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-digit hex color"),
                }),
                defineField({
                  name: "textColorHex",
                  title: "Text Color Hex",
                  type: "string",
                  description: "Optional text color override. Defaults to white.",
                  validation: (Rule) =>
                    Rule.custom((val) => {
                      if (!val) return true;
                      return /^#[0-9A-Fa-f]{6}$/.test(val)
                        ? true
                        : "Use a 6-digit hex color like #FFFFFF.";
                    }),
                }),
                defineField({
                  name: "subtitle",
                  title: "Subtitle",
                  type: "string",
                  description: "Optional supporting line under the category title.",
                }),
                defineField({
                  name: "showCta",
                  title: "Show CTA",
                  type: "boolean",
                  initialValue: true,
                }),
                defineField({
                  name: "ctaLabel",
                  title: "CTA Label",
                  type: "string",
                  description: 'Defaults to "View All" when left blank.',
                }),
                defineField({
                  name: "backgroundImage",
                  title: "Background Image",
                  type: "image",
                  options: { hotspot: true },
                  description: "Optional ambient texture behind product cutouts.",
                }),
                defineField({
                  name: "products",
                  title: "Product Pins",
                  type: "array",
                  description:
                    "Place transparent PNGs on the slide canvas. top/left are percentages of the slide. Test on desktop & mobile—pins may be partially cropped by design.",
                  validation: (Rule) => Rule.required().min(1).max(8),
                  of: [
                    defineField({
                      name: "product",
                      title: "Product",
                      type: "object",
                      fields: [
                        defineField({
                          name: "modelNumber",
                          title: "Model Number",
                          type: "string",
                          validation: (Rule) => Rule.required().min(2).max(80),
                        }),
                        defineField({
                          name: "image",
                          title: "Image (transparent PNG recommended)",
                          type: "image",
                          options: { hotspot: true },
                          validation: (Rule) => Rule.required(),
                        }),
                        defineField({
                          name: "imageAlt",
                          title: "Image Alt",
                          type: "string",
                          description: "Optional alt text; pins are decorative in the carousel UI.",
                        }),
                        defineField({
                          name: "top",
                          title: "Top",
                          type: "string",
                          description: 'Percent from the top of the slide (e.g., "12%").',
                          validation: (Rule) =>
                            Rule.required().regex(/^[0-9]+(\.[0-9]+)?%$/, {
                              name: "percentage",
                              invert: false,
                              message: "Use percent values like 10% or 33.5%.",
                            }),
                        }),
                        defineField({
                          name: "left",
                          title: "Left",
                          type: "string",
                          description: 'Percent from the left of the slide (e.g., "18%").',
                          validation: (Rule) =>
                            Rule.required().regex(/^[0-9]+(\.[0-9]+)?%$/, {
                              name: "percentage",
                              invert: false,
                              message: "Use percent values like 10% or 33.5%.",
                            }),
                        }),
                        defineField({
                          name: "imageWidth",
                          title: "Image Width (px)",
                          type: "number",
                          description: "Displayed pixel width. 3–6 pins at 160–280px each work best.",
                          validation: (Rule) => Rule.required().min(60).max(420),
                        }),
                      ],
                      preview: {
                        select: {
                          title: "modelNumber",
                          media: "image",
                          subtitle: "imageWidth",
                        },
                        prepare({ title, media, subtitle }) {
                          return {
                            title: title || "Product pin",
                            subtitle: subtitle ? `${subtitle}px wide` : "Sized by width",
                            media,
                          };
                        },
                      },
                    }),
                  ],
                }),
              ],
              preview: {
                select: {
                  title: "categoryTitle",
                  subtitle: "subtitle",
                  media: "backgroundImage",
                },
                prepare({ title, subtitle, media }) {
                  return {
                    title: title || "Untitled slide",
                    subtitle: subtitle || "Hero banner slide",
                    media,
                  };
                },
              },
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: "Storefront Settings", subtitle: "Homepage hero slider" };
    },
  },
});
