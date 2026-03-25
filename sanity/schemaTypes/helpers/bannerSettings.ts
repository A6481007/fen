import { defineField } from "sanity";
import { HERO_PLACEMENTS, getCtaStyleOptions, type BannerCtaStyleOption } from "../../../constants/bannerConfig";
import { validateCtaLabel } from "./ctaValidation";

type BannerFieldOptions = {
  initialPlacement?: string;
  group?: string;
  fieldset?: string;
};

const placementOptions = HERO_PLACEMENTS.map((placement: (typeof HERO_PLACEMENTS)[number]) => ({
  title: placement.label,
  value: placement.value,
}));

const ctaStyleOptions = getCtaStyleOptions().map((option: BannerCtaStyleOption) => ({
  title: option.label,
  value: option.value,
  description: option.description,
}));

export const buildBannerFields = (options: BannerFieldOptions = {}) => {
  const { initialPlacement = "sitewidepagehero", group, fieldset } = options;

  const withMeta = <T extends ReturnType<typeof defineField>>(field: T) => ({
    ...field,
    ...(group ? { group } : {}),
    ...(fieldset ? { fieldset } : {}),
  });

  return [
    withMeta(
      defineField({
        name: "publishAsBanner",
        title: "Publish as banner",
        type: "boolean",
        initialValue: false,
        description: "Enable to feature this entry as a hero banner in the selected placement.",
      })
    ),
    withMeta(
      defineField({
        name: "bannerSettings",
        title: "Banner settings",
        type: "object",
        hidden: ({ document }) => !document?.publishAsBanner,
        fields: [
          defineField({
            name: "bannerPlacement",
            title: "Placement",
            type: "string",
            initialValue: initialPlacement,
            options: {
              list: placementOptions,
            },
          }),
          defineField({
            name: "heroVariant",
            title: "Hero Variant",
            type: "string",
            initialValue: "light",
            options: {
              list: [
                { title: "Light", value: "light" },
                { title: "Dark", value: "dark" },
              ],
              layout: "radio",
            },
          }),
          defineField({
            name: "startDate",
            title: "Start date",
            type: "datetime",
            description: "Leave empty to publish immediately.",
          }),
          defineField({
            name: "endDate",
            title: "End date",
            type: "datetime",
            description: "Leave empty to keep the banner live indefinitely.",
            validation: (Rule) =>
              Rule.custom((value, context) => {
                if (!value) return true;
                const startDate = (context.document as { bannerSettings?: { startDate?: string } })?.bannerSettings
                  ?.startDate;
                if (startDate && new Date(value) < new Date(startDate)) {
                  return "End date must be after the start date.";
                }
                return true;
              }),
          }),
          defineField({
            name: "titleOverride",
            title: "Title override",
            type: "string",
          }),
          defineField({
            name: "descriptionOverride",
            title: "Description override",
            type: "text",
            rows: 2,
          }),
          defineField({
            name: "ctaLabel",
            title: "CTA label",
            type: "string",
            validation: (Rule) =>
              Rule.custom((value) => validateCtaLabel(value as string | undefined, { isPrimary: true })),
          }),
          defineField({
            name: "ctaStyle",
            title: "CTA style",
            type: "string",
            initialValue: "primary",
            options: {
              list: ctaStyleOptions,
              layout: "radio",
            },
          }),
          defineField({
            name: "ctaUrlOverride",
            title: "CTA URL override",
            type: "url",
          }),
        ],
      })
    ),
  ];
};
