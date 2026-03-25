import { useEffect, useState } from "react";
import { categoriesData } from "@/constants";

type ApiCategory = {
  title?: string;
  slug?: { current?: string | null } | null;
  href?: string;
};

type NavCategory = { title: string; href: string };

const normalizeCategories = (categories: ApiCategory[]): NavCategory[] =>
  categories
    .map((category) => {
      const href = category.slug?.current || category.href || "";
      return {
        title: category.title || "",
        href,
      };
    })
    .filter((category) => category.title && category.href);

/**
 * Client-side hook to fetch navigation categories from the Sanity-backed API,
 * with static constants as a fallback.
 */
export const useNavCategories = () => {
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/navigation/categories");
        if (!response.ok) return;

        const { categories } = (await response.json()) as { categories?: ApiCategory[] };
        if (!cancelled && Array.isArray(categories)) {
          const normalized = normalizeCategories(categories);
          if (normalized.length) {
            setNavCategories(normalized);
          }
        }
      } catch (error) {
        console.error("Failed to fetch navigation categories", error);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  return navCategories;
};
