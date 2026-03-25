import "@/app/i18n";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import Title from "../Title";
import { Checkbox } from "../ui/checkbox";
import { Category } from "@/sanity.types";
import { useTranslation } from "react-i18next";

interface Props {
  categories: Category[];
  selectedCategories: string[];
  setSelectedCategories: Dispatch<SetStateAction<string[]>>;
}

type CategoryNode = Category & { children?: CategoryNode[] };

const getTypography = (depth: number) => {
  if (depth === 0) return "text-[14px] font-semibold text-slate-800";
  if (depth === 1) return "text-[13px] font-medium text-slate-600";
  return "text-[12px] font-normal text-slate-500";
};

const CategoryList = ({ categories, selectedCategories, setSelectedCategories }: Props) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  const tree = useMemo(() => {
    const map = new Map<string, CategoryNode>();
    categories.forEach((cat) => {
      if (cat?._id) {
        map.set(cat._id, { ...cat, children: [] });
      }
    });

    const roots: CategoryNode[] = [];
    map.forEach((node) => {
      const parentId = node.parentCategory && (node.parentCategory as Category)?._id;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortByOrder = (list: CategoryNode[]) =>
      list
        .map((item) => ({ ...item, children: sortByOrder(item.children || []) }))
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || (a.title || "").localeCompare(b.title || ""));

    return sortByOrder(roots);
  }, [categories]);

  const autoExpandedIds = useMemo(() => {
    const selected = new Set(selectedCategories);
    const forced = new Set<string>();

    const visit = (node: CategoryNode): boolean => {
      const slug = node.slug?.current;
      const selfSelected = slug ? selected.has(slug) : false;
      const childSelected = (node.children || []).some(visit);

      if ((selfSelected || childSelected) && node._id) {
        forced.add(node._id);
      }
      return selfSelected || childSelected;
    };

    tree.forEach(visit);
    return forced;
  }, [selectedCategories, tree]);

  const toggleCategory = useCallback(
    (slug?: string | null) => {
      if (!slug) return;
      setSelectedCategories((prev) =>
        prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]
      );
    },
    [setSelectedCategories]
  );

  const toggleExpand = useCallback((id?: string, hasChildren?: boolean) => {
    if (!id || !hasChildren) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearAll = () => setSelectedCategories([]);

  const renderNode = (node: CategoryNode, depth = 0) => {
    const slug = node.slug?.current;
    const isChecked = slug ? selectedCategories.includes(slug) : false;
    const hasChildren = !!node.children?.length;
    const nodeId = node._id;
    const expanded = hasChildren && nodeId ? expandedIds.has(nodeId) || autoExpandedIds.has(nodeId) : false;
    const indent = depth * 20;
    const count = typeof node.productCount === "number" ? node.productCount : null;
    const badgeActive = count !== null && count > 0;

    return (
      <div key={node._id || slug || node.title} className="space-y-1">
        <div
          className="relative"
          style={{ marginLeft: `${indent}px` }}
        >
          {depth > 0 && (
            <span
              className="absolute -left-3 top-1/2 w-3 border-t -translate-y-1/2"
              aria-hidden
            />
          )}
          <div
            className={`flex items-center gap-2 rounded-md border transition-all duration-150 pr-3 py-2 ${
              isChecked
                ? "bg-blue-50 border-blue-100 ring-1 ring-blue-100"
                : "border-transparent hover:bg-gray-50"
            }`}
            onClick={() => toggleCategory(slug)}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={
                  expanded
                    ? t("client.shop.filters.categories.collapse")
                    : t("client.shop.filters.categories.expand")
                }
                className="p-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(nodeId, hasChildren);
                }}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-90 text-blue-600" : ""}`}
                />
              </button>
            ) : (
              <span className="w-6" />
            )}
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggleCategory(slug)}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden />
              <span className={`${getTypography(depth)} truncate`}>{node.title}</span>
            </div>
            {count !== null && (
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full leading-none ${
                  badgeActive ? "bg-blue-600 text-white" : "text-slate-500 border border-slate-200"
                }`}
              >
                {count}
              </span>
            )}
          </div>
        </div>
        {hasChildren && expanded && (
          <div className="relative">
            <span
              className="absolute top-0 bottom-1 border-l border-slate-200"
              style={{ left: `${indent + 12}px` }}
              aria-hidden
            />
            <div className="space-y-1">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <Title className="text-base font-semibold text-gray-900">
            {t("client.shop.filters.categories.title")}
          </Title>
          <p className="text-xs text-slate-500">
            {t("client.shop.filters.categories.subtitle")}
          </p>
        </div>
        <button
          className="text-xs text-gray-600 hover:text-brand-black-strong underline underline-offset-4"
          onClick={clearAll}
        >
          {t("client.shop.filters.categories.clear")}
        </button>
      </div>
      <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
    </div>
  );
};

export default CategoryList;
