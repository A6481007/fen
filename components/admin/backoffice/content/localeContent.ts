import type { PortableTextBlock } from "@/types/portableText";

export type LocaleContentFields = {
  title?: string | null;
  body?: PortableTextBlock[] | null | undefined;
};

export const hasPortableTextContent = (blocks?: PortableTextBlock[] | null | undefined) =>
  Array.isArray(blocks) &&
  blocks.some((block) => {
    const children = (block as { children?: { text?: string }[] }).children ?? [];
    return children.map((c) => c.text ?? "").join("").trim().length > 0;
  });

export const hasContent = (localeFields?: LocaleContentFields | null) => {
  if (!localeFields) return false;
  const title = (localeFields.title ?? "").trim();
  return Boolean(title) || hasPortableTextContent(localeFields.body);
};
