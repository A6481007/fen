import { defineArrayMember, defineField } from "sanity";

type TaxonomyDefaults = {
  contentType?: string;
  format?: string;
  availabilityStatus?: string;
};

type TaxonomyOptions = {
  defaults?: TaxonomyDefaults;
  group?: string;
  fieldset?: string;
};

export const LEVEL_OPTIONS = [
  { title: "Beginner", value: "beginner" },
  { title: "Intermediate", value: "intermediate" },
  { title: "Advanced", value: "advanced" },
  { title: "Expert", value: "expert" },
];

export const createTaxonomyFields = (options: TaxonomyOptions = {}) => {
  const { defaults, group, fieldset } = options;

  const withMeta = <T extends ReturnType<typeof defineField>>(field: T) => ({
    ...field,
    ...(group ? { group } : {}),
    ...(fieldset ? { fieldset } : {}),
  });

  return [
    withMeta(
      defineField({
        name: "contentType",
        title: "Content Type",
        type: "string",
        initialValue: defaults?.contentType,
        description: "Primary classification used for routing and filtering.",
      })
    ),
    withMeta(
      defineField({
        name: "format",
        title: "Format",
        type: "string",
        initialValue: defaults?.format,
        description: "Format identifier used in listing filters.",
      })
    ),
    withMeta(
      defineField({
        name: "availabilityStatus",
        title: "Availability",
        type: "string",
        initialValue: defaults?.availabilityStatus ?? "public",
        options: {
          list: [
            { title: "Public", value: "public" },
            { title: "Members Only", value: "members" },
            { title: "Internal", value: "internal" },
            { title: "Private", value: "private" },
            { title: "Archived", value: "archived" },
          ],
        },
        description: "Controls who can access this content in listings.",
      })
    ),
    withMeta(
      defineField({
        name: "industries",
        title: "Industries",
        type: "array",
        of: [defineArrayMember({ type: "string" })],
        options: { layout: "tags" },
        description: "Industries served (used for filtering).",
      })
    ),
    withMeta(
      defineField({
        name: "useCases",
        title: "Use cases",
        type: "array",
        of: [defineArrayMember({ type: "string" })],
        options: { layout: "tags" },
        description: "Use cases or scenarios this content supports.",
      })
    ),
  ];
};
