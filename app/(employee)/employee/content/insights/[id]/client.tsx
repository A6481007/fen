"use client";

import EmployeeInsightDetail from "@/components/employee/EmployeeInsightDetail";

type InsightDetailRecord = {
  _id: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  insightType?: string | null;
  summary?: string | null;
  status?: string | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  nextReviewDate?: string | null;
  author?: { name?: string | null; title?: string | null } | null;
  reviewer?: { name?: string | null; title?: string | null } | null;
  primaryCategory?: { title?: string | null } | null;
  categories?: Array<{ _id?: string | null; title?: string | null }> | null;
  tags?: string[] | null;
  seoMetadata?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    canonicalUrl?: string | null;
    noIndex?: boolean | null;
  } | null;
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

const InsightDetailClient = ({ insight }: { insight: InsightDetailRecord | null }) => {
  return <EmployeeInsightDetail insight={insight} />;
};

export default InsightDetailClient;
