export function getPreviewUrl({
  kind,
  slug,
  locale,
}: {
  kind: "knowledge" | "solution";
  slug: { en?: string; th?: string };
  locale: "en" | "th";
}) {
  const s = slug[locale] || slug.en || "";
  const base = `/${locale}/insights/${kind === "knowledge" ? "knowledge" : "solutions"}`;
  return s ? `${base}/${s}` : base;
}
