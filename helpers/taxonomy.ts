export type ProductCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameTh: string;
};

export const taxonomy: ProductCategory[] = [
  {
    id: "networking-category-id",
    slug: "networking",
    nameEn: "Networking Equipment",
    nameTh: "อุปกรณ์เครือข่าย",
  },
  {
    id: "security-category-id",
    slug: "security",
    nameEn: "Security Solutions",
    nameTh: "โซลูชันความปลอดภัย",
  },
  {
    id: "wireless-category-id",
    slug: "wireless",
    nameEn: "Wireless Systems",
    nameTh: "ระบบไร้สาย",
  },
];

const normalizeSlug = (slug: string) => slug.trim().toLowerCase();

export const taxonomyBySlug = taxonomy.reduce<Record<string, ProductCategory>>((acc, category) => {
  acc[normalizeSlug(category.slug)] = category;
  return acc;
}, {});

export const getCategoryBySlug = (slug: string): ProductCategory | undefined =>
  taxonomyBySlug[normalizeSlug(slug)];

export const getCategoryIdBySlug = (slug: string): string | undefined =>
  getCategoryBySlug(slug)?.id;

export default taxonomy;
