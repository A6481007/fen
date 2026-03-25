"use client";

import "@/app/i18n";
import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface InsightTypeFilterProps {
  section: "knowledge" | "solutions" | "all";
  activeType: string | null;
  onTypeChange: (type: string | null) => void;
  showCounts?: boolean;
  counts?: Record<string, number>;
}

type InsightGroup = "knowledge" | "solutions";

type InsightTab = {
  labelKey: string;
  value: string | null;
  group: InsightGroup;
};

const KNOWLEDGE_TYPES = [
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
];

const SOLUTION_TYPES = [
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
];

const KNOWLEDGE_TYPE_SET = new Set(KNOWLEDGE_TYPES);
const SOLUTION_TYPE_SET = new Set(SOLUTION_TYPES);
const ALL_TYPE_SET = new Set([...KNOWLEDGE_TYPES, ...SOLUTION_TYPES]);

const KNOWLEDGE_TABS: InsightTab[] = [
  { labelKey: "client.insight.filters.knowledge.all", value: null, group: "knowledge" },
  {
    labelKey: "client.insight.filters.knowledge.product",
    value: "productKnowledge",
    group: "knowledge",
  },
  {
    labelKey: "client.insight.filters.knowledge.general",
    value: "generalKnowledge",
    group: "knowledge",
  },
  {
    labelKey: "client.insight.filters.knowledge.problem",
    value: "problemKnowledge",
    group: "knowledge",
  },
  { labelKey: "client.insight.filters.knowledge.comparison", value: "comparison", group: "knowledge" },
];

const SOLUTION_TABS: InsightTab[] = [
  { labelKey: "client.insight.filters.solutions.all", value: null, group: "solutions" },
  {
    labelKey: "client.insight.filters.solutions.caseStudy",
    value: "caseStudy",
    group: "solutions",
  },
  {
    labelKey: "client.insight.filters.solutions.validated",
    value: "validatedSolution",
    group: "solutions",
  },
  {
    labelKey: "client.insight.filters.solutions.theoretical",
    value: "theoreticalSolution",
    group: "solutions",
  },
];

const normalizeType = (
  value: string | null | undefined,
  section: InsightTypeFilterProps["section"]
) => {
  if (!value) return null;
  if (section === "knowledge") {
    return KNOWLEDGE_TYPE_SET.has(value) ? value : null;
  }
  if (section === "solutions") {
    return SOLUTION_TYPE_SET.has(value) ? value : null;
  }
  return ALL_TYPE_SET.has(value) ? value : null;
};

const InsightTypeFilter = ({
  section,
  activeType,
  onTypeChange,
  showCounts = false,
  counts = {},
}: InsightTypeFilterProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const resolvedType = normalizeType(activeType, section);

  const totals = useMemo(
    () => ({
      knowledge: KNOWLEDGE_TYPES.reduce(
        (sum, key) => sum + (counts[key] ?? 0),
        0
      ),
      solutions: SOLUTION_TYPES.reduce(
        (sum, key) => sum + (counts[key] ?? 0),
        0
      ),
    }),
    [counts]
  );

  const groups = useMemo(() => {
    if (section === "knowledge") {
      return [{ key: "knowledge", tabs: KNOWLEDGE_TABS }];
    }
    if (section === "solutions") {
      return [{ key: "solutions", tabs: SOLUTION_TABS }];
    }
    return [
      { key: "knowledge", tabs: KNOWLEDGE_TABS },
      { key: "solutions", tabs: SOLUTION_TABS },
    ];
  }, [section]);

  const handleTypeChange = useCallback(
    (nextType: string | null) => {
      const normalizedNextType = normalizeType(nextType, section);
      const currentParam = searchParams?.get("type") ?? null;
      const nextParam = normalizedNextType ?? null;

      if (resolvedType !== normalizedNextType) {
        onTypeChange(normalizedNextType);
      }

      if (currentParam === nextParam) return;

      const params = new URLSearchParams(searchParams?.toString());
      if (normalizedNextType) {
        params.set("type", normalizedNextType);
      } else {
        params.delete("type");
      }

      const queryString = params.toString();
      const target = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(target);
      });
    },
    [
      onTypeChange,
      pathname,
      router,
      searchParams,
      section,
      startTransition,
      resolvedType,
    ]
  );

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-wrap gap-2">
          <div className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:overflow-visible md:pb-0">
            {group.tabs.map((tab) => {
              const isActive =
                tab.value === null
                  ? resolvedType === null
                  : resolvedType === tab.value;
              const count =
                tab.value === null
                  ? totals[tab.group]
                  : counts[tab.value] ?? 0;

              return (
                <button
                  key={`${group.key}-${tab.labelKey}`}
                  type="button"
                  onClick={() => handleTypeChange(tab.value)}
                  disabled={isPending}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
                    isActive
                      ? "border-accent-red bg-accent-red text-white shadow-sm"
                      : "border-border bg-white text-ink hover:border-neutral-900 hover:text-neutral-900"
                  )}
                >
                  <span>{t(tab.labelKey)}</span>
                  {showCounts ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border-0 px-2.5 py-0.5 text-xs font-semibold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-surface-2 text-ink"
                      )}
                    >
                      {count}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsightTypeFilter;
