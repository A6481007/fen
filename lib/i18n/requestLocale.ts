import "server-only";

import { cookies, headers } from "next/headers";
import type { Locale } from "./locales";
import { normalizeLocaleCode } from "./normalizeLocale";

export const getRequestLocale = async (): Promise<Locale> => {
  const cookieLocale = (await cookies()).get("i18next")?.value;
  if (cookieLocale) return normalizeLocaleCode(cookieLocale);

  const acceptLanguage = (await headers()).get("accept-language") ?? "";
  const primary = acceptLanguage.split(",")[0];

  return normalizeLocaleCode(primary);
};

