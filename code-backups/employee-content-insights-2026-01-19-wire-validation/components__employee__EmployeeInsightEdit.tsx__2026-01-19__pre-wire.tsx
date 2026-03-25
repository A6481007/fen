"use client";

/*
[PROPOSED] EmployeeInsightEdit - scaffolded insight edit form for content ops.
[EXISTING] uses Badge, Button, Card, Input, Label, Select, Tabs, Textarea, Separator.
*/

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";

type InsightDraft = {
  id: string;
  title: string;
  type: "knowledge" | "solution";
  status: "draft" | "review" | "published" | "archived";
  summary: string;
  body: string;
  readingTime: string;
  publishDate?: string;
  mainImage: string;
  slug: string;
  category: string;
  author: string;
  reviewer: string;
  tags: string;
  linkedProducts: string;
  linkedInsights: string;
  pillarPage: string;
  series: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  solutionSummary: string;
  outcomes: string;
  ctaLabel: string;
  ctaLink: string;
};

const INSIGHT_DRAFTS: InsightDraft[] = [
  {
    id: "INS-1001",
    title: "Reducing downtime with predictive maintenance",
    type: "knowledge",
    status: "draft",
    summary:
      "Outline the maintenance maturity model and align insights to key downtime drivers.",
    body: "Draft the main content body here.",
    readingTime: "6 min",
    publishDate: "2026-01-20",
    mainImage: "https://images.example.com/insight-hero.jpg",
    slug: "predictive-maintenance-downtime",
    category: "manufacturing",
    author: "Alicia Park",
    reviewer: "Dana Hughes",
    tags: "maintenance, downtime, operations",
    linkedProducts: "Edge Sensor Kit, Maintenance Intelligence Suite",
    linkedInsights: "INS-0998, INS-0982",
    pillarPage: "Reliability",
    series: "Maintenance Excellence",
    seoTitle: "Predictive maintenance: a downtime reduction guide",
    seoDescription:
      "A step-by-step knowledge guide to reduce downtime using predictive maintenance playbooks.",
    canonicalUrl: "https://ncsshop.com/insight/knowledge/predictive-maintenance-downtime",
    solutionSummary: "N/A",
    outcomes: "N/A",
    ctaLabel: "Request a demo",
    ctaLink: "https://ncsshop.com/contact",
  },
  {
    id: "INS-1002",
    title: "Optimizing plant throughput with IoT visibility",
    type: "solution",
    status: "review",
    summary:
      "Build a solution narrative around visibility gaps and IoT-driven throughput wins.",
    body: "Draft the main content body here.",
    readingTime: "8 min",
    publishDate: "2026-02-02",
    mainImage: "https://images.example.com/insight-visibility.jpg",
    slug: "plant-throughput-iot-visibility",
    category: "operations",
    author: "Ravi Patel",
    reviewer: "Jordan Lee",
    tags: "iot, throughput, visibility",
    linkedProducts: "IoT Visibility Hub, Realtime Ops Dashboard",
    linkedInsights: "INS-0974",
    pillarPage: "Operations",
    series: "Throughput Wins",
    seoTitle: "IoT visibility for higher plant throughput",
    seoDescription:
      "Solution-oriented insight covering IoT telemetry and throughput optimization tactics.",
    canonicalUrl: "https://ncsshop.com/insight/solutions/plant-throughput-iot-visibility",
    solutionSummary: "Position the solution narrative and key outcomes.",
    outcomes: "15% throughput uplift, 10% downtime reduction",
    ctaLabel: "Talk to an expert",
    ctaLink: "https://ncsshop.com/solutions",
  },
];

const EmployeeInsightEdit = ({ insightId }: { insightId: string }) => {
  const draft = useMemo(
    () => INSIGHT_DRAFTS.find((item) => item.id === insightId),
    [insightId]
  );

  if (!draft) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href={`/employee/content/insights/${draft.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to insight
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">Edit Insight</h1>
            <Badge variant="outline" className="capitalize">
              {draft.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Update the insight details, relationships, and SEO metadata before publishing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/employee/content/insights/${draft.id}`}>Cancel</Link>
          </Button>
          <Button className="gap-2" type="button">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="solution">Solutions</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" defaultValue={draft.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Insight type</Label>
                  <Select defaultValue={draft.type}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knowledge">Knowledge</SelectItem>
                      <SelectItem value="solution">Solution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" defaultValue={draft.summary} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" defaultValue={draft.body} rows={10} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="readingTime">Reading time</Label>
                  <Input id="readingTime" defaultValue={draft.readingTime} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue={draft.status}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Draft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">In review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishDate">Publish date</Label>
                  <Input id="publishDate" type="date" defaultValue={draft.publishDate} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="heroImage">Main image URL</Label>
                <Input id="heroImage" defaultValue={draft.mainImage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" defaultValue={draft.slug} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Primary category</Label>
                  <Select defaultValue={draft.category}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="sustainability">Sustainability</SelectItem>
                      <SelectItem value="risk">Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" defaultValue={draft.author} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer">Reviewer</Label>
                  <Input id="reviewer" defaultValue={draft.reviewer} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" defaultValue={draft.tags} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedProducts">Linked products</Label>
                <Input id="linkedProducts" defaultValue={draft.linkedProducts} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedInsights">Linked insights</Label>
                <Input id="linkedInsights" defaultValue={draft.linkedInsights} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillarPage">Pillar page</Label>
                <Input id="pillarPage" defaultValue={draft.pillarPage} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Insight series</Label>
                <Input id="series" defaultValue={draft.series} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO title</Label>
                <Input id="seoTitle" defaultValue={draft.seoTitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO description</Label>
                <Textarea id="seoDescription" defaultValue={draft.seoDescription} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input id="canonicalUrl" defaultValue={draft.canonicalUrl} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="solution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solution details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="solutionSummary">Solution summary</Label>
                <Textarea
                  id="solutionSummary"
                  defaultValue={draft.solutionSummary}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outcomes">Key outcomes</Label>
                <Textarea id="outcomes" defaultValue={draft.outcomes} rows={4} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ctaLabel">CTA label</Label>
                  <Input id="ctaLabel" defaultValue={draft.ctaLabel} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaLink">CTA link</Label>
                  <Input id="ctaLink" defaultValue={draft.ctaLink} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightEdit;
