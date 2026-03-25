export const normalizePath = (rawPath: string): string => {
  if (!rawPath) return "";

  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === "#" || trimmed.startsWith("#")) return "";

  let pathname = "";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      pathname = new URL(trimmed).pathname;
    } else {
      pathname = new URL(trimmed, "http://local").pathname;
    }
  } catch {
    pathname = trimmed.split(/[?#]/)[0] ?? "";
  }

  if (!pathname) return "";

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, "");
  }

  return pathname;
};

export const getActiveHref = (
  currentPath: string,
  hrefs: string[]
): string | null => {
  const normalizedPath = normalizePath(currentPath);
  if (!normalizedPath) return null;

  const normalizedHrefs = (hrefs ?? [])
    .map(normalizePath)
    .filter((href) => Boolean(href));

  let bestMatch: string | null = null;
  let bestLength = -1;

  for (const href of normalizedHrefs) {
    if (!href) continue;

    const isExact = normalizedPath === href;
    const isNested = href !== "/" && normalizedPath.startsWith(`${href}/`);

    if (isExact || isNested) {
      if (href.length > bestLength) {
        bestMatch = href;
        bestLength = href.length;
      }
    }
  }

  return bestMatch;
};

export const isShopPath = (rawPath: string): boolean => {
  const pathname = normalizePath(rawPath);
  return (
    pathname === "/shop" ||
    pathname.startsWith("/shop/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/product" ||
    pathname.startsWith("/product/")
  );
};

export const isCatalogPath = (rawPath: string): boolean => {
  const pathname = normalizePath(rawPath);
  return (
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname === "/catelog/product-category" ||
    pathname.startsWith("/catelog/product-category/")
  );
};
