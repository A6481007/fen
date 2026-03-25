"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  PromotionReferenceSelection,
  PromotionTargetCategoryNode,
  PromotionTargetProductNode,
} from "./types";

type PromotionTargetProductTreeProps = {
  value: PromotionReferenceSelection[];
  onChange: (next: PromotionReferenceSelection[]) => void;
  onLoadTree?: () => Promise<PromotionTargetCategoryNode[]>;
  inputId?: string;
  label: string;
  placeholder: string;
  loadingLabel: string;
  emptyLabel: string;
  clearLabel: string;
  selectedLabel: string;
  removeLabel: string;
};

const sortByLabel = <T extends { label?: string; title?: string }>(a: T, b: T) =>
  (a.label ?? a.title ?? "").localeCompare(b.label ?? b.title ?? "", "en", {
    sensitivity: "base",
  });

const collectProducts = (node: PromotionTargetCategoryNode): PromotionTargetProductNode[] => {
  const childrenProducts = node.children.flatMap((child) => collectProducts(child));
  return [...node.products, ...childrenProducts];
};

const filterTree = (
  nodes: PromotionTargetCategoryNode[],
  query: string,
): PromotionTargetCategoryNode[] => {
  const term = query.trim().toLowerCase();
  if (!term) return nodes;

  const filterNode = (node: PromotionTargetCategoryNode): PromotionTargetCategoryNode | null => {
    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((child): child is PromotionTargetCategoryNode => Boolean(child));
    const filteredProducts = node.products.filter((product) => {
      const haystack = `${product.label} ${product.slug ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
    const nodeMatches = `${node.title} ${node.slug ?? ""}`.toLowerCase().includes(term);

    if (!nodeMatches && filteredChildren.length === 0 && filteredProducts.length === 0) {
      return null;
    }

    const productCount =
      filteredProducts.length +
      filteredChildren.reduce((sum, child) => sum + child.productCount, 0);

    return {
      ...node,
      children: filteredChildren,
      products: filteredProducts,
      productCount,
    };
  };

  return nodes
    .map((node) => filterNode(node))
    .filter((node): node is PromotionTargetCategoryNode => Boolean(node));
};

export function PromotionTargetProductTree({
  value,
  onChange,
  onLoadTree,
  inputId = "target-product-browser",
  label,
  placeholder,
  loadingLabel,
  emptyLabel,
  clearLabel,
  selectedLabel,
  removeLabel,
}: PromotionTargetProductTreeProps) {
  const [query, setQuery] = useState("");
  const [tree, setTree] = useState<PromotionTargetCategoryNode[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(onLoadTree));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!onLoadTree) {
      setTree([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    onLoadTree()
      .then((result) => {
        if (!active) return;
        const nextTree = Array.isArray(result) ? result : [];
        setTree(nextTree);
        setExpandedIds(new Set(nextTree.map((node) => node.id)));
      })
      .catch((error) => {
        console.error("Failed to load promotion target product tree", error);
        if (active) setTree([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onLoadTree]);

  const selectedIds = useMemo(() => new Set(value.map((item) => item.id)), [value]);

  const productLookup = useMemo(() => {
    const map = new Map<string, PromotionTargetProductNode>();
    const walk = (nodes: PromotionTargetCategoryNode[]) => {
      nodes.forEach((node) => {
        node.products.forEach((product) => map.set(product.id, product));
        if (node.children.length) walk(node.children);
      });
    };
    walk(tree);
    return map;
  }, [tree]);

  const selectedItems = useMemo(
    () =>
      value
        .map((item) => {
          const product = productLookup.get(item.id);
          return {
            id: item.id,
            label: item.label || product?.label || item.id,
          };
        })
        .sort((a, b) => sortByLabel(a, b)),
    [productLookup, value],
  );

  const filteredTree = useMemo(() => filterTree(tree, query), [query, tree]);
  const forceExpanded = query.trim().length > 0;

  const toggleExpanded = (categoryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const setProductChecked = (product: PromotionTargetProductNode, checked: boolean) => {
    if (checked) {
      if (selectedIds.has(product.id)) return;
      onChange([...value, { id: product.id, label: product.label }].sort((a, b) => sortByLabel(a, b)));
      return;
    }

    onChange(value.filter((item) => item.id !== product.id));
  };

  const setCategoryChecked = (node: PromotionTargetCategoryNode, checked: boolean) => {
    const products = collectProducts(node);
    const productMap = new Map(value.map((item) => [item.id, item]));

    products.forEach((product) => {
      if (checked) {
        productMap.set(product.id, { id: product.id, label: product.label });
      } else {
        productMap.delete(product.id);
      }
    });

    onChange(Array.from(productMap.values()).sort((a, b) => sortByLabel(a, b)));
  };

  const renderNode = (node: PromotionTargetCategoryNode, depth = 0) => {
    const descendants = collectProducts(node);
    const selectedCount = descendants.filter((product) => selectedIds.has(product.id)).length;
    const checkboxState =
      selectedCount === 0
        ? false
        : selectedCount === descendants.length
          ? true
          : "indeterminate";
    const isExpanded = forceExpanded || expandedIds.has(node.id);
    const hasChildren = node.children.length > 0;
    const hasProducts = node.products.length > 0;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
          style={{ paddingLeft: `${depth * 18 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => toggleExpanded(node.id)}
            className="flex h-5 w-5 items-center justify-center text-slate-500"
            aria-label={isExpanded ? "Collapse category" : "Expand category"}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <Checkbox
            checked={checkboxState}
            onCheckedChange={(checked) => setCategoryChecked(node, checked === true)}
            aria-label={node.title}
          />
          <FolderTree className="h-4 w-4 text-slate-400" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
            {node.title}
          </span>
          <Badge variant="secondary" className="rounded-full bg-blue-600 px-2 py-0 text-[11px] text-white">
            {node.productCount}
          </Badge>
        </div>

        {isExpanded && (hasChildren || hasProducts) ? (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
            {hasProducts ? (
              <div className="space-y-1">
                {node.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
                    style={{ paddingLeft: `${(depth + 1) * 18 + 26}px` }}
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      onCheckedChange={(checked) => setProductChecked(product, checked === true)}
                      aria-label={product.label}
                    />
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.label}
                        className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-400">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{product.label}</div>
                      {product.slug ? (
                        <div className="truncate text-xs text-slate-500">{product.slug}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        {selectedItems.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
            {clearLabel}
          </Button>
        ) : null}
      </div>

      <Input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
      />

      <div className="rounded-lg border border-slate-200 bg-white">
        <ScrollArea className="h-[28rem] overflow-hidden">
          <div className="p-2">
            {isLoading ? (
              <p className="px-2 py-3 text-sm text-slate-500">{loadingLabel}</p>
            ) : filteredTree.length > 0 ? (
              <div className="space-y-1">{filteredTree.map((node) => renderNode(node))}</div>
            ) : (
              <p className="px-2 py-3 text-sm text-slate-500">{emptyLabel}</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {selectedItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {selectedLabel} ({selectedItems.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <Badge key={item.id} variant="secondary" className="inline-flex items-center gap-2">
                <span>{item.label}</span>
                <button
                  type="button"
                  className="text-slate-600 hover:text-slate-900"
                  onClick={() => onChange(value.filter((entry) => entry.id !== item.id))}
                  aria-label={removeLabel}
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
