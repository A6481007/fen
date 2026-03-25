"use client";

/*
[PROPOSED] EmployeeInsightCategoryDetail - scaffolded insight category detail view for content ops.
[EXISTING] uses Button, Card, Badge, Tabs, Separator.
*/

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

type CategoryStatus = "active" | "draft" | "archived";
type CategoryVisibility = "internal" | "external";

type CategoryDetail = {
  id: string;
  name: string;
  status: CategoryStatus;
  visibility: CategoryVisibility;
  description: string;
  slug: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  lastReviewed: string;
  insightCount: number;
  seoTitle: string;
  seoDescription: string;
  featuredInsights: string[];
  stakeholders: string[];
  usageNotes: string;
};

const CATEGORIES: CategoryDetail[] = [
  {
    id: "CAT-2001",
    name: "Manufacturing",
    status: "active",
    visibility: "external",
    description: "Operational playbooks for plant leaders and engineers.",
    slug: "manufacturing",
    owner: "Alicia Park",
    createdAt: "2025-11-05",
    updatedAt: "2026-01-12",
    lastReviewed: "2026-01-05",
    insightCount: 12,
    seoTitle: "Manufacturing insights for plant performance",
    seoDescription:
      "Deep dives on manufacturing reliability, maintenance strategies, and throughput gains.",
    featuredInsights: ["INS-1001", "INS-0998", "INS-0982"],
    stakeholders: ["Plant Ops", "Reliability"],
    usageNotes: "Primary category for factory operations content.",
  },
  {
    id: "CAT-2002",
    name: "Operations",
    status: "active",
    visibility: "external",
    description: "Shift-level execution, throughput, and daily management.",
    slug: "operations",
    owner: "Ravi Patel",
    createdAt: "2025-10-18",
    updatedAt: "2026-01-10",
    lastReviewed: "2025-12-20",
    insightCount: 9,
    seoTitle: "Operations insights for throughput leaders",
    seoDescription:
      "Guides and checklists for operations leaders to improve daily execution.",
    featuredInsights: ["INS-1002", "INS-0974"],
    stakeholders: ["Operations", "Shift Leads"],
    usageNotes: "Use for execution playbooks and daily management content.",
  },
  {
    id: "CAT-2003",
    name: "Sustainability",
    status: "draft",
    visibility: "external",
    description: "Energy efficiency, emissions reporting, and ESG enablement.",
    slug: "sustainability",
    owner: "Jordan Lee",
    createdAt: "2025-09-04",
    updatedAt: "2026-01-08",
    lastReviewed: "2025-12-15",
    insightCount: 4,
    seoTitle: "Sustainability insight hub",
    seoDescription:
      "Content for energy, emissions, and sustainability programs in manufacturing.",
    featuredInsights: ["INS-1003"],
    stakeholders: ["Sustainability", "Energy"],
    usageNotes: "Draft taxonomy awaiting ESG team review.",
  },
  {
    id: "CAT-2004",
    name: "Risk",
    status: "archived",
    visibility: "internal",
    description: "Incident response checklists and control frameworks.",
    slug: "risk",
    owner: "Priya Nair",
    createdAt: "2024-12-08",
    updatedAt: "2025-12-28",
    lastReviewed: "2025-11-30",
    insightCount: 2,
    seoTitle: "Risk response insights",
    seoDescription: "Incident response and risk mitigation reference material.",
    featuredInsights: ["INS-1004"],
    stakeholders: ["Risk", "Compliance"],
    usageNotes: "Archived after consolidation with Compliance category.",
  },
];

const statusStyles: Record<CategoryStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const visibilityStyles: Record<CategoryVisibility, string> = {
  internal: "bg-slate-100 text-slate-700 border-slate-200",
  external: "bg-sky-50 text-sky-700 border-sky-200",
};

const EmployeeInsightCategoryDetail = ({ categoryId }: { categoryId: string }) => {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language === "th" ? "th-TH" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const localizeCategory = (category: CategoryDetail): CategoryDetail => ({
    ...category,
    name: t(`employee.insightCategories.mock.${category.id}.name`, category.name),
    description: t(
      `employee.insightCategories.mock.${category.id}.description`,
      category.description,
    ),
    owner: t(`employee.insightCategories.mock.${category.id}.owner`, category.owner),
    seoTitle: t(`employee.insightCategories.detail.mock.${category.id}.seoTitle`, category.seoTitle),
    seoDescription: t(
      `employee.insightCategories.detail.mock.${category.id}.seoDescription`,
      category.seoDescription,
    ),
    usageNotes: t(`employee.insightCategories.detail.mock.${category.id}.usageNotes`, category.usageNotes),
    stakeholders: category.stakeholders.map((team, index) =>
      t(`employee.insightCategories.detail.mock.${category.id}.stakeholder${index + 1}`, team),
    ),
  });

  const category = useMemo(
    () => {
      const found = CATEGORIES.find((item) => item.id === categoryId);
      return found ? localizeCategory(found) : null;
    },
    [categoryId, t]
  );

  if (!category) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">{t("employee.insightCategories.detail.notFound.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("employee.insightCategories.detail.notFound.subtitle", { categoryId })}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/insight-categories">
              {t("employee.insightCategories.detail.actions.backToCategories")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const insightsHref = `/employee/content/insights?category=${category.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insight-categories">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.insightCategories.detail.actions.backToCategories")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[category.status]}`}
            >
              {t(`employee.insightCategories.status.${category.status}`)}
            </Badge>
            <Badge
              variant="outline"
              className={visibilityStyles[category.visibility]}
            >
              {t(`employee.insightCategories.visibility.${category.visibility}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {category.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={insightsHref}>
              <Eye className="h-4 w-4" />
              {t("employee.insightCategories.detail.actions.viewInsights")}
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/employee/content/insight-categories/${category.id}/edit`}>
              <Pencil className="h-4 w-4" />
              {t("employee.insightCategories.detail.actions.editCategory")}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">{t("employee.insightCategories.detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="seo">{t("employee.insightCategories.detail.tabs.seo")}</TabsTrigger>
          <TabsTrigger value="usage">{t("employee.insightCategories.detail.tabs.usage")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.details")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.slug")}</span>
                  <span className="font-medium">{category.slug}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.visibility")}</span>
                  <span className="font-medium">
                    {t(`employee.insightCategories.visibility.${category.visibility}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.insights")}</span>
                  <span className="font-medium">{category.insightCount}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.ownership")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.owner")}</span>
                  <span className="font-medium">{category.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.created")}</span>
                  <span className="font-medium">{formatDate(category.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.updated")}</span>
                  <span className="font-medium">{formatDate(category.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.lastReviewed")}</span>
                  <span className="font-medium">{formatDate(category.lastReviewed)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.stakeholders")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {category.stakeholders.map((team) => (
                  <div key={team} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("employee.insightCategories.detail.fields.team")}</span>
                    <span className="font-medium">{team}</span>
                  </div>
                ))}
                <Separator />
                <p className="text-muted-foreground text-xs">{category.usageNotes}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {category.description}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.searchMetadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.insightCategories.detail.fields.seoTitle")}</p>
                <p className="font-medium">{category.seoTitle}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.insightCategories.detail.fields.seoDescription")}</p>
                <p className="text-muted-foreground">{category.seoDescription}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("employee.insightCategories.detail.fields.slug")}</p>
                <p className="font-medium">/{category.slug}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("employee.insightCategories.detail.cards.linkedInsights")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {category.featuredInsights.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("employee.insightCategories.detail.empty.linkedInsights")}
                </p>
              ) : (
                category.featuredInsights.map((insightId) => (
                  <Link
                    key={insightId}
                    href={`/employee/content/insights/${insightId}`}
                    className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 hover:bg-muted/40"
                  >
                    <span className="font-medium">{insightId}</span>
                    <span className="text-xs text-muted-foreground">{t("employee.insightCategories.detail.actions.view")}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightCategoryDetail;
