import { cookies, headers } from "next/headers";
import type { Metadata } from "next";

export type LocalizedMetadataMap = Record<string, Metadata>;

const resolveLocale = async () => {
  const cookieLocale = (await cookies()).get("i18next")?.value?.toLowerCase();
  if (cookieLocale?.startsWith("th")) return "th";
  if (cookieLocale?.startsWith("en")) return "en";

  const acceptLanguage =
    (await headers()).get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.startsWith("th") ? "th" : "en";
};

export const getMetadataForLocale = async (
  map: LocalizedMetadataMap
): Promise<Metadata> => {
  const locale = await resolveLocale();
  return map[locale] ?? map.en ?? map.th ?? {};
};
