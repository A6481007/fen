import { defaultLocale, locales, type Locale } from "@/lib/i18n/locales";

export type LocaleOption = { value: Locale; label: string };

const localeLabels: Record<Locale, string> = {
  en: "English",
  th: "Thai",
};

export const localeOptions: LocaleOption[] = locales.map((code) => ({
  value: code,
  label: localeLabels[code] ?? code,
}));

export const defaultLocaleValue: Locale = defaultLocale;
