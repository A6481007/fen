import {
  INSIGHT_STATUS_OPTIONS as FORM_INSIGHT_STATUS_OPTIONS,
  INSIGHT_TYPE_OPTIONS as FORM_INSIGHT_TYPE_OPTIONS,
  type InsightType,
} from "@/lib/insightForm";

export type InsightTypeKey = InsightType;

export const INSIGHT_STATUS_OPTIONS = FORM_INSIGHT_STATUS_OPTIONS;
export const INSIGHT_TYPE_OPTIONS = FORM_INSIGHT_TYPE_OPTIONS;

export const INSIGHT_TYPE_LABELS = FORM_INSIGHT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<InsightTypeKey, string>
);

export type InsightTypeConfig = {
  label: string;
  className: string;
};

export const INSIGHT_TYPE_CONFIG: Record<InsightTypeKey, InsightTypeConfig> = {
  productKnowledge: {
    label: "Product Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  generalKnowledge: {
    label: "General Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  problemKnowledge: {
    label: "Problem Knowledge",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  comparison: {
    label: "Comparison",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  caseStudy: {
    label: "Case Study",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  validatedSolution: {
    label: "Validated Solution",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
  theoreticalSolution: {
    label: "Theoretical Solution",
    className: "border border-ink/15 bg-white/90 text-ink-strong",
  },
};

export const FALLBACK_INSIGHT_TYPE: InsightTypeConfig = {
  label: "Insight",
  className: "border border-ink/15 bg-white/90 text-ink-strong",
};

export const KNOWLEDGE_TYPES = new Set<InsightTypeKey>([
  "productKnowledge",
  "generalKnowledge",
  "problemKnowledge",
  "comparison",
]);

export const SOLUTION_TYPES = new Set<InsightTypeKey>([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);
