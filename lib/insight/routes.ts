import type { Locale } from "@/lib/i18n/locales";

export type InsightRouteConfig = {
  root: string;
  knowledge: string;
  solutions: string;
  category: string;
  authors: string;
};

export const getInsightRouteConfig = (locale?: Locale | null): InsightRouteConfig => {
  if (locale) {
    return {
      root: `/${locale}/insights`,
      knowledge: `/${locale}/insights/knowledge`,
      solutions: `/${locale}/insights/solutions`,
      category: "/insight/category",
      authors: `/${locale}/authors`,
    };
  }

  return {
    root: "/insight",
    knowledge: "/insight/knowledge",
    solutions: "/insight/solutions",
    category: "/insight/category",
    authors: "/insight/author",
  };
};
