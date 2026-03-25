"use client";

import EmployeeInsightEdit from "@/components/employee/EmployeeInsightEdit";
import type { InsightFormOptions } from "@/lib/insightForm";

type InsightDetailRecord = {
  _id: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  summary?: string | null;
  status?: string | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  nextReviewDate?: string | null;
  updatedAt?: string | null;
  author?: { _id?: string | null; name?: string | null } | null;
  reviewer?: { _id?: string | null; name?: string | null } | null;
  primaryCategory?: { _id?: string | null; title?: string | null } | null;
  categories?: Array<{ _id?: string | null; title?: string | null }> | null;
  tags?: string[] | null;
  linkedProducts?: Array<{ _id?: string | null; name?: string | null }> | null;
  linkedInsights?: Array<{ _id?: string | null; title?: string | null }> | null;
  pillarPage?: { _id?: string | null; title?: string | null } | null;
  primaryKeyword?: string | null;
  primaryKeywordVolume?: number | null;
  primaryKeywordDifficulty?: number | null;
  secondaryKeywords?: Array<{
    keyword?: string | null;
    volume?: number | null;
    difficulty?: number | null;
  }> | null;
  seoMetadata?: { _id?: string | null } | null;
  body?: Array<{ children?: Array<{ text?: string | null }> }> | null;
  solutionMaturity?: string | null;
  solutionComplexity?: string | null;
  implementationTimeline?: string | null;
  clientContext?: {
    clientName?: string | null;
    industry?: string | null;
    challengeDescription?: string | null;
    solutionDescription?: string | null;
  } | null;
  metrics?: Array<{
    metricLabel?: string | null;
    metricValue?: string | null;
    metricDescription?: string | null;
  }> | null;
  solutionProducts?: Array<{
    product?: { _id?: string | null; name?: string | null } | null;
    quantity?: number | null;
    isRequired?: boolean | null;
    notes?: string | null;
  }> | null;
};

const InsightEditClient = ({
  insight,
  options,
}: {
  insight: InsightDetailRecord | null;
  options: InsightFormOptions;
}) => {
  return <EmployeeInsightEdit insight={insight} options={options} />;
};

export default InsightEditClient;
