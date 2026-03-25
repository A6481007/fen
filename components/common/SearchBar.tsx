"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddToCartButton from "../AddToCartButton";
import PriceView from "../PriceView";
import { urlFor } from "@/sanity/lib/image";
import type { Product } from "@/sanity.types";
import { buildProductPath, CATEGORY_BASE_PATH } from "@/lib/paths";
import {
  resolveActiveDeal,
  resolveDealOriginalPrice,
  resolveDealPercent,
  resolveDealPrice,
} from "@/lib/deals";

const SearchBar = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProduct, setFeaturedProduct] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();
  const resultsId = useId();
  const inputId = useId();

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  const dedupe = useCallback((items: Product[]) => {
    const map = new Map<string, Product>();
    items.forEach((item) => {
      const key = item?.slug?.current || item?._id;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, []);

  const fetchFeaturedProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/search/products?featured=1&limit=12", { method: "GET", cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load featured (${res.status})`);
      const data = (await res.json()) as { items?: Product[] };
      setFeaturedProduct(dedupe(data?.items || []));
    } catch (fetchError) {
      console.error("Error fetching featured products:", fetchError);
    }
  }, [dedupe]);

  useEffect(() => {
    if (open) {
      fetchFeaturedProducts();
      const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [open, fetchFeaturedProducts]);

  const buildSearchHref = useCallback((value: string) => {
    const term = value.trim();
    if (!term) return "/search";
    const params = new URLSearchParams();
    params.set("q", term);
    return `/search?${params.toString()}`;
  }, []);

  const goToResults = useCallback(
    (value: string) => {
      const term = value.trim();
      if (!term) return;
      setOpen(false);
      router.push(buildSearchHref(term));
    },
    [buildSearchHref, router]
  );

  const fetchProducts = useCallback(async () => {
    if (!open) return;
    const term = search.trim();
    if (!term) {
      setProducts([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ term, limit: "12" });
      const res = await fetch(`/api/search/products?${params.toString()}`, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Search failed (${res.status})`);
      }
      const data = (await res.json()) as { items?: Product[] };
      setProducts(dedupe(data?.items || []));
    } catch (err) {
      console.error("Error fetching products:", err);
      setError(err instanceof Error ? err.message : "Unable to search right now. Please try again.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [dedupe, open, search]);

  useEffect(() => {
    if (!open) return;
    const debounceTimer = window.setTimeout(() => {
      void fetchProducts();
    }, 300);
    return () => window.clearTimeout(debounceTimer);
  }, [fetchProducts, open]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (key === "escape" && open) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const resultsLabel = search.trim()
    ? `${products.length} result${products.length === 1 ? "" : "s"}`
    : featuredProduct.length
      ? `${featuredProduct.length} suggested items`
      : "Start typing to search";

  const renderProductCard = (product: Product) => {
    const imageUrl =
      product?.images?.[0] ? urlFor(product.images[0]).width(160).height(160).fit("max").url() : null;
    const productHref = buildProductPath(product);
    const isOutOfStock = product?.stock === 0;
    const activeDeal = resolveActiveDeal(product as any);
    const dealPrice = resolveDealPrice(activeDeal, product?.price ?? 0);
    const dealOriginalPrice = resolveDealOriginalPrice(activeDeal, product?.price ?? 0);
    const dealPercent = resolveDealPercent(activeDeal, dealOriginalPrice, dealPrice);
    const showDeal = Boolean(activeDeal && typeof dealPrice === "number");
    const discount = showDeal ? undefined : product?.discount;

    return (
      <li key={product?._id} className="flex gap-4 p-3 md:p-4 transition hover:bg-surface-1">
        <Link
          href={productHref}
          onClick={() => setOpen(false)}
          className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product?.name || "Product image"}
              fill
              sizes="80px"
              className={`object-cover ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
            />
          ) : (
            <span className="text-xs text-ink-muted">No image</span>
          )}
          {showDeal ? (
            <span
              className="absolute right-2 top-2 rounded-full bg-ink text-surface-0 px-2 py-1 text-[11px] font-semibold"
              style={
                activeDeal?.badgeColor
                  ? { backgroundColor: activeDeal.badgeColor }
                  : undefined
              }
            >
              {activeDeal?.badge || (typeof dealPercent === "number" ? `-${dealPercent}%` : "Deal")}
            </span>
          ) : typeof discount === "number" && discount > 0 ? (
            <span className="absolute right-2 top-2 rounded-full bg-ink text-surface-0 px-2 py-1 text-[11px] font-semibold">
              -{discount}%
            </span>
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Link
            href={productHref}
            onClick={() => setOpen(false)}
            className="text-sm font-semibold leading-tight text-ink-strong underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
          >
            {product?.name || "Product"}
          </Link>
          {product?.sku ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              SKU: {product.sku}
            </p>
          ) : null}
          <p className="text-xs text-ink-muted line-clamp-2">
            {product?.description || "Open the product detail for full specifications."}
          </p>
          <PriceView
            price={showDeal ? dealPrice ?? product?.price : product?.price}
            originalPrice={showDeal ? dealOriginalPrice : undefined}
            discount={showDeal ? undefined : product?.discount}
            className="text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {isOutOfStock ? (
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink" aria-live="polite">
                Out of stock
              </span>
            ) : (
              <AddToCartButton
                product={product}
                className="px-3 py-1.5 text-sm"
                aria-label={`Add ${product?.name || "product"} to cart`}
              />
            )}
            {product?.status ? (
              <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                {product.status}
              </span>
            ) : null}
            {product?.isFeatured ? (
              <span className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                Featured
              </span>
            ) : null}
          </div>
        </div>
      </li>
    );
  };

  const renderList = (items: Product[], emptyLabel: string) => {
    if (!items.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-ink-muted" role="status">
          <p className="text-ink">{emptyLabel}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setSearch("")}>
            Clear search
          </Button>
        </div>
      );
    }

    return (
      <ul className="divide-y divide-border" role="list">
        {items.map(renderProductCard)}
      </ul>
    );
  };

  return (
    <>
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open search (${isMac ? "Cmd" : "Ctrl"}+K)`}
          aria-expanded={open}
          className="group hidden min-w-[220px] items-center gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2 text-left text-sm text-ink-muted transition hover:border-ink hover:text-ink-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] sm:flex"
        >
          <Search className="h-4 w-4 text-ink-muted group-hover:text-ink" aria-hidden />
          <span className="flex-1">Search products…</span>
          <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-mono text-ink-muted">
            {isMac ? "⌘" : "Ctrl"} K
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open search"
          aria-expanded={open}
          className="group flex items-center justify-center rounded-lg border border-border bg-surface-1 p-2 text-ink hover:border-ink hover:text-ink-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] sm:hidden"
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-4xl gap-0 overflow-hidden border border-border bg-surface-0 p-0 text-ink"
          aria-describedby={descriptionId}
        >
          <DialogHeader className="space-y-1 px-6 pt-6 pr-12">
            <DialogTitle className="text-xl font-semibold text-ink-strong">Search products</DialogTitle>
            <DialogDescription id={descriptionId} className="text-sm text-ink-muted">
              Find products, quick add to cart, and press Escape to close.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6">
            <form
              className="relative mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                goToResults(search);
              }}
              role="search"
              aria-label="Product search"
            >
              <label htmlFor={inputId} className="sr-only">
                Search products
              </label>
              <Input
                id={inputId}
                ref={inputRef}
                placeholder="Search for products, categories, or SKUs"
                className="h-12 w-full rounded-lg border border-border bg-surface-1 pl-10 pr-12 text-base text-ink"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-describedby={descriptionId}
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </form>

            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted"
              aria-live="polite"
            >
              <span>{loading ? "Searching…" : resultsLabel}</span>
              <div className="flex items-center gap-2">
                {search.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => goToResults(search)}
                    className="h-7 px-3 text-xs"
                  >
                    View all results
                  </Button>
                ) : null}
                <span>{isMac ? "⌘" : "Ctrl"} + K</span>
              </div>
            </div>

            <section
              id={resultsId}
              aria-live="polite"
              aria-busy={loading}
              className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-surface-0"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12" role="status">
                  <Loader2 className="h-6 w-6 animate-spin text-ink" aria-hidden />
                  <p className="text-sm text-ink">Searching products…</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-ink-strong">Search isn’t working right now.</p>
                  <p className="text-sm text-ink-muted">{error}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        setError(null);
                        void fetchProducts();
                      }}
                    >
                      Retry search
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      onClick={() => setOpen(false)}
                    >
                      <Link href={CATEGORY_BASE_PATH}>Browse catalog</Link>
                    </Button>
                  </div>
                </div>
              ) : search.trim() ? (
                renderList(products, `No products found for “${search}”.`)
              ) : (
                <div className="space-y-4 px-4 py-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-strong">Suggested products</p>
                    <span className="text-xs text-ink-muted">Based on popularity</span>
                  </div>
                  {renderList(
                    featuredProduct.slice(0, 8),
                    "No featured products available right now."
                  )}
                  {featuredProduct.length ? (
                    <div className="flex flex-wrap gap-2" aria-label="Quick search suggestions">
                      {featuredProduct.slice(0, 6).map((item) => (
                        <button
                          key={item?._id}
                          type="button"
                          onClick={() => setSearch(item?.name || "")}
                          className="rounded-full border border-border bg-surface-1 px-3 py-1.5 text-xs font-medium text-ink hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
                        >
                          {item?.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchBar;
