import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locales";

const LOCALE_COOKIE_KEYS = ["NEXT_LOCALE", "locale", "i18next"] as const;

const normalizeLocale = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

type LanguageCandidate = { lang: string; quality: number };

const parseAcceptLanguage = (headerValue: string): LanguageCandidate[] => {
  return headerValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [langPart, qualityPart] = part.split(";q=");
      const quality = qualityPart ? Number.parseFloat(qualityPart) : 1;
      return {
        lang: langPart.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .sort((a, b) => b.quality - a.quality);
};

export const detectLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  for (const key of LOCALE_COOKIE_KEYS) {
    const value = cookieStore.get(key)?.value;
    const normalized = normalizeLocale(value);
    if (normalized && isLocale(normalized)) {
      return normalized;
    }
  }

  const acceptLanguage = (await headers()).get("accept-language") || "";
  const candidates = parseAcceptLanguage(acceptLanguage);
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate.lang);
    if (normalized && isLocale(normalized)) {
      return normalized;
    }
  }

  return defaultLocale;
};
