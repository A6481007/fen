"use client";

/*
[PROPOSED] EmployeeInsightCreate - scaffolded insight creation form for content ops.
[EXISTING] uses Badge, Button, Card, Input, Label, Select, Tabs, Textarea, Separator.
*/

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

const EmployeeInsightCreate = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/insights">
              <ArrowLeft className="h-4 w-4" />
              Back to insights
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">Create Insight</h1>
            <Badge variant="outline">Draft</Badge>
          </div>
          <p className="text-muted-foreground">
            Start a new insight draft and capture the core metadata before review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/employee/content/insights">Cancel</Link>
          </Button>
          <Button className="gap-2" type="button">
            <Save className="h-4 w-4" />
            Save draft
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
                  <Input id="title" placeholder="Insight title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Insight type</Label>
                  <Select>
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
                <Textarea id="summary" placeholder="Short summary for preview cards" rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" placeholder="Draft the main article body" rows={10} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="readingTime">Reading time</Label>
                  <Input id="readingTime" placeholder="e.g. 6 min" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Draft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">In review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishDate">Publish date</Label>
                  <Input id="publishDate" type="date" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="heroImage">Main image URL</Label>
                <Input id="heroImage" placeholder="https://..." />
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
                  <Input id="slug" placeholder="auto-generated-slug" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Primary category</Label>
                  <Select>
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
                  <Input id="author" placeholder="Select author" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer">Reviewer</Label>
                  <Input id="reviewer" placeholder="Select reviewer" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" placeholder="maintenance, analytics, iot" />
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
                <Input id="linkedProducts" placeholder="Product IDs or names" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedInsights">Linked insights</Label>
                <Input id="linkedInsights" placeholder="Related insight IDs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillarPage">Pillar page</Label>
                <Input id="pillarPage" placeholder="Pillar page reference" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="series">Insight series</Label>
                <Input id="series" placeholder="Series reference" />
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
                <Input id="seoTitle" placeholder="Search-friendly title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO description</Label>
                <Textarea id="seoDescription" placeholder="Meta description" rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL</Label>
                <Input id="canonicalUrl" placeholder="https://..." />
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
                <Textarea id="solutionSummary" placeholder="Solution positioning" rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outcomes">Key outcomes</Label>
                <Textarea id="outcomes" placeholder="List measurable outcomes" rows={4} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ctaLabel">CTA label</Label>
                  <Input id="ctaLabel" placeholder="Request a demo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaLink">CTA link</Label>
                  <Input id="ctaLink" placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeInsightCreate;
