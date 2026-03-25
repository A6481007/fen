export const isThaiLocale = (language?: string) =>
  typeof language === "string" && language.toLowerCase().startsWith("th");

export const pickLocalized = <T>(
  language: string | undefined,
  fallback: T | null | undefined,
  thai?: T | null | undefined
): T | null => {
  if (isThaiLocale(language)) {
    return (thai ?? fallback ?? null) as T | null;
  }
  return (fallback ?? thai ?? null) as T | null;
};
