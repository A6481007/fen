import { defaultLocale, isLocale, type Locale } from "./locales";

// Normalize any language tag (e.g., "en-US", "th_TH") to a supported Locale.
export const normalizeLocaleCode = (value?: string | null): Locale => {
  const raw = (value ?? "").trim();
  const base = raw.split(/[-_]/)[0]?.toLowerCase() || defaultLocale;
  return isLocale(base) ? (base as Locale) : defaultLocale;
};

