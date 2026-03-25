export const locales = ["en", "th"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const isLocale = (value?: string | null): value is Locale =>
  locales.includes((value || "") as Locale);
