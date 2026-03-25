"use client";

/*
[PROPOSED] EmployeeInsightDetail - scaffolded insight detail view for content ops.
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

type InsightStatus = "draft" | "review" | "published" | "archived";
type InsightType = "knowledge" | "solution";

type InsightDetail = {
  id: string;
  title: string;
  type: InsightType;
  status: InsightStatus;
  category: string;
  author: string;
  reviewer: string;
  updatedAt: string;
  publishedAt?: string | null;
  summary: string;
  slug: string;
  readingTime: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  linkedProducts: string[];
  linkedInsights: string[];
};

const INSIGHTS: InsightDetail[] = [
  {
    id: "INS-1001",
    title: "Reducing downtime with predictive maintenance",
    type: "knowledge",
    status: "draft",
    category: "Manufacturing",
    author: "Alicia Park",
    reviewer: "Dana Hughes",
    updatedAt: "2026-01-12",
    publishedAt: null,
    summary:
      "Outline the maintenance maturity model and align insights to key downtime drivers.",
    slug: "predictive-maintenance-downtime",
    readingTime: "6 min",
    tags: ["maintenance", "downtime", "operations"],
    seoTitle: "Predictive maintenance: a downtime reduction guide",
    seoDescription:
      "A step-by-step knowledge guide to reduce downtime using predictive maintenance playbooks.",
    linkedProducts: ["Edge Sensor Kit", "Maintenance Intelligence Suite"],
    linkedInsights: ["INS-0998", "INS-0982"],
  },
  {
    id: "INS-1002",
    title: "Optimizing plant throughput with IoT visibility",
    type: "solution",
    status: "review",
    category: "Operations",
    author: "Ravi Patel",
    reviewer: "Jordan Lee",
    updatedAt: "2026-01-10",
    publishedAt: null,
    summary:
      "Build a solution narrative around visibility gaps and IoT-driven throughput wins.",
    slug: "plant-throughput-iot-visibility",
    readingTime: "8 min",
    tags: ["iot", "throughput", "visibility"],
    seoTitle: "IoT visibility for higher plant throughput",
    seoDescription:
      "Solution-oriented insight covering IoT telemetry and throughput optimization tactics.",
    linkedProducts: ["IoT Visibility Hub", "Realtime Ops Dashboard"],
    linkedInsights: ["INS-0974"],
  },
  {
    id: "INS-1003",
    title: "Energy savings playbook for regional factories",
    type: "knowledge",
    status: "published",
    category: "Sustainability",
    author: "Jordan Lee",
    reviewer: "Priya Nair",
    updatedAt: "2026-01-08",
    publishedAt: "2026-01-09",
    summary:
      "Document a repeatable playbook for energy benchmarking and efficiency gains.",
    slug: "energy-savings-playbook",
    readingTime: "5 min",
    tags: ["energy", "sustainability", "benchmarking"],
    seoTitle: "Energy savings playbook for factory teams",
    seoDescription:
      "Knowledge hub playbook covering energy benchmarks, audits, and efficiency levers.",
    linkedProducts: ["Energy Monitor Pro"],
    linkedInsights: [],
  },
  {
    id: "INS-1004",
    title: "Incident response automation checklist",
    type: "solution",
    status: "archived",
    category: "Risk",
    author: "Priya Nair",
    reviewer: "Alicia Park",
    updatedAt: "2025-12-28",
    publishedAt: "2025-11-02",
    summary:
      "Checklist framework for incident response automation and escalation readiness.",
    slug: "incident-response-automation-checklist",
    readingTime: "7 min",
    tags: ["risk", "incident", "automation"],
    seoTitle: "Incident response automation checklist",
    seoDescription:
      "Solution checklist for incident response automation, escalation paths, and readiness.",
    linkedProducts: ["Incident Response Console"],
    linkedInsights: ["INS-0931"],
  },
];

const statusStyles: Record<InsightStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

const typeLabels: Record<InsightType, string> = {
  knowledge: "Knowledge",
  solution: "Solution",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const EmployeeInsightDetail = ({ insightId }: { insightId: string }) => {
  const insight = useMemo(
    () => INSIGHTS.find((item) => item.id === insightId),
    [insightId]
  );

  if (!insight) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">Insight not found</p>
          <p className="text-xs text-muted-foreground">
            The insight ID {insightId} does not match any draft in the list.
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/insights">Back to insights</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewHref =
    insight.type === "knowledge"
      ? `/insight/knowledge/${insight.slug}`
      : `/insight/solutions/${insight.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insights">
              <ArrowLeft className="h-4 w-4" />
              Back to insights
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{insight.title}</h1>
            <Badge variant="outline" className={`capitalize ${statusStyles[insight.status]}`}>
              {insight.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {typeLabels[insight.type]}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{insight.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={previewHref}>
              <Eye className="h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={`/employee/content/insights/${insight.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publishing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{insight.status}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{formatDate(insight.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{formatDate(insight.publishedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ownership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Author</span>
                  <span className="font-medium">{insight.author}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviewer</span>
                  <span className="font-medium">{insight.reviewer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reading time</span>
                  <span className="font-medium">{insight.readingTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-medium">{insight.slug}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{insight.category}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insight.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">SEO title</p>
                <p className="font-medium">{insight.seoTitle}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">SEO description</p>
                <p className="font-medium">{insight.seoDescription}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Linked products</p>
                <p className="font-medium">
                  {insight.linkedProducts.length
                    ? insight.linkedProducts.join(", ")
                    : "No linked products"}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-muted-foreground">Linked insights</p>
                <p className="font-medium">
                  {insight.linkedInsights.length
                    ? insight.linkedInsights.join(", ")
                    : "No linked insights"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightDetail;
