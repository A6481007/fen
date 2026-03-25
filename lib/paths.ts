type SlugValue = string | number | { current?: string | null } | null | undefined;
type ProductPathInput =
  | SlugValue
  | {
      slug?: SlugValue;
      _id?: string | null;
      id?: string | null;
      productId?: string | null;
      basePath?: string;
    };

type EventPathInput =
  | string
  | {
      slug?: SlugValue;
      date?: string | null;
      basePath?: string;
      includeDateSegments?: boolean;
    };

const resolveSlugValue = (input?: SlugValue) => {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number") return String(input);
  if (typeof input === "object" && typeof (input as { current?: unknown }).current === "string") {
    return (input as { current?: string }).current || "";
  }
  return "";
};

export const CATEGORY_BASE_PATH = "/catelog/product-category";

export const buildCategoryUrl = (slug?: SlugValue) => {
  const value = resolveSlugValue(slug).trim();
  if (!value) return CATEGORY_BASE_PATH;
  return `${CATEGORY_BASE_PATH}/${value}`;
};

export const buildEventPath = (input?: EventPathInput) => {
  const isObj = Boolean(input && typeof input === "object");
  const slug = isObj ? resolveSlugValue((input as any)?.slug) : resolveSlugValue(input as SlugValue);
  const value = slug.trim();
  const basePath = (isObj && (input as any)?.basePath) || "/news/events";
  const includeDateSegments = Boolean(isObj && (input as any)?.includeDateSegments);
  const dateValue = isObj ? (input as any)?.date : undefined;

  const dateSegments = (() => {
    if (!includeDateSegments || !dateValue) return "";
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getUTCFullYear();
    const month = `${d.getUTCMonth() + 1}`.padStart(2, "0");
    return `/${year}/${month}`;
  })();

  if (!value) return `${basePath}${dateSegments}`;
  return `${basePath}${dateSegments}/${value}`;
};

export const buildNewsPath = (slug?: SlugValue) => {
  const value = resolveSlugValue(slug).trim();
  if (!value) return "/news";
  return `/news/${value}`;
};

const resolveProductPathValue = (input?: ProductPathInput) => {
  if (!input) return "";
  if (typeof input === "string" || typeof input === "number") {
    return String(input).trim();
  }
  if (typeof input !== "object") return "";

  const slugFromField = resolveSlugValue((input as { slug?: SlugValue }).slug).trim();
  if (slugFromField) return slugFromField;

  const directSlug = resolveSlugValue(input as SlugValue).trim();
  if (directSlug) return directSlug;

  const idValue =
    typeof (input as { id?: unknown }).id === "string"
      ? (input as { id: string }).id
      : typeof (input as { _id?: unknown })._id === "string"
        ? (input as { _id: string })._id
        : typeof (input as { productId?: unknown }).productId === "string"
          ? (input as { productId: string }).productId
          : "";

  return idValue.trim();
};

export const buildProductPath = (input?: ProductPathInput) => {
  const basePath =
    input && typeof input === "object" && "basePath" in input && (input as { basePath?: string }).basePath
      ? (input as { basePath?: string }).basePath || "/products"
      : "/products";
  const value = resolveProductPathValue(input);
  if (!value) return basePath;
  return `${basePath}/${value}`;
};
