'use client';

type UnknownRecord = Record<string, unknown>;

export type LocaleFieldMap = Record<string, Record<string, string[]>>;

export const LOCALE_FIELD_REQUIREMENTS: LocaleFieldMap = {
  insight: {
    en: ['title', 'summary', 'body'],
    th: ['titleTh', 'summaryTh', 'bodyTh'],
  },
  news: {
    en: ['title', 'excerpt', 'content'],
    th: ['titleTh', 'excerptTh', 'contentTh'],
  },
  event: {
    en: ['title', 'description'],
    th: ['titleTh', 'descriptionTh'],
  },
};

const getValueAtPath = (source: UnknownRecord, path: string): unknown => {
  const segments = path.split('.').filter(Boolean);
  let current: unknown = source;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as UnknownRecord)[segment];
  }

  return current;
};

const hasPortableTextContent = (value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return false;

  return value.some((block) => {
    if (!block || typeof block !== 'object') return false;
    const children = Array.isArray((block as { children?: unknown }).children)
      ? ((block as { children?: Array<{ text?: string }> }).children ?? [])
      : [];
    const childText = children.map((child) => (child?.text ?? '').trim()).join('');
    const directText = (block as { text?: string }).text ?? '';
    return Boolean(childText.trim() || directText.trim());
  });
};

const hasArrayContent = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  if (hasPortableTextContent(value)) return true;

  return value.some((item) => {
    if (typeof item === 'string') return item.trim().length > 0;
    if (item && typeof item === 'object') return true;
    return Boolean(item);
  });
};

const isFieldFilled = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return hasArrayContent(value);
  if (value && typeof value === 'object') return true;
  return Boolean(value);
};

/**
 * A locale is "complete" when every required field for that locale
 * is non-null, non-empty, and—when applicable—contains non-empty text blocks.
 */
export const getLocaleCompleteness = (
  document: UnknownRecord | null | undefined,
  locale: string,
  requiredFields: string[],
): boolean => {
  if (!document || !requiredFields?.length) return false;
  return requiredFields.every((path) => isFieldFilled(getValueAtPath(document, path)));
};

export const getLocaleLabel = (locale: string) => {
  if (locale.toLowerCase() === 'th') return 'Thai';
  if (locale.toLowerCase() === 'en') return 'English';
  return locale.toUpperCase();
};
