import { MetadataRoute } from "next";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";
import { client } from "@/sanity/lib/client";

const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all products
  const products = await client.fetch(`
    *[_type == "product" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt
    }
  `);

  // Fetch all categories
  const categories = await client.fetch(`
    *[_type == "category" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt
    }
  `);

  // Fetch all brands
  const brands = await client.fetch(`
    *[_type == "brand" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt
    }
  `);

  // Fetch all news/blog entries
  const newsDocuments = await client.fetch(`
    *[_type == "blog" && defined(slug.current)] {
      "slug": slug.current,
      _updatedAt,
      publishedAt
    }
  `);

  // Static pages
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}${CATEGORY_BASE_PATH}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/brands`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/deal`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/catalog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.65,
    },
  ];

  // Product pages
  const productPages = products.map((product: any) => ({
    url: `${BASE_URL}/product/${product.slug}`,
    lastModified: new Date(product._updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Category pages
  const categoryPages = categories.map((category: any) => ({
    url: `${BASE_URL}${buildCategoryUrl(category.slug)}`,
    lastModified: new Date(category._updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Brand pages
  const brandPages = brands.map((brand: any) => ({
    url: `${BASE_URL}/brands/${brand.slug}`,
    lastModified: new Date(brand._updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const newsDetailPages = newsDocuments.map((entry: any) => ({
    url: `${BASE_URL}/news/${entry.slug}`,
    lastModified: new Date(entry._updatedAt || entry.publishedAt || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const blogDetailPages = newsDocuments.map((entry: any) => ({
    url: `${BASE_URL}/blog/${entry.slug}`,
    lastModified: new Date(entry._updatedAt || entry.publishedAt || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.55,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...categoryPages,
    ...brandPages,
    ...newsDetailPages,
    ...blogDetailPages,
  ];
}
