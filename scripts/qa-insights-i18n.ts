import { client } from "../sanity/lib/client";
import { locales, defaultLocale } from "../lib/i18n/locales";

type Locale = (typeof locales)[number];

type InsightRecord = {
  slug?: string | null;
  title?: string | null;
  insightType?: string | null;
  publishedAt?: string | null;
  _updatedAt?: string | null;
};

type CategoryRecord = {
  slug?: string | null;
  title?: string | null;
  categoryType?: string | null;
};

const KNOWLEDGE_TYPES = new Set([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

const SOLUTION_TYPES = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const INSIGHTS_GROQ = `
  *[
    _type == "insight" &&
    status == "published" &&
    locale->code == $lang &&
    defined(slug.current)
  ]{
    "slug": slug.current,
    title,
    insightType,
    publishedAt,
    _updatedAt
  }
`;

const CATEGORIES_GROQ = `
  *[
    _type == "insightCategory" &&
    isActive == true &&
    locale->code == $lang &&
    defined(slug.current)
  ]{
    "slug": slug.current,
    title,
    categoryType
  }
`;

const MAX_LIST = Number(process.env.QA_LIST_LIMIT || "50");

const formatList = (items: string[]) => {
  if (!items.length) return "none";
  const sliced = items.slice(0, MAX_LIST);
  const suffix = items.length > MAX_LIST ? ` … +${items.length - MAX_LIST} more` : "";
  return `${sliced.join(", ")}${suffix}`;
};

const countByKind = (items: InsightRecord[]) => {
  const counts = {
    knowledge: 0,
    solutions: 0,
    unknown: 0,
  };

  items.forEach((item) => {
    const type = item?.insightType || "";
    if (KNOWLEDGE_TYPES.has(type)) {
      counts.knowledge += 1;
    } else if (SOLUTION_TYPES.has(type)) {
      counts.solutions += 1;
    } else {
      counts.unknown += 1;
    }
  });

  return counts;
};

const diff = (source: Set<string>, target: Set<string>) =>
  Array.from(source).filter((item) => !target.has(item)).sort();

const now = Date.now();

const run = async () => {
  const localesToCheck = [...locales] as Locale[];
  const insightResults = await Promise.all(
    localesToCheck.map((locale) =>
      client.fetch<InsightRecord[]>(INSIGHTS_GROQ, { lang: locale })
    )
  );
  const categoryResults = await Promise.all(
    localesToCheck.map((locale) =>
      client.fetch<CategoryRecord[]>(CATEGORIES_GROQ, { lang: locale })
    )
  );

  const insightMap = new Map<Locale, InsightRecord[]>();
  const categoryMap = new Map<Locale, CategoryRecord[]>();

  localesToCheck.forEach((locale, index) => {
    insightMap.set(locale, Array.isArray(insightResults[index]) ? insightResults[index] : []);
    categoryMap.set(locale, Array.isArray(categoryResults[index]) ? categoryResults[index] : []);
  });

  console.log("\nInsights i18n QA report");
  console.log("========================");

  let hasIssues = false;

  localesToCheck.forEach((locale) => {
    const items = insightMap.get(locale) || [];
    const counts = countByKind(items);
    console.log(`\nLocale: ${locale}`);
    console.log(`- Total insights: ${items.length}`);
    console.log(`- Knowledge: ${counts.knowledge}`);
    console.log(`- Solutions: ${counts.solutions}`);
    console.log(`- Unknown type: ${counts.unknown}`);

    const futurePublished = items.filter((item) => {
      const publishedAt = item?.publishedAt ? new Date(item.publishedAt).getTime() : null;
      return publishedAt !== null && publishedAt > now;
    });

    const missingPublishedAt = items.filter((item) => !item?.publishedAt);

    if (futurePublished.length || missingPublishedAt.length) {
      hasIssues = true;
    }

    console.log(`- Published with future publishedAt: ${futurePublished.length}`);
    if (futurePublished.length) {
      const slugs = futurePublished.map((item) => item.slug || "").filter(Boolean).sort();
      console.log(`  Slugs: ${formatList(slugs)}`);
    }

    console.log(`- Published missing publishedAt: ${missingPublishedAt.length}`);
    if (missingPublishedAt.length) {
      const slugs = missingPublishedAt.map((item) => item.slug || "").filter(Boolean).sort();
      console.log(`  Slugs: ${formatList(slugs)}`);
    }
  });

  if (localesToCheck.length >= 2) {
    const baseLocale = defaultLocale;
    const baseInsights = insightMap.get(baseLocale) || [];
    const baseSlugSet = new Set(
      baseInsights.map((item) => item?.slug || "").filter(Boolean)
    );

    localesToCheck
      .filter((locale) => locale !== baseLocale)
      .forEach((locale) => {
        const localizedInsights = insightMap.get(locale) || [];
        const localizedSlugSet = new Set(
          localizedInsights.map((item) => item?.slug || "").filter(Boolean)
        );

        const missingLocalized = diff(baseSlugSet, localizedSlugSet);
        const extraLocalized = diff(localizedSlugSet, baseSlugSet);

        if (missingLocalized.length || extraLocalized.length) {
          hasIssues = true;
        }

        console.log(`\nSlug parity vs ${baseLocale} → ${locale}`);
        console.log(`- Missing in ${locale}: ${missingLocalized.length}`);
        if (missingLocalized.length) {
          console.log(`  Slugs: ${formatList(missingLocalized)}`);
        }
        console.log(`- Present only in ${locale}: ${extraLocalized.length}`);
        if (extraLocalized.length) {
          console.log(`  Slugs: ${formatList(extraLocalized)}`);
        }
      });
  }

  console.log("\nInsight categories i18n QA");
  console.log("---------------------------");

  localesToCheck.forEach((locale) => {
    const items = categoryMap.get(locale) || [];
    const knowledgeCount = items.filter((item) => item.categoryType === "knowledge").length;
    const solutionCount = items.filter((item) => item.categoryType === "solution").length;
    console.log(`\nLocale: ${locale}`);
    console.log(`- Total categories: ${items.length}`);
    console.log(`- Knowledge categories: ${knowledgeCount}`);
    console.log(`- Solution categories: ${solutionCount}`);
  });

  if (localesToCheck.length >= 2) {
    const baseLocale = defaultLocale;
    const baseCategories = categoryMap.get(baseLocale) || [];
    const baseSlugSet = new Set(
      baseCategories.map((item) => item?.slug || "").filter(Boolean)
    );

    localesToCheck
      .filter((locale) => locale !== baseLocale)
      .forEach((locale) => {
        const localizedCategories = categoryMap.get(locale) || [];
        const localizedSlugSet = new Set(
          localizedCategories.map((item) => item?.slug || "").filter(Boolean)
        );

        const missingLocalized = diff(baseSlugSet, localizedSlugSet);
        const extraLocalized = diff(localizedSlugSet, baseSlugSet);

        if (missingLocalized.length || extraLocalized.length) {
          hasIssues = true;
        }

        console.log(`\nCategory slug parity vs ${baseLocale} → ${locale}`);
        console.log(`- Missing in ${locale}: ${missingLocalized.length}`);
        if (missingLocalized.length) {
          console.log(`  Slugs: ${formatList(missingLocalized)}`);
        }
        console.log(`- Present only in ${locale}: ${extraLocalized.length}`);
        if (extraLocalized.length) {
          console.log(`  Slugs: ${formatList(extraLocalized)}`);
        }
      });
  }

  if (hasIssues) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("Insights QA script failed:", error);
  process.exitCode = 1;
});
